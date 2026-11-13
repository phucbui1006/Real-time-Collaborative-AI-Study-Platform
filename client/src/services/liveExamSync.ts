// services/liveExamSync.ts — Đồng bộ phòng thi & bài kiểm tra trực tuyến đa thiết bị (Realtime Multi-Device)
import { supabase } from "./supabaseClient";
import { LiveExam, LiveParticipant } from "./examService";
import { isValidUUID } from "../utils";

export interface ExamSyncPayload {
  __type: "PERMIND_EXAM";
  exam: LiveExam;
  hostUserId?: string | null;
  hostName?: string;
  startedAt: number;
  endAt: number;
  status: "running" | "ended";
}

function isMissingRpcError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "42883" || err.code === "PGRST202") return true;
  const msg = String(err.message || "").toLowerCase();
  return msg.includes("could not find the function") || (msg.includes("function") && msg.includes("does not exist"));
}

function stripQuestionAnswers(exam: LiveExam): LiveExam {
  return {
    ...exam,
    set: {
      ...exam.set,
      questions: (exam.set?.questions || []).map((q) => ({
        id: q.id,
        text: q.text,
        options: Array.isArray(q.options) ? [...q.options] : [],
        correct: -1,
      })),
    },
  };
}

function extractAnswerKey(exam: LiveExam): Record<string, number> {
  const key: Record<string, number> = {};
  for (const q of exam.set?.questions || []) {
    if (typeof q.correct === "number" && q.correct >= 0) {
      key[q.id] = q.correct;
    }
  }
  return key;
}

interface HostParticipantRow {
  user_id?: string | null;
  participant_name?: string | null;
  answered?: number | null;
  correct?: number | null;
  score?: number | null;
  done?: boolean | null;
  updated_at?: string | null;
}

async function fetchHostExamParticipants(code: string): Promise<LiveParticipant[] | null> {
  try {
    const { data, error } = await supabase.rpc("get_host_exam_participants", {
      p_code: code.trim(),
    });
    if (error || !Array.isArray(data)) return null;
    return (data as HostParticipantRow[]).map((p) => ({
      id: p.user_id ? String(p.user_id) : undefined,
      name: String(p.participant_name || "Thí sinh"),
      answered: Number(p.answered) || 0,
      correct: Number(p.correct) || 0,
      score: Number(p.score) || 0,
      done: Boolean(p.done),
      joinedAt: p.updated_at ? new Date(p.updated_at).getTime() : Date.now(),
    }));
  } catch {
    return null;
  }
}

/**
 * 1. Mở bài kiểm tra lên đám mây Supabase để bất kỳ thiết bị nào cũng có thể nhập mã và tham gia
 *    Bảo mật: Tách answer_key sang bảng live_exams qua RPC SECURITY DEFINER, không phát đáp án đúng cho thí sinh.
 */
export async function publishLiveExam(
  exam: LiveExam,
  hostUserId?: string,
  hostName?: string
): Promise<boolean> {
  const code = exam.code.trim();

  // Lưu bản sao cục bộ cho Host (cùng thiết bị) làm cache dự phòng
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`permind_active_exam_${code}`, JSON.stringify(exam));
      localStorage.setItem("permind_current_live_exam", JSON.stringify(exam));
    } catch (e) {
      console.warn("Lỗi lưu cache bài thi cục bộ:", e);
    }
  }

  const publicExam = stripQuestionAnswers({ ...exam, participants: [], bots: [] });
  const answerKey = extractAnswerKey(exam);

  const publicSyncData: ExamSyncPayload = {
    __type: "PERMIND_EXAM",
    exam: publicExam,
    hostUserId: hostUserId || null,
    hostName: hostName || "Chủ phòng",
    startedAt: exam.startedAt || Date.now(),
    endAt: exam.endAt,
    status: "running",
  };

  try {
    const { error: rpcError } = await supabase.rpc("publish_live_exam", {
      p_code: code,
      p_public_payload: publicSyncData,
      p_answer_key: answerKey,
      p_end_at: new Date(exam.endAt || Date.now() + 15 * 60 * 1000).toISOString(),
    });

    if (!rpcError) {
      return true;
    }

    if (!isMissingRpcError(rpcError)) {
      console.warn("Xuất bản bài kiểm tra qua RPC thất bại:", rpcError.message);
      return false;
    }
  } catch (rpcEx) {
    console.warn("Lỗi gọi RPC publish_live_exam:", rpcEx);
  }

  // Fallback chỉ chạy khi migration SQL v2 chưa được chạy trên Supabase
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
    ...(hostUserId && isValidUUID(hostUserId) ? { host_user_id: hostUserId } : {}),
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
 * Tra cứu danh sách thí sinh đã tham gia và nộp bài từ bảng room_members trên Supabase Cloud
 */
