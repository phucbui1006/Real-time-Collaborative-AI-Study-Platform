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
 * Lấy danh sách phòng học trực tiếp từ Supabase (KHÔNG truy vấn password_hash)
 */
export async function fetchRoomsApi(userId?: string): Promise<RoomItem[]> {
  try {
    const SAFE_ROOM_FIELDS = "id, name, code, document_id, is_active, created_at, host_user_id";
    const isRealUser = isValidUUID(userId);

    if (isRealUser) {
      const { data: rooms, error } = await supabase
        .from("rooms")
        .select(SAFE_ROOM_FIELDS)
        .eq("host_user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(rooms)) {
        return rooms.map((r, i) => {
          let lastVisit = "Vừa xong";
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
      }
      return [];
    }

    const { data: allRooms } = await supabase
      .from("rooms")
      .select(SAFE_ROOM_FIELDS)
      .is("host_user_id", null)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (Array.isArray(allRooms) && allRooms.length > 0) {
      return allRooms.map((r, i) => ({
        id: r.id,
        name: r.name,
        code: r.code,
        lastVisit: "Gần đây",
        color: COLORS[i % COLORS.length],
        documentId: r.document_id,
      }));
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
    const json = await res.json();
    return json.counts || {};
  } catch {
    return {};
  }
}

/**
 * Kiểm tra mã phòng và mật khẩu qua backend API / RPC phía server (tuyệt đối không kéo password_hash về client)
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

  // 1. Ưu tiên xác thực qua Express Backend (/api/rooms/verify) bằng JWT
  const token = await getAccessToken();
  if (token) {
    try {
      const res = await authFetch("/api/rooms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, password: cleanPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.room) {
          return {
            name: data.room.name,
            code: data.room.code,
            documentId: data.room.document_id ?? null,
          };
        }
      } else if (res.status < 500) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Mã phòng hoặc mật khẩu không chính xác.");
      }
    } catch (err: unknown) {
      // Nếu lỗi nghiệp vụ (401/403/404) đã parse ở trên thì ném ra luôn
      if (err instanceof Error && !err.message.includes("Failed to fetch")) {
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

    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      const r = rpcData[0];
      return { name: r.name, code: r.code, documentId: r.document_id ?? null };
    }
    if (!rpcErr && rpcData && !Array.isArray(rpcData) && (rpcData as any).code) {
      const r = rpcData as any;
      return { name: r.name, code: r.code, documentId: r.document_id ?? null };
    }
    if (rpcErr && rpcErr.code !== "42883" && rpcErr.code !== "PGRST202") {
      throw new Error(rpcErr.message || "Mã phòng hoặc mật khẩu không chính xác.");
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("Mật khẩu")) {
      throw err;
    }
  }

  // 3. Dự phòng kiểm tra trong danh sách mẫu cho chế độ demo offline
  const mockRoom = INITIAL_HISTORY.find((r) => r.code === cleanCode);
  if (mockRoom) {
    return { name: mockRoom.name, code: mockRoom.code, documentId: mockRoom.documentId };
  }

  throw new Error("Mã phòng không hợp lệ hoặc bạn cần đăng nhập để tham gia phòng.");
}

/**
 * Tạo phòng học mới qua Backend (băm mật khẩu scrypt phía server) hoặc RPC PostgreSQL
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
  const roomCode = code.trim() || randomCode();
  const roomPassword = password ? password.trim() : "";

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
      if (res.ok) {
        const json = await res.json();
        if (json?.room) {
          return { name: json.room.name, code: json.room.code };
        }
      }
    } catch (err) {
      console.warn("Lỗi tạo phòng qua API server, thử RPC Supabase:", err);
    }
  }

  // Dự phòng qua RPC băm mật khẩu trực tiếp trong PostgreSQL (không lưu plaintext từ browser)
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
    console.warn("Lỗi tạo phòng RPC:", err);
  }

  // Chỉ cho phép ghi trực tiếp khi không đặt mật khẩu hoặc phòng offline
  if (!roomPassword && isValidUUID(hostUserId)) {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .insert([
          {
            name: roomName,
            code: roomCode,
            host_user_id: hostUserId,
            is_active: true,
          },
        ])
        .select("name, code")
        .maybeSingle();

      if (!error && data) {
        return { name: data.name, code: data.code };
      }
    } catch {}
  }

  return { name: roomName, code: roomCode };
}

export const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));
