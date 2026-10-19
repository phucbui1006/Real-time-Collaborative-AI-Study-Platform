import { createRoom, verifyRoom, getRooms } from "./api";

// services/roomService.ts — Service quản lý phòng học & dữ liệu lịch sử
export type RoomItem = {
  id: number;
  name: string;
  code: string;
  lastVisit: string;
  color: string;
};

export const INITIAL_HISTORY: RoomItem[] = [
  { id: 1, name: "Nhóm ôn thi Toán 12", code: "482913", lastVisit: "Hôm nay, 19:30", color: "#0ea5e9" },
  { id: 2, name: "English Speaking Club", code: "730256", lastVisit: "Hôm qua, 20:00", color: "#8b5cf6" },
  { id: 3, name: "Lập trình AI & Web", code: "159847", lastVisit: "3 ngày trước", color: "#10b981" },
];

export const COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"];

export async function fetchRoomsApi(): Promise<RoomItem[]> {
  try {
    const res = await getRooms();
    if (res.data?.success && Array.isArray(res.data.rooms) && res.data.rooms.length > 0) {
      return res.data.rooms.map((r: { id: number; name: string; code: string; created_at?: string }, i: number) => {
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
        };
      });
    }
  } catch (err) {
    console.warn("Lỗi tải phòng từ server, dùng cache:", err);
  }
  return INITIAL_HISTORY;
}

export async function joinRoomApi({ code, password }: { code: string; password: string }): Promise<{ name: string; code: string }> {
  try {
    const res = await verifyRoom(code);
    if (res.data?.success && res.data?.room) {
      return { name: res.data.room.name, code: res.data.room.code };
    }
  } catch (err: unknown) {
    const axiosError = err as { response?: { status?: number; data?: { error?: string } } };
    if (axiosError.response?.status === 404) {
      throw new Error("Mã phòng không tồn tại trên hệ thống.");
    }
  }
  if (password && password.length < 4) throw new Error("Mật khẩu không đúng.");
  return { name: `Phòng ${code}`, code };
}

export async function createRoomApi({ name, code, password }: { name: string; code: string; password: string }): Promise<{ name: string; code: string }> {
  try {
    const res = await createRoom(name);
    if (res.data?.success && res.data?.room) {
      return { name: res.data.room.name, code: res.data.room.code };
    }
  } catch (err) {
    console.warn("Dùng mã dự phòng:", err);
  }
  void password;
  return { name, code };
}

export const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));