export async function fetchRoomParticipants(roomId: number | string): Promise<LiveParticipant[]> {
  if (!roomId) return [];
  try {
    const { data, error } = await supabase
      .from("room_members")
      .select("user_name, avatar_color, role, joined_at")
      .eq("room_id", roomId)
      .eq("role", "exam_participant")
      .order("joined_at", { ascending: true });

    if (error || !Array.isArray(data)) return [];

    const map = new Map<string, LiveParticipant>();
    for (const m of data) {
      try {
        const parsed = JSON.parse(m.avatar_color);
        const name = m.user_name || parsed.name;
        if (!name) continue;

        const cur = map.get(name);
        if (!cur) {
          map.set(name, {
            name,
            id: parsed.id,
            answered: Number(parsed.answered) || 0,
            correct: Number(parsed.correct) || 0,
            score: Number(parsed.score) || 0,
            done: !!parsed.done,
            joinedAt: parsed.timestamp ? Number(parsed.timestamp) : (m.joined_at ? new Date(m.joined_at).getTime() : Date.now()),
          });
        } else {
          map.set(name, {
            ...cur,
            id: parsed.id || cur.id,
            answered: Math.max(cur.answered || 0, Number(parsed.answered) || 0),
            correct: Math.max(cur.correct || 0, Number(parsed.correct) || 0),
            score: Math.max(cur.score || 0, Number(parsed.score) || 0),
            done: cur.done || !!parsed.done,
          });
        }
      } catch {
        if (m.user_name && !map.has(m.user_name)) {
          map.set(m.user_name, {
            name: m.user_name,
            answered: 0,
            correct: 0,
            score: 0,
            done: false,
          });
        }
      }
    }
    return Array.from(map.values());
  } catch (err) {
    console.warn("Lỗi tra cứu thí sinh từ room_members:", err);
    return [];
  }
}

/**
 * 2. Tìm bài kiểm tra đang mở theo mã 6 số từ bất kỳ thiết bị nào (Cloud + Cache)
 */
