// services/roomService.ts — Service quản lý phòng học & dữ liệu Supabase Realtime (không đọc/ghi plaintext password_hash)
import { supabase } from "./supabaseClient";
import { isValidUUID } from "../utils";
import { authFetch, getAccessToken } from "./api";

export type RoomItem = {
  id: number;
  name: string;
  code: string;
  lastVisit: string;
  color: string;
  documentId?: number | null;
  onlineCount?: number;
};

export const INITIAL_HISTORY: RoomItem[] = [
  { id: 1, name: "Nhóm ôn thi Toán 12", code: "482913", lastVisit: "Hôm nay, 19:30", color: "#0ea5e9", documentId: 1 },
  { id: 2, name: "English Speaking Club", code: "730256", lastVisit: "Hôm qua, 20:00", color: "#8b5cf6", documentId: 2 },
  { id: 3, name: "Lập trình AI & Web", code: "159847", lastVisit: "3 ngày trước", color: "#10b981", documentId: 3 },
];

export const COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"];

/**
 * Băm mật khẩu phòng phía Client bằng Web Crypto SHA-256 kèm salt ngẫu nhiên 16 byte
 * (Dùng cho nhánh dự phòng lưu Supabase khi Backend/RPC chưa phản hồi, tuyệt đối không lưu plaintext)
 */
