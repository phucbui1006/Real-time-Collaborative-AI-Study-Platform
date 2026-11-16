// services/authService.ts — Hệ thống xác thực & quản lý hồ sơ người dùng toàn diện cho PeerMind
import { supabase, setRememberMePreference, getRememberMePreference } from "./supabaseClient";
import { getApiUrl } from "./api";
import type { User, Session } from "@supabase/supabase-js";
import { INITIAL_DOCS } from "./aiService";

export { setRememberMePreference, getRememberMePreference };

export const GENERIC_LOGIN_ERROR = "Tên đăng nhập hoặc mật khẩu không đúng";
export const GENERIC_FORGOT_MESSAGE =
  "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu";

export const RESERVED_USERNAMES = new Set([
  "admin", "administrator", "root", "system", "support", "help",
  "peermind", "permind", "moderator", "mod", "staff", "official",
  "api", "auth", "login", "register", "logout", "settings",
  "profile", "user", "users", "guest", "anonymous", "null", "undefined",
  "supabase", "google", "security", "bot", "ai", "teacher", "host",
]);

export const COMMON_PASSWORDS = new Set([
  "123456", "1234567", "12345678", "123456789", "1234567890",
  "password", "password123", "111111", "000000", "666666", "888888",
  "qwerty", "qwerty123", "abc123", "123123", "123321", "654321",
  "iloveyou", "admin123", "letmein", "welcome", "monkey", "dragon",
  "peermind", "permind", "matkhau", "sinhviendaihoc",
]);

export const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface UserProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at?: string;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  colorClass: string;
  isCommon: boolean;
  isValidLength: boolean;
}

/**
 * Kiểm tra quy tắc tên người dùng ở phía client (3-20 ký tự, a-z, 0-9, _, không thuộc danh sách cấm)
 */
export function validateUsernameClient(raw: string): {
  valid: boolean;
  clean: string;
  error?: string;
} {
  const clean = raw.trim().toLowerCase();
  if (!clean) {
    return { valid: false, clean, error: "Vui lòng nhập tên người dùng." };
  }
  if (clean.length < 3 || clean.length > 20) {
    return {
      valid: false,
      clean,
      error: "Tên người dùng phải có từ 3 đến 20 ký tự.",
    };
  }
  if (!USERNAME_REGEX.test(clean)) {
    return {
      valid: false,
      clean,
      error: "Chỉ cho phép chữ thường (a-z), số (0-9) và dấu gạch dưới (_).",
    };
  }
  if (RESERVED_USERNAMES.has(clean)) {
    return {
      valid: false,
      clean,
      error: "Tên người dùng này nằm trong danh sách bị cấm sử dụng.",
    };
  }
  return { valid: true, clean };
}

/**
 * Đánh giá độ mạnh mật khẩu & chặn mật khẩu phổ biến (123456, password, 111111...)
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  const lower = password.trim().toLowerCase();
  const isCommon = COMMON_PASSWORDS.has(lower) || /^(\d)\1{5,}$/.test(lower);
  const isValidLength = password.length >= 6;

  if (!password) {
    return {
      score: 0,
      label: "Chưa nhập",
      colorClass: "bg-slate-300 dark:bg-slate-700",
      isCommon: false,
      isValidLength: false,
    };
  }

  if (isCommon) {
    return {
      score: 1,
      label: "Mật khẩu quá phổ biến (bị chặn)",
      colorClass: "bg-rose-500",
      isCommon: true,
      isValidLength,
    };
  }

  if (!isValidLength) {
    return {
      score: 1,
      label: "Quá ngắn (tối thiểu 6 ký tự)",
      colorClass: "bg-rose-500",
      isCommon: false,
      isValidLength: false,
    };
  }

  let points = 1;
  if (password.length >= 8) points++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) points++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) points++;

  const score = Math.min(4, points) as 1 | 2 | 3 | 4;
  const map: Record<1 | 2 | 3 | 4, { label: string; colorClass: string }> = {
    1: { label: "Đạt yêu cầu (Nên thêm chữ hoa/số)", colorClass: "bg-amber-500" },
    2: { label: "Trung bình", colorClass: "bg-amber-500" },
    3: { label: "Khá mạnh", colorClass: "bg-teal-500" },
    4: { label: "Rất mạnh", colorClass: "bg-emerald-500" },
  };

  return {
    score,
    label: map[score].label,
    colorClass: map[score].colorClass,
    isCommon: false,
    isValidLength: true,
  };
}

/**
 * Gợi ý tên người dùng hợp lệ từ tên Google hoặc email
 */