export async function fetchLiveExam(code: string, activeOnly: boolean = false): Promise<LiveExam | null> {
  const cleanCode = code.trim();
  if (!cleanCode) return null;

  // 1a. Ưu tiên RPC bảo mật (không trả answer_key cho thí sinh)
  try {
    const { data: rpcRow, error: rpcError } = await supabase.rpc("get_live_exam_public", {
      p_code: cleanCode,
      p_active_only: activeOnly,
    });

    if (!rpcError && rpcRow) {
      const record = Array.isArray(rpcRow) ? rpcRow[0] : rpcRow;
      if (record && record.public_payload) {
        const parsed = (
          typeof record.public_payload === "string"
            ? JSON.parse(record.public_payload)
            : record.public_payload
        ) as ExamSyncPayload;

        if (parsed && parsed.__type === "PERMIND_EXAM" && parsed.exam) {
          const exam = stripQuestionAnswers(parsed.exam);
          exam.startedAt = parsed.startedAt || exam.startedAt;
          exam.endAt = parsed.endAt || exam.endAt;
          exam.hostUserId = record.host_user_id || parsed.hostUserId || exam.hostUserId || null;
          exam.hostName = parsed.hostName || exam.hostName;
          exam.status = (!record.is_active || parsed.status === "ended") ? "ended" : (parsed.status || exam.status);

          const [hostParticipants, memberParticipants] = await Promise.all([
            fetchHostExamParticipants(cleanCode),
            record.room_id ? fetchRoomParticipants(record.room_id) : Promise.resolve([]),
          ]);

          if (hostParticipants && hostParticipants.length > 0) {
            exam.participants = hostParticipants;
          } else {
            exam.participants = memberParticipants;
          }
          return exam;
        }
      }
      return null;
    }

    if (rpcError && !isMissingRpcError(rpcError)) {
      console.warn("Lỗi gọi get_live_exam_public:", rpcError.message);
    }
  } catch (rpcNetErr) {
    console.warn("Không thể gọi get_live_exam_public:", rpcNetErr);
  }

  // 1b. Dự phòng cho schema cũ (khi chưa chạy supabase_security_hardening_v2.sql)
  try {
    let query = supabase
      .from("rooms")
      .select("id, name, code, is_active, created_at, host_user_id")
      .eq("code", cleanCode)
      .order("created_at", { ascending: false })
      .limit(1);

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data) && data.length > 0) {
      try {
        const row = data[0];
        const parsed = JSON.parse(row.name) as ExamSyncPayload;
        if (parsed && parsed.__type === "PERMIND_EXAM" && parsed.exam) {
          const exam = parsed.exam;
          exam.startedAt = parsed.startedAt || exam.startedAt;
          exam.endAt = parsed.endAt || exam.endAt;
          exam.hostUserId = (row as any).host_user_id || parsed.hostUserId || exam.hostUserId || null;
          exam.hostName = parsed.hostName || exam.hostName;
          exam.status = (!row.is_active || parsed.status === "ended") ? "ended" : (parsed.status || exam.status);

          const memberParticipants = await fetchRoomParticipants(row.id);
          const mergedMap = new Map<string, LiveParticipant>();
          for (const p of (parsed.exam.participants || [])) {
            mergedMap.set(p.name, p);
          }
          for (const mp of memberParticipants) {
            const cur = mergedMap.get(mp.name);
            if (!cur) {
              mergedMap.set(mp.name, mp);
            } else {
              mergedMap.set(mp.name, {
                ...cur,
                id: mp.id || cur.id,
                answered: Math.max(cur.answered || 0, mp.answered || 0),
                correct: Math.max(cur.correct || 0, mp.correct || 0),
                score: Math.max(cur.score || 0, mp.score || 0),
                done: cur.done || mp.done,
              });
            }
          }
          exam.participants = Array.from(mergedMap.values());
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
    const { error: rpcError } = await supabase.rpc("close_live_exam", {
      p_code: cleanCode,
    });
    if (rpcError && isMissingRpcError(rpcError)) {
      await supabase.from("rooms").update({ is_active: false }).eq("code", cleanCode);
    }
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

/**
 * Tra cứu phòng thi do chính hostUserId này tạo đang còn hiệu lực trên máy chủ đám mây Supabase
 */
export async function fetchHostActiveExam(hostUserId: string): Promise<LiveExam | null> {
  if (!hostUserId) return null;

  try {
    let query = supabase
      .from("rooms")
      .select("id, name, code, is_active, created_at, host_user_id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(30);

    if (isValidUUID(hostUserId)) {
      query = query.eq("host_user_id", hostUserId);
    }

    const { data, error } = await query;

    if (!error && Array.isArray(data)) {
      const now = Date.now();
      for (const row of data) {
        try {
          const parsed = JSON.parse(row.name) as ExamSyncPayload;
          if (
            parsed &&
            parsed.__type === "PERMIND_EXAM" &&
            (parsed.hostUserId === hostUserId || row.host_user_id === hostUserId) &&
            parsed.exam &&
            parsed.endAt > now
          ) {
            const exam = parsed.exam;
            exam.startedAt = parsed.startedAt || exam.startedAt;
            exam.endAt = parsed.endAt || exam.endAt;
            exam.status = parsed.status || "running";
            exam.hostUserId = hostUserId;

            const [hostParticipants, memberParticipants] = await Promise.all([
              fetchHostExamParticipants(row.code),
              fetchRoomParticipants(row.id),
            ]);

            if (hostParticipants && hostParticipants.length > 0) {
              exam.participants = hostParticipants;
              return exam;
            }

            const mergedMap = new Map<string, LiveParticipant>();
            for (const p of (parsed.exam.participants || [])) {
              mergedMap.set(p.name, p);
            }
            for (const mp of memberParticipants) {
              const cur = mergedMap.get(mp.name);
              if (!cur) {
                mergedMap.set(mp.name, mp);
              } else {
                mergedMap.set(mp.name, {
                  ...cur,
                  id: mp.id || cur.id,
                  answered: Math.max(cur.answered || 0, mp.answered || 0),
                  correct: Math.max(cur.correct || 0, mp.correct || 0),
                  score: Math.max(cur.score || 0, mp.score || 0),
                  done: cur.done || mp.done,
                });
              }
            }
            exam.participants = Array.from(mergedMap.values());
            return exam;
          }
        } catch {}
      }
    }
  } catch (err) {
    console.warn("Lỗi tra cứu phòng thi đang mở của host:", err);
  }

  return null;
}

/**
 * Lưu/cập nhật thông tin thí sinh và tiến độ, điểm số vào bản ghi phòng thi trên Supabase Cloud
 */
export async function syncParticipantToCloud(
  code: string,
  participant: {
    name: string;
    id?: string;
    answered: number;
    correct: number;
    score: number;
    done?: boolean;
  }
): Promise<void> {
  const cleanCode = code.trim();
  if (!cleanCode) return;

  try {
    // 1. Tìm room_id của mã phòng thi
    const { data, error } = await supabase
      .from("rooms")
      .select("id, name, is_active")
      .eq("code", cleanCode)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !Array.isArray(data) || data.length === 0) return;
    const row = data[0];
    const roomId = row.id;

    // 2. Ghi nhận dữ liệu thí sinh vào bảng room_members (có chính sách Public INSERT cho mọi tài khoản)
    await supabase.from("room_members").insert([
      {
        room_id: roomId,
        user_name: participant.name,
        role: "exam_participant",
        avatar_color: JSON.stringify({
          id: participant.id,
          answered: participant.answered,
          correct: participant.correct,
          score: participant.score,
          done: !!participant.done,
          timestamp: Date.now(),
        }),
        is_online: !participant.done,
      },
    ]);

    // 3. Cập nhật dự phòng vào trường name của rooms nếu được cấp quyền
    try {
      const payload: ExamSyncPayload = JSON.parse(row.name);
      if (payload && payload.__type === "PERMIND_EXAM" && payload.exam) {
        const participants = payload.exam.participants || [];
        const existingIdx = participants.findIndex(
          (p) => (participant.id && p.id === participant.id) || p.name === participant.name
        );
        if (existingIdx !== -1) {
          const old = participants[existingIdx];
          participants[existingIdx] = {
            ...old,
            answered: Math.max(old.answered || 0, participant.answered),
            correct: Math.max(old.correct || 0, participant.correct),
            score: Math.max(old.score || 0, participant.score),
            done: participant.done || old.done,
          };
        } else {
          participants.push({
            id: participant.id,
            name: participant.name,
            answered: participant.answered,
            correct: participant.correct,
            score: participant.score,
            done: !!participant.done,
            joinedAt: Date.now(),
          });
        }
        payload.exam.participants = participants;
        await supabase
          .from("rooms")
          .update({ name: JSON.stringify(payload) })
          .eq("id", row.id);
      }
    } catch {}
  } catch (err) {
    console.warn("Lỗi đồng bộ thí sinh lên Supabase Cloud (room_members):", err);
  }
}

export interface ServerGradedResult {
  serverGraded: boolean;
  answered: number;
  correct?: number;
  score?: number;
  perQ?: (boolean | null)[];
}

/**
 * Nộp đáp án để Postgres RPC (SECURITY DEFINER) chấm điểm phía máy chủ.
 * Chỉ trả chi tiết correct / score / perQ sau khi done = true để chống dò đáp án giữa giờ.
 */
export async function submitLiveExamAnswers(
  code: string,
  participantName: string,
  originalAnswers: Record<string, number>,
  questionOrder: string[],
  done: boolean
): Promise<ServerGradedResult | null> {
  const cleanCode = code.trim();
  if (!cleanCode) return null;

  try {
    const { data, error } = await supabase.rpc("submit_live_exam_answers", {
      p_code: cleanCode,
      p_participant_name: participantName,
      p_answers: originalAnswers,
      p_question_order: questionOrder,
      p_done: done,
    });

    if (error) {
      if (!isMissingRpcError(error)) {
        console.warn("Lỗi chấm bài phía server:", error.message);
      }
      return null;
    }

    if (!data || typeof data !== "object") return null;
    const payload = data as {
      answered?: number;
      correct?: number;
      score?: number;
      per_q?: (boolean | null)[];
    };
    return {
      serverGraded: true,
      answered: Number(payload.answered) || 0,
      ...(typeof payload.correct === "number" ? { correct: payload.correct } : {}),
      ...(typeof payload.score === "number" ? { score: payload.score } : {}),
      ...(Array.isArray(payload.per_q) ? { perQ: payload.per_q } : {}),
    };
  } catch {
    return null;
  }
}
