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
  { id: 3, name: "Lập trình Web cơ bản", code: "159847", lastVisit: "3 ngày trước", color: "#10b981" },
];

export const COLORS = ["#0ea5e9", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899", "#14b8a6"];

export async function joinRoomApi({ code, password }: { code: string; password: string }): Promise<{ name: string; code: string }> {
  await new Promise((r) => setTimeout(r, 600));
  if (password.length < 4) throw new Error("Mật khẩu không đúng.");
  return { name: `Phòng ${code}`, code };
}

export async function createRoomApi({ name, code, password }: { name: string; code: string; password: string }): Promise<{ name: string; code: string }> {
  await new Promise((r) => setTimeout(r, 600));
  // Giả lập lưu/băm password trên backend
  void password;
  return { name, code };
}

export const randomCode = () => String(Math.floor(100000 + Math.random() * 900000));
