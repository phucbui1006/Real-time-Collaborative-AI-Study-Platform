// services/roomService.ts — Service quản lý phòng học & dữ liệu Supabase Realtime
import { supabase } from "./supabaseClient";

export type RoomItem = {
  id: number;
  name: string;
  code: string;
  lastVisit: string;
  color: string;
  documentId?: number | null;
};

export const INITIAL_HISTORY: RoomItem[] = [
  { id: 1, name: "Nhóm ôn thi Toán 12", code: "482913", lastVisit: "Hôm nay, 19:30", color: "#0ea5e9", documentId: 1 },
  { id: 2, name: "English Speaking Club", code: "730256", lastVisit: "Hôm qua, 20:00", color: "#8b5cf6", documentId: 2 },
  { id: 3, name: "Lập trình AI & Web", code: "159847", lastVisit: "3 ngày trước", color: "#10b981", documentId: 3 },
];

export const COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"];

/**
 * Lấy danh sách phòng học trực tiếp từ Supabase (có lọc theo chủ phòng nếu có userId)
 */
export async function fetchRoomsApi(userId?: string): Promise<RoomItem[]> {
  try {
    let query = supabase.from("rooms").select("*").eq("is_active", true);
    if (userId) {
      query = query.eq("host_user_id", userId);
    }
    const { data: rooms, error } = await query.order("created_at", { ascending: false });

    // Nếu cột host_user_id chưa có trên DB, fallback query bình thường
    if (error && (error.message.includes("host_user_id") || error.code === "42703")) {
      const { data: allRooms, error: errAll } = await supabase
        .from("rooms")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (!errAll && Array.isArray(allRooms)) {
        return allRooms.map((r, i) => ({
          id: r.id,
          name: r.name,
          code: r.code,
          lastVisit: "Gần đây",
          color: COLORS[i % COLORS.length],
          documentId: r.document_id,
        }));
      }
      return [];
    }

    if (!error && Array.isArray(rooms)) {
      return rooms.map((r, i) => {
        let lastVisit = "Gần đây";
        if (r.created_at) {
          try {
            const d = new Date(r.created_at);
            lastVisit = d.toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });
          } catch {
            lastVisit = "Vừa xong";
          }
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
  } catch (err) {
    console.warn("Lỗi tải phòng từ Supabase:", err);
  }
  return [];
}

/**
 * Kiểm tra mã phòng và mật khẩu trực tiếp trên Supabase
 */
export async function joinRoomApi({
  code,
  password,
}: {
  code: string;
  password: string;
}): Promise<{ name: string; code: string; documentId?: number | null }> {
  try {
    const cleanCode = code.trim();
    const cleanPassword = password.trim();

    // 1. Kiểm tra trong Supabase
    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", cleanCode)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn("Lỗi truy vấn Supabase rooms:", error.message);
    }

    if (room) {
      if (room.password_hash && room.password_hash !== cleanPassword) {
        throw new Error("Mật khẩu phòng không chính xác.");
      }
      return { name: room.name, code: room.code, documentId: room.document_id };
    }

    // 2. Dự phòng kiểm tra trong danh sách mẫu cho chế độ demo
    const mockRoom = INITIAL_HISTORY.find((r) => r.code === cleanCode);
    if (mockRoom) {
      return { name: mockRoom.name, code: mockRoom.code, documentId: mockRoom.documentId };
    }

    throw new Error("Mã phòng không tồn tại trên hệ thống hoặc phòng đã đóng.");
  } catch (err: unknown) {
    const e = err as Error;
    throw new Error(e.message || "Có lỗi xảy ra khi xác thực phòng.");
  }
}

/**
 * Tạo phòng học mới và lưu trực tiếp lên Supabase (gắn hostUserId)
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
  const roomPassword = password ? password.trim() : null;

  try {
    const payload: any = {
      name: roomName,
      code: roomCode,
      password_hash: roomPassword,
      is_active: true,
    };
    if (hostUserId) {
      payload.host_user_id = hostUserId;
    }

    const { data, error } = await supabase
      .from("rooms")
      .insert([payload])
      .select()
      .maybeSingle();

    if (!error && data) {
      return { name: data.name, code: data.code };
    }

    // Nếu cột host_user_id chưa tồn tại trên Supabase, fallback bỏ field này
    if (error && (error.message.includes("host_user_id") || error.code === "42703")) {
      delete payload.host_user_id;
      const { data: d2 } = await supabase
        .from("rooms")
        .insert([payload])
        .select()
        .maybeSingle();
      if (d2) return { name: d2.name, code: d2.code };
    }

    if (error) {
      console.warn("Lỗi tạo phòng Supabase:", error.message);
    }
  } catch (err) {
    console.warn("Lỗi kết nối khi tạo phòng:", err);
  }

  return { name: roomName, code: roomCode };
}

export const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));
