// services/authService.ts — Quản lý xác thực người dùng thật với Supabase Auth
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    // Thông báo lỗi chung để chống rò rỉ thông tin tài khoản (account enumeration)
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("Email not confirmed")
    ) {
      throw new Error("Email hoặc mật khẩu không chính xác, hoặc tài khoản chưa được xác thực.");
    }
    throw new Error("Đăng nhập thất bại. Vui lòng thử lại.");
  }

  if (!data.user) throw new Error("Không tìm thấy thông tin tài khoản.");
  return data.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<{ user: User | null; session: unknown }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      throw new Error(
        "Không thể hoàn tất đăng ký với email này. Nếu đã có tài khoản, vui lòng đăng nhập hoặc đặt lại mật khẩu."
      );
    }
    if (error.message.includes("Password should be")) {
      throw new Error("Mật khẩu phải có tối thiểu 6 ký tự.");
    }
    throw new Error("Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
  }

  // Tự động ghi nhận hồ sơ vào bảng profiles nếu có
  if (data.user) {
    try {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        email: email.trim(),
      });
    } catch {
      // bỏ qua lỗi nếu RLS profile chưa sẵn sàng
    }
  }

  return { user: data.user, session: data.session };
}

export async function resetPasswordForEmail(email: string): Promise<void> {
  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo,
  });
  if (error) {
    // Ghi log nội bộ nhưng vẫn giữ phản hồi chung phía UI chống account enumeration
    console.warn("resetPasswordForEmail warning:", error.message);
  }
}

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
  await supabase.auth.signOut({ scope: "global" });
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}