async function hashPasswordClient(password: string): Promise<string> {
  const clean = password.trim();
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const enc = new TextEncoder().encode(`${saltHex}:${clean}`);
  const hashBuf = await crypto.subtle.digest("SHA-256", enc);
  const hashHex = Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${saltHex}:${hashHex}`;
}

/**
 * Kiểm tra mật khẩu phía Client đối với định dạng sha256:<salt>:<hex> hoặc dữ liệu cũ
 */
async function verifyPasswordClient(inputPassword: string, storedHash?: string | null): Promise<boolean> {
  if (!storedHash) return true;
  const cleanInput = inputPassword.trim();
  const cleanStored = storedHash.trim();
  if (!cleanInput) return false;

  if (cleanStored.startsWith("sha256:")) {
    const parts = cleanStored.split(":");
    if (parts.length !== 3) return false;
    const [, saltHex, expectedHex] = parts;
    const enc = new TextEncoder().encode(`${saltHex}:${cleanInput}`);
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    const actualHex = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return actualHex === expectedHex;
  }

  // Nếu là scrypt hoặc bcrypt nhưng đi vào nhánh fallback client (không xác minh được ở browser)
  if (cleanStored.startsWith("scrypt:") || cleanStored.startsWith("$2")) {
    return false;
  }

  return cleanInput === cleanStored;
}

/**
 * Lấy danh sách phòng học trực tiếp từ Supabase (KHÔNG truy vấn password_hash)
 */
export async function fetchRoomsApi(userId?: string): Promise<RoomItem[]> {
  try {
    const SAFE_ROOM_FIELDS = "id, name, code, document_id, is_active, created_at, host_user_id";
    const BASIC_ROOM_FIELDS = "id, name, code, document_id, is_active, created_at";
    const isRealUser = isValidUUID(userId);

    const mapRoomRows = (rows: any[], defaultVisit = "Vừa xong"): RoomItem[] =>
      rows.map((r, i) => {
        let lastVisit = defaultVisit;
        if (r.created_at) {
          try {
            const d = new Date(r.created_at);
            lastVisit = d.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {}
        }
        return {
          id: r.id,
          name: r.name,
          code: r.code,
          lastVisit,
          color: COLORS[i % COLORS.length],
          documentId: r.document_id,
        };
      });

    if (isRealUser) {
      const { data: rooms, error } = await supabase
        .from("rooms")
        .select(SAFE_ROOM_FIELDS)
        .eq("host_user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(rooms)) {
        return mapRoomRows(rooms, "Vừa xong");
      }

      // Dự phòng nếu bảng rooms trên Supabase chưa có cột host_user_id
      if (error && (error.code === "42703" || error.message?.includes("host_user_id"))) {
        const { data: fallbackRooms } = await supabase
          .from("rooms")
          .select(BASIC_ROOM_FIELDS)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(20);
        if (Array.isArray(fallbackRooms)) {
          return mapRoomRows(fallbackRooms, "Vừa xong");
        }
      }
      return [];
    }

    const { data: allRooms, error: guestErr } = await supabase
      .from("rooms")
      .select(SAFE_ROOM_FIELDS)
      .is("host_user_id", null)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!guestErr && Array.isArray(allRooms) && allRooms.length > 0) {
      return mapRoomRows(allRooms, "Gần đây");
    }

    if (guestErr && (guestErr.code === "42703" || guestErr.message?.includes("host_user_id"))) {
      const { data: fallbackAll } = await supabase
        .from("rooms")
        .select(BASIC_ROOM_FIELDS)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (Array.isArray(fallbackAll) && fallbackAll.length > 0) {
        return mapRoomRows(fallbackAll, "Gần đây");
      }
    }

    return INITIAL_HISTORY;
  } catch (err) {
    console.warn("Lỗi tải phòng từ Supabase:", err);
    return isValidUUID(userId) ? [] : INITIAL_HISTORY;
  }
}

/**
 * Lấy số lượng người dùng đang online thực tế trong các phòng từ máy chủ API (cần JWT hợp lệ)
 */
export async function fetchActiveRoomCountsApi(): Promise<Record<string, number>> {
  try {
    const token = await getAccessToken();
    if (!token) return {};
    const res = await authFetch("/api/rooms/active-counts");
    if (!res.ok) return {};
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) return {};
    const json = await res.json();
    return json.counts || {};
  } catch {
    return {};
  }
}

/**
 * Kiểm tra mã phòng và mật khẩu qua backend API / RPC phía server / bảng rooms Supabase
 */
export async function joinRoomApi({
  code,
  password,
}: {
  code: string;
  password: string;
}): Promise<{ name: string; code: string; documentId?: number | null }> {
  const cleanCode = code.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  const cleanPassword = password.trim();

  if (!cleanCode) {
    throw new Error("Vui lòng nhập mã phòng hợp lệ.");
  }

  let backendAuthError: string | null = null;

  // 1. Ưu tiên xác thực qua Express Backend (/api/rooms/verify) bằng JWT
  const token = await getAccessToken();
  if (token) {
    try {
      const res = await authFetch("/api/rooms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, password: cleanPassword }),
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");

      if (res.ok && isJson) {
        const data = await res.json();
        if (data?.room?.code) {
          return {
            name: data.room.name,
            code: data.room.code,
            documentId: data.room.document_id ?? null,
          };
        }
      } else if (isJson && res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Không thể tham gia phòng học này.");
      } else if (isJson && res.status === 401) {
        const errData = await res.json().catch(() => ({}));
        backendAuthError = errData.error || "Mật khẩu phòng không chính xác.";
      }
    } catch (err: unknown) {
      if (err instanceof Error && (err.message.includes("đủ sĩ số") || err.message.includes("mời ra khỏi"))) {
        throw err;
      }
    }
  }

  // 2. Dự phòng xác thực qua RPC SECURITY DEFINER phía PostgreSQL
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("verify_room_access", {
      p_code: cleanCode,
      p_password: cleanPassword,
    });

    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0 && rpcData[0]?.code) {
      const r = rpcData[0];
      return { name: r.name, code: r.code, documentId: r.document_id ?? null };
    }
    if (!rpcErr && rpcData && !Array.isArray(rpcData) && (rpcData as any).code) {
      const r = rpcData as any;
      return { name: r.name, code: r.code, documentId: r.document_id ?? null };
    }
    if (rpcErr && rpcErr.message?.includes("Mật khẩu phòng không chính xác")) {
      throw new Error("Mật khẩu phòng không chính xác.");
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Mật khẩu phòng không chính xác")) {
      throw err;
    }
  }

  // 3. Dự phòng kiểm tra trực tiếp trên bảng public.rooms của Supabase
  try {
    let roomRow: any = null;
    const { data: fullRow, error: fullErr } = await supabase
      .from("rooms")
      .select("id, name, code, document_id, is_active, host_user_id, password_hash")
      .eq("code", cleanCode)
      .maybeSingle();

    if (!fullErr && fullRow) {
      roomRow = fullRow;
    } else {
      // Nếu RLS hoặc Column Privilege chặn đọc password_hash / host_user_id
      const { data: safeRow } = await supabase
        .from("rooms")
        .select("id, name, code, document_id, is_active")
        .eq("code", cleanCode)
        .maybeSingle();
      if (safeRow) {
        roomRow = safeRow;
      }
    }

    if (roomRow) {
      if (roomRow.is_active === false) {
        throw new Error("Phòng học này đã kết thúc.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = sessionData.session?.user?.id;
      const currentUserName =
        sessionData.session?.user?.user_metadata?.full_name ||
        sessionData.session?.user?.email?.split("@")[0] ||
        "Thành viên";
      const isHostUser = Boolean(roomRow.host_user_id && currentUserId && roomRow.host_user_id === currentUserId);

      if (!isHostUser && roomRow.password_hash) {
        if (backendAuthError) {
          throw new Error(backendAuthError);
        }
        const ok = await verifyPasswordClient(cleanPassword, roomRow.password_hash);
        if (!ok) {
          throw new Error("Mật khẩu phòng không chính xác.");
        }
      } else if (!isHostUser && backendAuthError) {
        throw new Error(backendAuthError);
      }

      // Ghi nhận thành viên vào room_members để Backend / LiveKit SFU công nhận ngay lập tức
      if (roomRow.id && isValidUUID(currentUserId)) {
        try {
          await supabase.from("room_members").insert({
            room_id: roomRow.id,
            user_id: currentUserId,
            user_name: currentUserName,
            role: isHostUser ? "host" : "viewer",
            is_online: true,
          });
        } catch {}
      }

      return {
        name: roomRow.name || `Phòng #${roomRow.code}`,
        code: roomRow.code,
        documentId: roomRow.document_id ?? null,
      };
    }
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.message.includes("Mật khẩu") || err.message.includes("kết thúc"))
    ) {
      throw err;
    }
  }

  // 4. Dự phòng kiểm tra trong danh sách mẫu cho chế độ demo offline
  const mockRoom = INITIAL_HISTORY.find((r) => r.code === cleanCode);
  if (mockRoom) {
    return { name: mockRoom.name, code: mockRoom.code, documentId: mockRoom.documentId };
  }

  throw new Error(backendAuthError || "Mã phòng không tồn tại hoặc phòng đã đóng.");
}