export function suggestUsernameFromUser(user: User | null): string {
  if (!user) return "";
  const rawSource =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "sinhvien";

  // Bỏ dấu tiếng Việt và chuyển sang chữ thường + dấu gạch dưới
  const normalized = String(rawSource)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  let candidate = normalized.slice(0, 16);
  if (candidate.length < 3 || RESERVED_USERNAMES.has(candidate)) {
    const suffix = Math.floor(100 + Math.random() * 900);
    candidate = `sv_${candidate || "peermind"}_${suffix}`.slice(0, 20);
  }
  return candidate;
}

/**
 * Kiểm tra tên người dùng đã tồn tại chưa (không lộ email)
 * Kết hợp cả Supabase RPC (`check_username_available`), bảng `profiles`, và Server API `/api/auth/check-username`.
 */
export async function checkUsernameAvailability(
  rawUsername: string,
  excludeUserId?: string
): Promise<{ available: boolean; message: string }> {
  const localCheck = validateUsernameClient(rawUsername);
  if (!localCheck.valid) {
    return {
      available: false,
      message: localCheck.error || "Tên người dùng không hợp lệ.",
    };
  }

  const clean = localCheck.clean;

  // 1. Thử gọi RPC check_username_available trên Supabase (hoạt động cho cả anon & authenticated)
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("check_username_available", {
      p_username: clean,
    });
    if (!rpcErr && rpcData && typeof rpcData.available === "boolean") {
      return {
        available: rpcData.available,
        message: rpcData.available ? "Tên người dùng có thể sử dụng" : (rpcData.message || "Tên này đã có người dùng"),
      };
    }
  } catch {}

  // 2. Thử gọi Backend endpoint /api/auth/check-username
  try {
    const url = getApiUrl(
      `/api/auth/check-username?username=${encodeURIComponent(clean)}${
        excludeUserId ? `&excludeUserId=${encodeURIComponent(excludeUserId)}` : ""
      }`
    );
    const resp = await fetch(url, { method: "GET" });
    if (resp.ok) {
      const json = await resp.json();
      if (typeof json.available === "boolean") {
        return {
          available: json.available,
          message: json.available ? "Tên người dùng có thể sử dụng" : (json.message || "Tên này đã có người dùng"),
        };
      }
    }
  } catch {}

  // 3. Fallback truy vấn cột id của bảng profiles (chỉ đọc id, không có cột email)
  try {
    let query = supabase.from("profiles").select("id").ilike("username", clean).limit(1);
    if (excludeUserId) {
      query = query.neq("id", excludeUserId);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data) && data.length > 0) {
      return { available: false, message: "Tên này đã có người dùng" };
    }
  } catch {}

  return { available: true, message: "Tên người dùng có thể sử dụng" };
}

/**
 * Đăng nhập bằng Tên người dùng hoặc Email (Mục 2.2)
 * - Nếu nhập tên người dùng: BẮT BUỘC đi qua Server (/api/auth/login) để tra email bằng service_role và đăng nhập.
 * - Nếu nhập email: Gọi qua Server (để hưởng rate-limit IP + tài khoản); nếu server chưa bật ở local thì fallback sang Supabase Auth.
 * - Sai thông tin: Luôn báo chung "Tên đăng nhập hoặc mật khẩu không đúng".
 */
