// services/liveExamSync.ts — Đồng bộ phòng thi & bài kiểm tra trực tuyến đa thiết bị (Realtime Multi-Device)
import { supabase } from "./supabaseClient";
import { LiveExam } from "./examService";

export interface ExamSyncPayload {
  __type: "PERMIND_EXAM";
  exam: LiveExam;
  hostUserId?: string | null;
  hostName?: string;
  startedAt: number;
  endAt: number;
  status: "running" | "ended";
}

/**
 * 1. Mở bài kiểm tra lên đám mây Supabase để bất kỳ thiết bị nào cũng có thể nhập mã và tham gia
 */
export async function publishLiveExam(
  exam: LiveExam,
  hostUserId?: string,
  hostName?: string
): Promise<boolean> {
  const code = exam.code.trim();

  // Lưu bản sao cục bộ vào localStorage làm cache dự phòng
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`permind_active_exam_${code}`, JSON.stringify(exam));
      localStorage.setItem("permind_current_live_exam", JSON.stringify(exam));
    } catch (e) {
      console.warn("Lỗi lưu cache bài thi cục bộ:", e);
    }
  }

  // Đóng các phòng thi cũ của cùng mã nếu có
  try {
    await supabase.from("rooms").update({ is_active: false }).eq("code", code);
  } catch {}

  const syncData: ExamSyncPayload = {
    __type: "PERMIND_EXAM",
    exam,
    hostUserId: hostUserId || null,
    hostName: hostName || "Chủ phòng",
    startedAt: exam.startedAt || Date.now(),
    endAt: exam.endAt,
    status: "running",
  };

  const payload: any = {
    name: JSON.stringify(syncData),
    code,
    is_active: true,
  };

  try {
    const { error } = await supabase.from("rooms").insert([payload]);
    if (error) {
      console.warn("Lưu bài kiểm tra lên Supabase thất bại:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Lỗi mạng khi xuất bản bài kiểm tra:", err);
    return false;
  }
}

/**
 * 2. Tìm bài kiểm tra đang mở theo mã 6 số từ bất kỳ thiết bị nào (Cloud + Cache)
 */
export async function fetchLiveExam(code: string): Promise<LiveExam | null> {
  const cleanCode = code.trim();
  if (!cleanCode) return null;

  // 1. Thử lấy từ Supabase Cloud trước
  try {
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, code, is_active, created_at")
      .eq("code", cleanCode)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!error && Array.isArray(data) && data.length > 0) {
      try {
        const parsed = JSON.parse(data[0].name) as ExamSyncPayload;
        if (parsed && parsed.__type === "PERMIND_EXAM" && parsed.exam) {
          const exam = parsed.exam;
          // Đồng bộ lại mốc thời gian tuyệt đối chính xác
          exam.startedAt = parsed.startedAt || exam.startedAt;
          exam.endAt = parsed.endAt || exam.endAt;
          exam.status = parsed.status || exam.status;
          return exam;
        }
      } catch (parseErr) {
        console.warn("Lỗi đọc payload bài thi từ cloud:", parseErr);
      }
    }
  } catch (netErr) {
    console.warn("Không thể kết nối Supabase để tra cứu mã bài thi:", netErr);
  }

  // 2. Dự phòng: Kiểm tra trong localStorage (trường hợp cùng thiết bị hoặc offline)
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`permind_active_exam_${cleanCode}`);
      if (stored) {
        const local = JSON.parse(stored) as LiveExam;
        if (local && local.code === cleanCode) {
          return local;
        }
      }
    } catch {}
  }

  return null;
}

/**
 * 3. Đóng bài kiểm tra trên Supabase Cloud
 */
export async function closeLiveExam(code: string): Promise<void> {
  const cleanCode = code.trim();
  try {
    await supabase.from("rooms").update({ is_active: false }).eq("code", cleanCode);
  } catch (e) {
    console.warn("Lỗi đóng bài kiểm tra trên cloud:", e);
  }

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(`permind_active_exam_${cleanCode}`);
      if (stored) {
        const parsed: LiveExam = JSON.parse(stored);
        parsed.status = "ended";
        localStorage.setItem(`permind_active_exam_${cleanCode}`, JSON.stringify(parsed));
      }
    } catch {}
  }
}

/**
 * 4. Kênh truyền thông thời gian thực Supabase Realtime (Broadcast + Presence)
 */
export interface RealtimeHandlers {
  onStudentJoin?: (data: { name: string; id?: string }) => void;
  onStudentProgress?: (data: {
    name: string;
    answered: number;
    correct: number;
    score: number;
    done?: boolean;
  }) => void;
  onStudentSubmit?: (data: {
    name: string;
    answered: number;
    correct: number;
    score: number;
  }) => void;
  onExamEnded?: () => void;
}

export function subscribeExamRealtime(code: string, handlers: RealtimeHandlers) {
  const cleanCode = code.trim();
  const channelName = `exam_live_channel_${cleanCode}`;
  const channel = supabase.channel(channelName);

  channel
    .on("broadcast", { event: "STUDENT_JOIN" }, ({ payload }) => {
      handlers.onStudentJoin?.(payload);
    })
    .on("broadcast", { event: "STUDENT_PROGRESS" }, ({ payload }) => {
      handlers.onStudentProgress?.(payload);
    })
    .on("broadcast", { event: "STUDENT_SUBMIT" }, ({ payload }) => {
      handlers.onStudentSubmit?.(payload);
    })
    .on("broadcast", { event: "EXAM_ENDED" }, () => {
      handlers.onExamEnded?.();
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Kênh đã sẵn sàng
      }
    });

  return {
    sendStudentJoin(name: string, id?: string) {
      return channel.send({
        type: "broadcast",
        event: "STUDENT_JOIN",
        payload: { name, id },
      });
    },
    sendStudentProgress(name: string, answered: number, correct: number, score: number, done = false) {
      return channel.send({
        type: "broadcast",
        event: "STUDENT_PROGRESS",
        payload: { name, answered, correct, score, done },
      });
    },
    sendStudentSubmit(name: string, answered: number, correct: number, score: number) {
      return channel.send({
        type: "broadcast",
        event: "STUDENT_SUBMIT",
        payload: { name, answered, correct, score, done: true },
      });
    },
    sendExamEnded() {
      return channel.send({
        type: "broadcast",
        event: "EXAM_ENDED",
        payload: { code: cleanCode, endedAt: Date.now() },
      });
    },
    unsubscribe() {
      return channel.unsubscribe();
    },
  };
}