/**
 * Tạo phòng học mới qua Backend, RPC PostgreSQL hoặc lưu trực tiếp lên Supabase (kèm băm mật khẩu SHA-256)
 */
export async function createRoomApi({
  name,
  code,
  password,
  hostUserId,
}: {
  name: string;
  code: string;
  password: string;
  hostUserId?: string;
}): Promise<{ name: string; code: string }> {
  const roomName = name.trim();
  let roomCode = code.trim() || randomCode();
  const roomPassword = password ? password.trim() : "";

  // 1. Ưu tiên gọi Backend API (/api/rooms/create)
  const token = await getAccessToken();
  if (token) {
    try {
      const res = await authFetch("/api/rooms/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: roomName,
          code: roomCode,
          password: roomPassword || undefined,
        }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const json = await res.json();
        if (json?.room?.code) {
          return { name: json.room.name || roomName, code: json.room.code };
        }
      }
    } catch (err) {
      console.warn("Lỗi tạo phòng qua API server, chuyển sang RPC/Supabase:", err);
    }
  }

  // 2. Dự phòng qua RPC băm mật khẩu trực tiếp trong PostgreSQL
  try {
    const { data: rpcRoom, error: rpcErr } = await supabase.rpc("create_room_secure", {
      p_name: roomName,
      p_code: roomCode,
      p_password: roomPassword || null,
    });
    if (!rpcErr && rpcRoom) {
      const row = Array.isArray(rpcRoom) ? rpcRoom[0] : rpcRoom;
      if (row?.code) {
        return { name: row.name || roomName, code: row.code };
      }
    }
  } catch (err) {
    console.warn("Lỗi tạo phòng qua RPC create_room_secure:", err);
  }

  // 3. Dự phòng ghi trực tiếp vào bảng public.rooms trên Supabase (luôn băm mật khẩu trước khi gửi)
  try {
    const hashedPassword = roomPassword ? await hashPasswordClient(roomPassword) : null;
    const { data: sessionData } = await supabase.auth.getSession();
    const effectiveHostId = isValidUUID(hostUserId)
      ? hostUserId
      : sessionData.session?.user?.id;
    const hostDisplayName =
      sessionData.session?.user?.user_metadata?.full_name ||
      sessionData.session?.user?.email?.split("@")[0] ||
      "Chủ phòng";

    for (let attempt = 0; attempt < 3; attempt++) {
      const payload: Record<string, any> = {
        name: roomName,
        code: roomCode,
        password_hash: hashedPassword,
        is_active: true,
      };
      if (isValidUUID(effectiveHostId)) {
        payload.host_user_id = effectiveHostId;
      }

      const { data, error } = await supabase
        .from("rooms")
        .insert([payload])
        .select("id, name, code")
        .maybeSingle();

      if (!error && data?.code) {
        if (data.id && isValidUUID(effectiveHostId)) {
          try {
            await supabase.from("room_members").insert({
              room_id: data.id,
              user_id: effectiveHostId,
              user_name: hostDisplayName,
              role: "host",
              is_online: true,
            });
          } catch {}
        }
        return { name: data.name || roomName, code: data.code };
      }

      // Nếu mã phòng bị trùng (23505), sinh mã 6 số mới và thử lại
      if (error && (error.code === "23505" || error.message?.includes("duplicate key"))) {
        roomCode = randomCode();
        continue;
      }

      // Nếu bảng rooms trên Supabase chưa có cột host_user_id hoặc password_hash bị chặn select
      if (error) {
        const fallbackPayload: Record<string, any> = {
          name: roomName,
          code: roomCode,
          password_hash: hashedPassword,
          is_active: true,
        };
        const { data: d2, error: e2 } = await supabase
          .from("rooms")
          .insert([fallbackPayload])
          .select("id, name, code")
          .maybeSingle();

        if (!e2 && d2?.code) {
          return { name: d2.name || roomName, code: d2.code };
        }
      }
      break;
    }
  } catch (err) {
    console.warn("Lỗi ghi phòng trực tiếp vào Supabase:", err);
  }

  throw new Error(
    "Không thể lưu phòng học lên hệ thống. Vui lòng kiểm tra kết nối mạng hoặc đăng nhập lại."
  );
}

export const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));