export async function loginWithIdentifier(
  identifier: string,
  password: string,
  rememberMe: boolean = true
): Promise<User> {
  const cleanId = identifier.trim();
  if (!cleanId || !password) {
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  setRememberMePreference(rememberMe);

  // 1. Ưu tiên gọi Server endpoint /api/auth/login (bắt buộc cho username, đồng thời có rate-limit cho cả email)
  let serverReachable = false;
  try {
    const resp = await fetch(getApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: cleanId, password }),
    });
    serverReachable = true;

    const payload = await resp.json().catch(() => ({}));
    if (resp.status === 429) {
      throw new Error(
        payload.error || "Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau ít phút."
      );
    }

    if (!resp.ok || !payload?.success || !payload?.session) {
      throw new Error(GENERIC_LOGIN_ERROR);
    }

    // Đồng bộ session nhận từ server vào Supabase client ở trình duyệt
    const { data: sessionData, error: setSessionErr } = await supabase.auth.setSession({
      access_token: payload.session.access_token,
      refresh_token: payload.session.refresh_token,
    });

    if (setSessionErr || !sessionData.user) {
      throw new Error(GENERIC_LOGIN_ERROR);
    }

    return sessionData.user;
  } catch (err: any) {
    // Nếu server đã phản hồi lỗi (401 hoặc 429), ném ngay thông báo chuẩn
    if (serverReachable) {
      throw new Error(err?.message || GENERIC_LOGIN_ERROR);
    }
  }

  // 2. Nếu không kết nối được tới Express server (ví dụ dev chỉ bật Vite mà chưa chạy server):
  // Chỉ cho phép fallback trực tiếp khi người dùng nhập Email; nếu nhập Username mà server tắt thì báo lỗi rõ.
  if (!cleanId.includes("@")) {
    throw new Error(
      "Không thể kết nối máy chủ xác thực để tra cứu tên người dùng. Vui lòng kiểm tra kết nối hoặc đăng nhập bằng email."
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanId.toLowerCase(),
    password,
  });

  if (error || !data.user) {
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  return data.user;
}

// Giữ alias tương thích ngược nếu có file khác gọi loginWithEmail
export const loginWithEmail = loginWithIdentifier;

/**
 * Đăng ký tài khoản mới bằng Tên người dùng + Email + Mật khẩu (Mục 2.1)
 */
export async function registerWithUsername(params: {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ user: User | null; session: Session | null; needsEmailConfirmation: boolean }> {
  const { username, email, password, displayName } = params;

  const userCheck = validateUsernameClient(username);
  if (!userCheck.valid) {
    throw new Error(userCheck.error || "Tên người dùng không hợp lệ.");
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new Error("Địa chỉ email không hợp lệ.");
  }

  const pwStrength = evaluatePasswordStrength(password);
  if (!pwStrength.isValidLength) {
    throw new Error("Mật khẩu phải có tối thiểu 6 ký tự.");
  }
  if (pwStrength.isCommon) {
    throw new Error("Mật khẩu này quá phổ biến và dễ đoán. Vui lòng chọn mật khẩu an toàn hơn.");
  }

  // Kiểm tra trùng tên người dùng trước khi tạo tài khoản
  const availability = await checkUsernameAvailability(userCheck.clean);
  if (!availability.available) {
    throw new Error(availability.message || "Tên này đã có người dùng");
  }

  const finalDisplayName = (displayName || userCheck.clean).trim().slice(0, 60);
  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      emailRedirectTo,
      data: {
        username: userCheck.clean,
        display_name: finalDisplayName,
        full_name: finalDisplayName,
      },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists")) {
      throw new Error(
        "Email này đã được đăng ký. Nếu bạn đã tạo tài khoản bằng mật khẩu hoặc Google, vui lòng chuyển sang Đăng nhập."
      );
    }
    if (msg.includes("password")) {
      throw new Error("Mật khẩu phải có tối thiểu 6 ký tự và không nằm trong danh sách cấm.");
    }
    if (msg.includes("rate limit") || msg.includes("too many")) {
      throw new Error("Bạn đã gửi yêu cầu quá nhanh. Vui lòng đợi ít phút rồi thử lại.");
    }
    throw new Error("Không thể hoàn tất đăng ký lúc này. Vui lòng kiểm tra lại thông tin.");
  }

  // Supabase trả về user với identities rỗng nếu email đã tồn tại và bật chế độ chống dò email
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error(
      "Email này đã được sử dụng cho một tài khoản khác. Vui lòng đăng nhập hoặc dùng chức năng Quên mật khẩu."
    );
  }

  // Nếu có session ngay (trường hợp Supabase tắt Confirm Email), đảm bảo lưu vào bảng profiles
  if (data.user && data.session) {
    try {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        username: userCheck.clean,
        display_name: finalDisplayName,
      });
    } catch {}
  }

  const needsEmailConfirmation = Boolean(data.user && !data.session);
  return {
    user: data.user,
    session: data.session,
    needsEmailConfirmation,
  };
}

// Alias tương thích ngược
export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<{ user: User | null; session: unknown }> {
  const cleanUsername = fullName
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 20);
  const res = await registerWithUsername({
    username: cleanUsername.length >= 3 ? cleanUsername : `sv_${Date.now().toString().slice(-6)}`,
    email,
    password,
    displayName: fullName,
  });
  return { user: res.user, session: res.session };
}

/**
 * Gửi lại email xác nhận đăng ký (Mục 2.1 - Đếm ngược 60 giây)
 */
export async function resendSignupConfirmation(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(cleanEmail)) {
    throw new Error("Địa chỉ email không hợp lệ.");
  }
  const emailRedirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: cleanEmail,
    options: { emailRedirectTo },
  });

  if (error) {
    if (error.message.toLowerCase().includes("rate limit")) {
      throw new Error("Vui lòng đợi tối thiểu 60 giây trước khi yêu cầu gửi lại email.");
    }
    throw new Error("Không thể gửi lại email xác nhận lúc này. Vui lòng thử lại sau.");
  }
}

/**
 * Đăng nhập / Đăng ký bằng Google OAuth (Mục 2.3)
 */
export async function signInWithGoogle(): Promise<void> {
  const redirectTo =
    typeof window !== "undefined" ? `${window.location.origin}/login` : undefined;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  if (error) {
    throw new Error("Không thể khởi tạo đăng nhập Google. Vui lòng thử lại.");
  }
}

/**
 * Quên mật khẩu qua Email hoặc Tên người dùng (Mục 2.4)
 * - Gửi lên server để tra email nếu người dùng nhập username, đồng thời kiểm tra nếu là tài khoản Google-only.
 * - Luôn trả về thông báo chuẩn: "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu" (trừ khi phát hiện tài khoản chỉ dùng Google).
 */
export async function requestPasswordReset(identifier: string): Promise<{
  message: string;
  isGoogleOnly?: boolean;
}> {
  const cleanId = identifier.trim().toLowerCase();
  if (!cleanId) {
    throw new Error("Vui lòng nhập email hoặc tên người dùng.");
  }

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/reset-password`
      : "https://permind.io.vn/reset-password";

  try {
    const resp = await fetch(getApiUrl("/api/auth/forgot-password"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: cleanId, redirectTo }),
    });

    const data = await resp.json().catch(() => ({}));
    if (resp.status === 429) {
      throw new Error(
        data.error || "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."
      );
    }

    if (resp.ok && data?.message) {
      return {
        message: data.message,
        isGoogleOnly: Boolean(data.isGoogleOnly),
      };
    }
  } catch (err: any) {
    if (err?.message?.includes("quá nhiều yêu cầu")) {
      throw err;
    }
  }

  // Fallback trực tiếp qua Supabase nếu người dùng nhập email và server chưa bật
  if (EMAIL_REGEX.test(cleanId)) {
    try {
      await supabase.auth.resetPasswordForEmail(cleanId, { redirectTo });
    } catch {}
  }

  return {
    message: GENERIC_FORGOT_MESSAGE,
    isGoogleOnly: false,
  };
}

export async function resetPasswordForEmail(identifier: string): Promise<void> {
  await requestPasswordReset(identifier);
}

/**
 * Cập nhật mật khẩu mới (Dùng cho trang /reset-password và trang Cài đặt tài khoản)
 */
export async function updateUserPassword(newPassword: string): Promise<void> {
  const pwStrength = evaluatePasswordStrength(newPassword);
  if (!pwStrength.isValidLength) {
    throw new Error("Mật khẩu mới phải có tối thiểu 6 ký tự.");
  }
  if (pwStrength.isCommon) {
    throw new Error("Mật khẩu này quá phổ biến. Vui lòng chọn mật khẩu an toàn hơn.");
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("same_password") || msg.includes("different from the old")) {
      throw new Error("Mật khẩu mới phải khác với mật khẩu hiện tại.");
    }
    if (msg.includes("session") || msg.includes("expired") || msg.includes("not authenticated")) {
      throw new Error("Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được sử dụng. Vui lòng yêu cầu liên kết mới.");
    }
    throw new Error("Không thể cập nhật mật khẩu. Vui lòng thử lại.");
  }
}

/**
 * Lấy hồ sơ người dùng từ bảng public.profiles (Mục 2.5)
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        username: data.username || null,
        display_name: data.display_name || null,
        avatar_url: data.avatar_url || null,
        created_at: data.created_at,
      };
    }
  } catch {}
  return null;
}

/**
 * Hoàn tất chọn tên người dùng (dành cho lần đầu đăng nhập bằng Google hoặc tài khoản chưa có username)
 */
export async function completeUsernameSetup(params: {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string | null;
}): Promise<UserProfile> {
  const { userId, username, displayName, avatarUrl } = params;
  const check = validateUsernameClient(username);
  if (!check.valid) {
    throw new Error(check.error || "Tên người dùng không hợp lệ.");
  }

  const avail = await checkUsernameAvailability(check.clean, userId);
  if (!avail.available) {
    throw new Error(avail.message || "Tên này đã có người dùng");
  }

  const cleanDisplay = (displayName || check.clean).trim().slice(0, 60);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: userId,
        username: check.clean,
        display_name: cleanDisplay,
        avatar_url: avatarUrl || null,
      },
      { onConflict: "id" }
    )
    .select("id, username, display_name, avatar_url, created_at")
    .single();

  if (error) {
    if (error.code === "23505" || error.message.toLowerCase().includes("unique")) {
      throw new Error("Tên này đã có người dùng");
    }
    throw new Error("Không thể lưu tên người dùng. Vui lòng thử lại.");
  }

  // Đồng bộ vào user_metadata của Supabase Auth để tiện dùng
  try {
    await supabase.auth.updateUser({
      data: {
        username: check.clean,
        display_name: cleanDisplay,
        full_name: cleanDisplay,
      },
    });
  } catch {}

  return data as UserProfile;
}

/**
 * Cập nhật tên hiển thị (display_name) trong trang Cài đặt tài khoản (Mục 2.5)
 */
export async function updateDisplayName(
  userId: string,
  newDisplayName: string
): Promise<UserProfile> {
  const clean = newDisplayName.trim().slice(0, 60);
  if (clean.length < 2) {
    throw new Error("Tên hiển thị phải có tối thiểu 2 ký tự.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ display_name: clean })
    .eq("id", userId)
    .select("id, username, display_name, avatar_url, created_at")
    .single();

  if (error) {
    throw new Error("Không thể cập nhật tên hiển thị lúc này.");
  }

  try {
    await supabase.auth.updateUser({
      data: { display_name: clean, full_name: clean },
    });
  } catch {}

  return data as UserProfile;
}

/**
 * Chế độ khách (Mục 2.2 & 2.6)
 */
export async function loginAsGuest(): Promise<{ user: User | null; isSupabaseAnonymous: boolean }> {
  try {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (!error && data?.user) {
      return { user: data.user, isSupabaseAnonymous: true };
    }
  } catch {
    // Fallback an toàn về guest offline nếu Anonymous Auth chưa bật trên Supabase Dashboard
  }
  return { user: null, isSupabaseAnonymous: false };
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut({ scope: "local" });
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}

// ─── ĐỒNG BỘ DỮ LIỆU CHẾ ĐỘ KHÁCH -> TÀI KHOẢN THẬT (MỤC 2.6) ────────────────

export interface GuestDataSummary {
  hasGuestData: boolean;
  docsCount: number;
  chatMessagesCount: number;
  guestDocKeys: string[];
  guestChatKeys: string[];
}

const SEED_TITLES = new Set(INITIAL_DOCS.map((d) => d.title.trim().toLowerCase()));

/**
 * Kiểm tra xem trong localStorage có tài liệu hoặc lịch sử chat của chế độ khách không
 */
export function detectGuestDataInStorage(): GuestDataSummary {
  if (typeof window === "undefined") {
    return {
      hasGuestData: false,
      docsCount: 0,
      chatMessagesCount: 0,
      guestDocKeys: [],
      guestChatKeys: [],
    };
  }

  const guestDocKeys = ["permind_docs_guest", "peermind_docs_guest", "permind_docs_guest-user-001"];
  const foundDocKeys: string[] = [];
  const uniqueDocsMap = new Map<string, any>();

  for (const key of guestDocKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const customDocs = parsed.filter((d) => {
          const title = String(d?.title || d?.original_name || "").trim().toLowerCase();
          return title && !SEED_TITLES.has(title) && !d?.isPublic;
        });
        if (customDocs.length > 0) {
          foundDocKeys.push(key);
          customDocs.forEach((doc) => {
            const sig = `${String(doc.title || "").trim().toLowerCase()}__${doc.pagesCount || 0}`;
            if (!uniqueDocsMap.has(sig)) {
              uniqueDocsMap.set(sig, doc);
            }
          });
        }
      }
    } catch {}
  }

  const foundChatKeys: string[] = [];
  let chatMessagesCount = 0;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith("permind_chat_") || key.startsWith("peermind_chat_")) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            foundChatKeys.push(key);
            chatMessagesCount += Math.floor(parsed.length / 2) || 1;
          }
        }
      }
    }
  } catch {}

  const docsCount = uniqueDocsMap.size;
  return {
    hasGuestData: docsCount > 0 || chatMessagesCount > 0,
    docsCount,
    chatMessagesCount,
    guestDocKeys: foundDocKeys,
    guestChatKeys: foundChatKeys,
  };
}

/**
 * Đồng bộ tài liệu và lịch sử chat từ chế độ khách (localStorage) lên Supabase gắn với userId mới.
 * - Kiểm tra trùng lặp với tài liệu đã có trên tài khoản.
 * - Chỉ xóa từng phần dữ liệu guest sau khi đã lưu thành công lên Supabase (không mất dữ liệu nếu lỗi giữa chừng).
 */
export async function migrateGuestDataToAccount(userId: string): Promise<{
  migratedDocs: number;
  migratedChats: number;
}> {
  if (!userId || typeof window === "undefined") {
    return { migratedDocs: 0, migratedChats: 0 };
  }

  let migratedDocs = 0;
  let migratedChats = 0;

  // 1. Lấy danh sách tài liệu hiện có của user trên Supabase để kiểm tra trùng lặp
  const { data: existingDocs, error: existingErr } = await supabase
    .from("documents")
    .select("id, filename, original_name, total_pages")
    .eq("owner_user_id", userId);

  if (existingErr) {
    throw new Error("Không thể kiểm tra kho tài liệu hiện tại. Dữ liệu khách vẫn được giữ nguyên.");
  }

  const existingMap = new Map<string, number>();
  (existingDocs || []).forEach((d) => {
    const title = String(d.original_name || d.filename || "")
      .replace(/\.[^/.]+$/, "")
      .trim()
      .toLowerCase();
    if (title) {
      existingMap.set(title, d.id);
    }
  });

  // Bản đồ ánh xạ oldGuestDocId -> newSupabaseDocId để gắn đúng lịch sử chat
  const docIdMapping = new Map<number, number>();
  // Giữ nguyên các ID của tài liệu mẫu (1..5)
  INITIAL_DOCS.forEach((d) => docIdMapping.set(d.id, d.id));

  const guestDocKeys = ["permind_docs_guest", "peermind_docs_guest", "permind_docs_guest-user-001"];

  for (const key of guestDocKeys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    let parsed: any[] = [];
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(parsed)) continue;

    const remainingDocs: any[] = [];

    for (const doc of parsed) {
      const rawTitle = String(doc?.title || doc?.original_name || doc?.filename || "").trim();
      const lowerTitle = rawTitle.replace(/\.[^/.]+$/, "").toLowerCase();

      // Bỏ qua các tài liệu mẫu mặc định
      if (!rawTitle || SEED_TITLES.has(lowerTitle) || doc?.isPublic) {
        continue;
      }

      // Kiểm tra trùng lặp: nếu đã có tài liệu trùng tên trên tài khoản thì ánh xạ sang ID đó luôn
      const existingId = existingMap.get(lowerTitle);
      if (existingId) {
        if (typeof doc.id === "number") {
          docIdMapping.set(doc.id, existingId);
        }
        continue;
      }

      const ext = (doc.fileType || "PDF").toLowerCase();
      const filename = rawTitle.endsWith(`.${ext}`) ? rawTitle : `${rawTitle}.${ext}`;
      const pagesContent = Array.isArray(doc.pagesContent)
        ? doc.pagesContent
        : Array.isArray(doc.pages_content)
        ? doc.pages_content
        : [];

      const { data: inserted, error: insertErr } = await supabase
        .from("documents")
        .insert({
          filename,
          original_name: filename,
          subject: doc.subject || "CHUNG",
          total_pages: doc.pagesCount || pagesContent.length || 1,
          file_url: null,
          pages_content: pagesContent,
          owner_user_id: userId,
        })
        .select("id")
        .single();

      if (insertErr || !inserted?.id) {
        // Nếu lỗi giữa chừng, giữ lại tài liệu này trong remainingDocs để không mất dữ liệu
        remainingDocs.push(doc);
      } else {
        migratedDocs++;
        existingMap.set(lowerTitle, inserted.id);
        if (typeof doc.id === "number") {
          docIdMapping.set(doc.id, inserted.id);
        }
      }
    }

    if (remainingDocs.length === 0) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(remainingDocs));
    }
  }

  // 2. Đồng bộ lịch sử chat (permind_chat_* và peermind_chat_*) lên bảng ai_conversations
  const chatKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (k.startsWith("permind_chat_") || k.startsWith("peermind_chat_"))) {
      chatKeys.push(k);
    }
  }

  for (const chatKey of chatKeys) {
    // Định dạng key: permind_chat_<docId>_<sessionId> hoặc permind_chat_<docId>
    const withoutPrefix = chatKey.replace(/^(?:permind|peermind)_chat_/, "");
    const firstUnderscore = withoutPrefix.indexOf("_");
    const rawDocId =
      firstUnderscore === -1 ? withoutPrefix : withoutPrefix.slice(0, firstUnderscore);
    const sessionId =
      firstUnderscore === -1 ? "default" : withoutPrefix.slice(firstUnderscore + 1) || "default";

    const oldDocId = Number(rawDocId);
    const targetDocId = docIdMapping.get(oldDocId) || (oldDocId > 0 && oldDocId <= 5 ? oldDocId : null);
    if (!targetDocId) continue;

    let messages: any[] = [];
    try {
      messages = JSON.parse(localStorage.getItem(chatKey) || "[]");
    } catch {
      continue;
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      localStorage.removeItem(chatKey);
      continue;
    }

    // Ghép cặp user question -> ai answer
    const pairs: { question: string; answer: string }[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m?.role === "user" && typeof m.text === "string" && m.text.trim()) {
        const nextMsg = messages[i + 1];
        const ans =
          nextMsg?.role === "ai" && typeof nextMsg.text === "string"
            ? nextMsg.text
            : "Đã đồng bộ từ phiên dùng thử.";
        pairs.push({ question: m.text.trim(), answer: ans });
      }
    }

    let allPairsSucceeded = true;
    for (const pair of pairs) {
      const { error: chatErr } = await supabase.from("ai_conversations").insert({
        document_id: targetDocId,
        user_id: userId,
        session_id: sessionId,
        session_title: pair.question.slice(0, 28),
        question: pair.question,
        answer: pair.answer,
      });

      if (chatErr) {
        allPairsSucceeded = false;
      } else {
        migratedChats++;
      }
    }

    if (allPairsSucceeded) {
      localStorage.removeItem(chatKey);
      localStorage.removeItem(`permind_sessions_${oldDocId}`);
      localStorage.removeItem(`peermind_sessions_${oldDocId}`);
    }
  }

  return { migratedDocs, migratedChats };
}

/**
 * Xóa bỏ dữ liệu chế độ khách khi người dùng chọn "Bỏ qua, không đồng bộ"
 */
export function discardGuestDataInStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (
        k &&
        (k === "permind_docs_guest" ||
          k === "peermind_docs_guest" ||
          k === "permind_docs_guest-user-001" ||
          k.startsWith("permind_chat_") ||
          k.startsWith("peermind_chat_") ||
          k.startsWith("permind_sessions_") ||
          k.startsWith("peermind_sessions_"))
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

/**
 * Xóa sạch toàn bộ cache và state dữ liệu tài liệu người dùng khi đăng xuất
 */
export function clearAllUserState(): void {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new Event("permind:clear-user-cache"));
      const preservedKeys = new Set(["permind_theme_v2", "permind_remember_me"]);
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          !preservedKeys.has(key) &&
          (key.startsWith("permind_") || key.startsWith("peermind_") || key.startsWith("sb-"))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));

      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (
          key &&
          (key.startsWith("permind_") || key.startsWith("peermind_") || key.startsWith("sb-"))
        ) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach((k) => sessionStorage.removeItem(k));
    } catch (e) {
      console.warn("Lỗi khi xóa state người dùng:", e);
    }
  }
}
