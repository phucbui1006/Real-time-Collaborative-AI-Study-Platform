import { useState, useRef, useEffect, useCallback } from "react";
import { MembersModal, RoomMember } from "./MembersModal";
import {
  Users,
  MessageSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Undo2,
  Trash2,
  Pencil,
  Minus,
  Circle,
  MoveUpRight,
  Type,
  Eraser,
  FileText,
  X,
  Send,
  ArrowLeft,
  Copy,
  Check,
  Presentation,
  Highlighter,
  StickyNote,
  Hand,
  Maximize2,
} from "lucide-react";

export type SlideItem = [string, string[]];
export type DocItem = {
  id: number;
  title: string;
  color: string;
  slides: SlideItem[];
};

export const DOCS: DocItem[] = [
  {
    id: 1,
    title: "Toán cao cấp – Chương 4",
    color: "#0ea5e9",
    slides: [
      ["Tích phân bội", ["Định nghĩa tích phân kép", "Tính chất cơ bản", "Đổi biến số"]],
      ["Tích phân kép trên miền chữ nhật", ["Định lý Fubini", "Ví dụ minh hoạ", "Bài tập áp dụng"]],
      ["Tọa độ cực", ["x = r·cosθ, y = r·sinθ", "Jacobian = r", "Khi nào nên dùng"]],
    ],
  },
  {
    id: 2,
    title: "Ngữ pháp tiếng Anh B1",
    color: "#8b5cf6",
    slides: [
      ["Present Perfect", ["have/has + V3", "Kinh nghiệm & kết quả", "for / since"]],
      ["Conditionals", ["Type 0 & 1", "Type 2: If I were…", "Lỗi thường gặp"]],
    ],
  },
  {
    id: 3,
    title: "Vật lý – Điện trường",
    color: "#f59e0b",
    slides: [
      ["Điện trường", ["Cường độ điện trường E = F/q", "Đường sức điện", "Nguyên lý chồng chất"]],
      ["Định luật Coulomb", ["F = k·q₁q₂/r²", "k ≈ 9·10⁹ N·m²/C²", "Bài tập ví dụ"]],
      ["Điện thế & hiệu điện thế", ["V = W/q", "U = E·d", "Tụ điện"]],
      ["Tổng kết", ["Công thức cần nhớ", "Bài tập về nhà"]],
    ],
  },
];

export const INITIAL_MEMBERS: RoomMember[] = [
  { id: 1, name: "Minh Anh (Bạn)", role: "host", avatarColor: "#0ea5e9", isOnline: true },
  { id: 2, name: "Hà My", role: "member", avatarColor: "#8b5cf6", isOnline: true },
  { id: 3, name: "Văn Nam", role: "member", avatarColor: "#10b981", isOnline: true },
  { id: 4, name: "Thu Trang", role: "member", avatarColor: "#f59e0b", isOnline: false },
];


const COLORS = ["#ef4444", "#2563eb", "#16a34a", "#f59e0b", "#111827"];

export type AnnotationObj =
  | { t: "pen"; pts: [number, number][]; color: string; w: number }
  | { t: "text"; p: [number, number]; text: string; color: string; w: number }
  | { t: "line" | "ellipse" | "arrow"; a: [number, number]; b: [number, number]; color: string; w: number };

/* ------------------------------------------------------------------ */
/* Vẽ một nét lên canvas. Toạ độ chuẩn hoá 0–1 để co giãn theo màn hình   */
/* ------------------------------------------------------------------ */
function drawObj(ctx: CanvasRenderingContext2D, o: AnnotationObj, W: number, H: number) {
  ctx.strokeStyle = o.color;
  ctx.fillStyle = o.color;
  ctx.lineWidth = o.w;
  ctx.lineCap = ctx.lineJoin = "round";
  if (o.t === "pen") {
    ctx.beginPath();
    o.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * W, y * H) : ctx.moveTo(x * W, y * H)));
    ctx.stroke();
  } else if (o.t === "text") {
    ctx.font = `600 ${Math.round(H * 0.045)}px "Segoe UI", sans-serif`;
    ctx.fillText(o.text, o.p[0] * W, o.p[1] * H);
  } else {
    const [x1, y1] = [o.a[0] * W, o.a[1] * H];
    let [x2, y2] = [o.b[0] * W, o.b[1] * H];
    if (o.t === "line") y2 = y1; // gạch chân luôn nằm ngang
    if (o.t === "ellipse") {
      ctx.beginPath();
      ctx.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1) / 2, Math.abs(y2 - y1) / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    if (o.t === "arrow") {
      const a = Math.atan2(y2 - y1, x2 - x1),
        L = 16;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45));
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45));
      ctx.stroke();
    }
  }
}

function bbox(o: AnnotationObj): [number, number, number, number] {
  if (o.t === "pen") {
    const xs = o.pts.map((p) => p[0]),
      ys = o.pts.map((p) => p[1]);
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  }
  if (o.t === "text") return [o.p[0], o.p[1] - 0.05, o.p[0] + o.text.length * 0.014, o.p[1]];
  const b = o.t === "line" ? [o.b[0], o.a[1]] : o.b;
  return [Math.min(o.a[0], b[0]), Math.min(o.a[1], b[1]), Math.max(o.a[0], b[0]), Math.max(o.a[1], b[1])];
}

/* ------------------------------------------------------------------ */
/* Khung slide + lớp canvas chú thích                                   */
/* ------------------------------------------------------------------ */
interface SlideStageProps {
  doc: DocItem;
  index: number;
  objs: AnnotationObj[];
  onChange: (objs: AnnotationObj[]) => void;
  canEdit: boolean;
  tool: string;
  color: string;
}

function SlideStage({ doc, index, objs, onChange, canEdit, tool, color }: SlideStageProps) {
  const box = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const draft = useRef<AnnotationObj | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [textAt, setTextAt] = useState<[number, number] | null>(null);
  const [txt, setTxt] = useState("");
  const [title, points] = doc.slides[index];

  useEffect(() => {
    if (!box.current) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  const redraw = useCallback(() => {
    const c = cv.current;
    if (!c || !size.w) return;
    const d = window.devicePixelRatio || 1;
    c.width = size.w * d;
    c.height = size.h * d;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.scale(d, d);
    [...objs, ...(draft.current ? [draft.current] : [])].forEach((o) => drawObj(ctx, o, size.w, size.h));
  }, [objs, size]);

  useEffect(redraw, [redraw]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    if (!cv.current) return [0, 0];
    const r = cv.current.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit || !cv.current) return;
    const p = pos(e);
    if (tool === "text") {
      setTextAt(p);
      setTxt("");
      return;
    }
    if (tool === "eraser") {
      const i = [...objs]
        .map((o, k): [AnnotationObj, number] => [o, k])
        .reverse()
        .find(([o]) => {
          const [x1, y1, x2, y2] = bbox(o),
            pad = 0.02;
          return p[0] >= x1 - pad && p[0] <= x2 + pad && p[1] >= y1 - pad && p[1] <= y2 + pad;
        });
      if (i) onChange(objs.filter((_, k) => k !== i[1]));
      return;
    }
    cv.current.setPointerCapture(e.pointerId);
    draft.current =
      tool === "pen"
        ? { t: "pen", pts: [p], color, w: 3 }
        : { t: tool as "line" | "ellipse" | "arrow", a: p, b: p, color, w: 3 };
    redraw();
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draft.current) return;
    const p = pos(e);
    if (draft.current.t === "pen") draft.current.pts.push(p);
    else if ("b" in draft.current) draft.current.b = p;
    redraw();
  };

  const up = () => {
    if (!draft.current) return;
    const o = draft.current;
    draft.current = null;
    onChange([...objs, o]);
  };

  const commitText = () => {
    if (txt.trim() && textAt) onChange([...objs, { t: "text", p: textAt, text: txt.trim(), color, w: 3 }]);
    setTextAt(null);
  };

  return (
    <div
      ref={box}
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl"
      style={{ aspectRatio: "16 / 9", background: "#fff", containerType: "inline-size" }}
    >
      <div className="absolute inset-0" style={{ padding: "6cqw" }}>
        <div style={{ height: "1.2cqw", width: "10cqw", background: doc.color, borderRadius: 99 }} />
        <h2 style={{ fontSize: "4.4cqw", fontWeight: 700, color: "#0f172a", marginTop: "2cqw" }}>{title}</h2>
        <ul
          style={{
            marginTop: "3cqw",
            fontSize: "2.6cqw",
            color: "#334155",
            lineHeight: 1.9,
            listStyle: "disc",
            paddingLeft: "3cqw",
          }}
        >
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <div style={{ position: "absolute", right: "3cqw", bottom: "2cqw", fontSize: "1.5cqw", color: "#cbd5e1" }}>
          {doc.title}
        </div>
      </div>

      <canvas
        ref={cv}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: "none", cursor: canEdit ? (tool === "text" ? "text" : "crosshair") : "default" }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      />

      {textAt && (
        <input
          autoFocus
          value={txt}
          placeholder="Nhập chữ rồi Enter"
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitText();
            if (e.key === "Escape") setTextAt(null);
          }}
          onBlur={commitText}
          className="absolute rounded border px-2 py-1 text-sm outline-none shadow-md"
          style={{
            left: `${textAt[0] * 100}%`,
            top: `${textAt[1] * 100}%`,
            transform: "translateY(-100%)",
            color,
            borderColor: color,
            background: "rgba(255,255,255,.95)",
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Popup chọn tài liệu (chủ phòng)                                      */
/* ------------------------------------------------------------------ */
interface DocPickerProps {
  docs: DocItem[];
  current: DocItem | null;
  onPick: (doc: DocItem) => void;
  onClose: () => void;
}

function DocPicker({ docs, current, onPick, onClose }: DocPickerProps) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-lg bg-white p-6 border border-slate-200/90 shadow-xl"
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Chọn tài liệu để trình bày</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Lấy từ kho bài giảng và tài liệu học tập của bạn.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <ul className="mt-4 space-y-2 max-h-80 overflow-y-auto pr-1">
          {docs.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => onPick(d)}
                className={`flex w-full items-center gap-3 rounded-lg p-3 text-left border transition-all cursor-pointer ${
                  current?.id === d.id
                    ? "bg-indigo-50/60 border-indigo-500 ring-1 ring-indigo-500/30"
                    : "bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white shadow-2xs"
                  style={{ background: d.color }}
                >
                  {d.title.slice(0, 1)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-medium text-xs text-slate-900 truncate">{d.title}</span>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {d.slides.length} slide
                  </span>
                </span>
                {current?.id === d.id && (
                  <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded border border-indigo-200">
                    Đang chọn
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Khung chat trong phòng                                               */
/* ------------------------------------------------------------------ */
export type ChatMsg = { who?: string; text: string; me?: boolean; time?: string };

interface ChatPanelProps {
  open: boolean;
  msgs: ChatMsg[];
  members: RoomMember[];
  onSend: (text: string) => void;
  onOpenMembers: () => void;
}

function ChatPanel({ open, msgs, members, onSend, onOpenMembers }: ChatPanelProps) {
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSend(text.trim());
      setText("");
    }
  };

  return (
    <aside
      className="shrink-0 overflow-hidden transition-all duration-300 border-l border-slate-200 bg-white"
      style={{ width: open ? 340 : 0 }}
      aria-hidden={!open}
    >
      <div className="flex h-full flex-col w-[340px]">
        {/* Header khung chat */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 bg-white shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-indigo-600" strokeWidth={2} />
              Trò chuyện nhóm
            </h3>
            <p className="text-xs text-slate-400">Tin nhắn đồng bộ thời gian thực</p>
          </div>
          <button
            onClick={onOpenMembers}
            title={`Xem danh sách thành viên (${members.length})`}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
          >
            <Users className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Nội dung tin nhắn */}
        <div className="flex-1 space-y-3.5 overflow-y-auto p-4 bg-slate-50/50">
          {msgs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có tin nhắn nào. Hãy gửi lời chào!
            </div>
          ) : (
            msgs.map((m, i) => {
              const isMe = !!m.me;
              const senderName = isMe ? "Bạn" : m.who || "Thành viên";
              const initial = senderName.charAt(0).toUpperCase();
              const timeDisplay = m.time || "10:30";

              return (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar tròn */}
                  <div
                    className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                      isMe ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {initial}
                  </div>

                  {/* Message content block */}
                  <div className={`flex flex-col max-w-[78%] ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center text-xs text-slate-500 px-1 mb-0.5">
                      <span className="font-semibold text-slate-700">{senderName}</span>
                      <span className="text-[11px] font-mono text-slate-400 ml-2">{timeDisplay}</span>
                    </div>

                    <div
                      className={`px-3.5 py-2 text-sm leading-relaxed shadow-2xs ${
                        isMe
                          ? "bg-indigo-600 text-white rounded-2xl rounded-tr-xs"
                          : "bg-slate-50 border border-slate-200/80 text-slate-800 rounded-2xl rounded-tl-xs mt-1"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={end} />
        </div>

        {/* Form gửi tin nhắn */}
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3 shrink-0">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhắn tin trong phòng…"
            className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 focus-visible:ring-indigo-600 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-10 w-10 rounded-xl flex items-center justify-center shadow-xs transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            aria-label="Gửi tin nhắn"
          >
            <Send className="h-4 w-4" strokeWidth={2} />
          </button>
        </form>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* MÀN HÌNH TRONG PHÒNG                                                 */
/* Props: room {name, code}, isHost, docs, onLeave                      */
/* ------------------------------------------------------------------ */
interface RoomViewProps {
  room?: { name: string; code: string };
  isHost?: boolean;
  docs?: DocItem[];
  members?: RoomMember[];
  onLeave?: () => void;
  onPresent?: (doc: DocItem) => void;
  onSlide?: (index: number) => void;
  onChangeAnnotations?: (key: string, objs: AnnotationObj[]) => void;
}

export default function RoomView({
  room = { name: "Nhóm ôn thi Toán 12", code: "482913" },
  isHost = true,
  docs = DOCS,
  members = INITIAL_MEMBERS,
  onLeave = () => {},
  onPresent = () => {},
  onSlide = () => {},
  onChangeAnnotations = () => {},
}: RoomViewProps) {
  const [doc, setDoc] = useState<DocItem | null>(null);
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, AnnotationObj[]>>({});
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [picker, setPicker] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { who: "Hà My", text: "Chào cả nhóm, mình vào rồi nhé!", time: "10:30" },
  ]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyRoomCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(room.code);
    }
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const key = doc ? `${doc.id}-${index}` : "";
  const objs = notes[key] || [];

  const setObjs = (next: AnnotationObj[]) => {
    setNotes((n) => ({ ...n, [key]: next }));
    onChangeAnnotations(key, next);
  };

  const go = useCallback(
    (i: number) => {
      if (!doc) return;
      const n = Math.max(0, Math.min(doc.slides.length - 1, i));
      setIndex(n);
      onSlide(n);
    },
    [doc, onSlide]
  );

  useEffect(() => {
    if (!isHost) return;
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [isHost, index, go]);

  useEffect(() => {
    if (chatOpen) setUnread(0);
  }, [chatOpen]);

  const pick = (d: DocItem) => {
    setDoc(d);
    setIndex(0);
    setPicker(false);
    onPresent(d);
  };

  const send = (text: string) => {
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMsgs((m) => [...m, { me: true, text, time }]);
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          who: "Hà My",
          text: "Mình đã nhận được 👍",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setUnread((u) => (chatOpen ? 0 : u + 1));
    }, 1500);
  };

  const onlineMembersCount = members.filter((m) => m.isOnline).length || members.length;

  return (
    <div className="fixed inset-0 z-50 flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-800">
      {/* 1. Thanh tiêu đề trên (Header chuẩn Miro / Figma Workspace) */}
      <header className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5 border-b border-slate-200 bg-white shrink-0 shadow-2xs">
        {/* Cụm bên trái */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onLeave}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
            title="Quay lại"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          </button>

          <h1 className="font-bold text-slate-900 text-base truncate">
            {room.name && !room.name.toLowerCase().startsWith("phòng ") ? room.name : "Phòng học nhóm"}
          </h1>

          {/* Badge Mã phòng tương tác: Click để Copy */}
          <button
            onClick={copyRoomCode}
            className="font-mono tabular-nums font-semibold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200/80 px-2.5 py-1 rounded-md hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0"
            title="Nhấn để sao chép mã phòng"
          >
            {copiedCode ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                <span className="text-emerald-700">Đã sao chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-600" strokeWidth={1.75} />
                <span>Mã: {room.code}</span>
              </>
            )}
          </button>

          {isHost && (
            <span className="hidden md:inline-flex rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
              Chủ phòng
            </span>
          )}

          {/* Cụm Avatar Stack & Đang học */}
          <button
            onClick={() => setMembersOpen(true)}
            className="hidden sm:flex items-center gap-2 hover:opacity-85 transition-opacity cursor-pointer ml-1 pl-1"
            title="Xem danh sách người trong phòng"
          >
            <div className="flex items-center">
              {members.slice(0, 3).map((m, idx) => {
                const initial = m.name ? m.name.charAt(0).toUpperCase() : "U";
                const bgColors = ["bg-sky-500", "bg-indigo-600", "bg-emerald-500", "bg-amber-500"];
                const bg = bgColors[idx % bgColors.length];
                return (
                  <div
                    key={m.id || idx}
                    className={`w-7 h-7 rounded-full border-2 border-white -ml-2 first:ml-0 ${bg} text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-2xs`}
                  >
                    {initial}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-medium text-slate-700">{onlineMembersCount} đang học</span>
            </div>
          </button>
        </div>

        {/* Cụm bên phải */}
        <div className="flex items-center gap-2 shrink-0">
          {isHost && (
            <button
              onClick={() => setPicker(true)}
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
              <span>{doc ? "Đổi tài liệu" : "Chọn tài liệu"}</span>
            </button>
          )}

          {/* Nút Ẩn/Mở chat */}
          <button
            onClick={() => setChatOpen((v) => !v)}
            className={`relative bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 h-9 px-3 rounded-lg text-sm font-medium flex items-center gap-2 cursor-pointer transition-colors shadow-2xs ${
              chatOpen ? "bg-slate-100 text-slate-900 border-slate-300" : ""
            }`}
          >
            <MessageSquare className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
            <span className="hidden sm:inline">{chatOpen ? "Ẩn chat" : "Mở chat"}</span>
            {!chatOpen && unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white tabular-nums">
                {unread}
              </span>
            )}
          </button>

          {/* Nút Rời phòng */}
          <button
            onClick={onLeave}
            className="bg-rose-50 text-rose-600 border border-rose-200/80 hover:bg-rose-600 hover:text-white h-9 px-3 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            <span>Rời phòng</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* 2 & 3. Vùng Trình chiếu Trung tâm (Main Canvas & Floating Toolbar) */}
        <main className="bg-[#F8FAFC] bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] relative flex-1 flex flex-col items-center justify-center p-6 overflow-hidden">
          {!doc ? (
            <>
              {/* Thẻ Empty State làm mới */}
              <div className="bg-white/95 backdrop-blur-xs border border-slate-200/90 shadow-sm rounded-2xl p-8 max-w-md w-full text-center relative z-1">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center relative">
                  <Presentation className="w-7 h-7 text-indigo-600" strokeWidth={1.75} />
                  <span className="w-3 h-3 bg-sky-500 rounded-full animate-ping absolute -top-1 -right-1" />
                  <span className="w-3 h-3 bg-sky-500 rounded-full absolute -top-1 -right-1" />
                </div>

                <h2 className="text-lg font-bold text-slate-900 mb-1">
                  Chủ phòng chưa chọn tài liệu
                </h2>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  Slide bài giảng và ghi chú nhóm sẽ tự động đồng bộ tại đây ngay khi buổi học bắt đầu.
                </p>

                <div className="flex flex-col items-center justify-center gap-2.5">
                  {isHost && (
                    <button
                      onClick={() => setPicker(true)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-4 py-2.5 rounded-lg text-sm inline-flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4" strokeWidth={2} />
                      <span>+ Chọn tài liệu trình chiếu</span>
                    </button>
                  )}

                  <button
                    onClick={copyRoomCode}
                    className="bg-slate-100 hover:bg-slate-200/70 text-slate-700 font-medium px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                        <span>Đã sao chép mã {room.code}!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                        <span>Sao chép mã phòng {room.code} để mời bạn</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 3. Thanh công cụ nổi (Floating Workspace Toolbar) khi chưa có tài liệu */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white border border-slate-200/90 shadow-md rounded-xl px-2 py-1.5 flex items-center gap-1 z-10">
                <button
                  disabled
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-50 cursor-not-allowed"
                  title="Sẽ mở khóa khi có Slide"
                >
                  <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <span className="font-mono text-xs px-2 text-slate-500 tabular-nums">-- / --</span>
                <button
                  disabled
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-50 cursor-not-allowed"
                  title="Sẽ mở khóa khi có Slide"
                >
                  <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                </button>

                <div className="h-4 w-[1px] bg-slate-200 mx-1" />

                <button
                  disabled
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-50 cursor-not-allowed"
                  title="Sẽ mở khóa khi có Slide"
                >
                  <Highlighter className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  disabled
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-50 cursor-not-allowed"
                  title="Sẽ mở khóa khi có Slide"
                >
                  <StickyNote className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  disabled
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-50 cursor-not-allowed"
                  title="Sẽ mở khóa khi có Slide"
                >
                  <Hand className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  disabled
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 opacity-50 cursor-not-allowed"
                  title="Sẽ mở khóa khi có Slide"
                >
                  <Maximize2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full relative">
              <div
                className="w-full flex-1 flex items-center justify-center max-h-[calc(100vh-140px)]"
                style={{ maxWidth: "min(100%, calc((100vh - 160px) * 16 / 9))" }}
              >
                <SlideStage
                  doc={doc}
                  index={index}
                  objs={objs}
                  onChange={setObjs}
                  canEdit={isHost}
                  tool={tool}
                  color={color}
                />
              </div>

              {/* Floating Workspace Toolbar khi đã có Slide */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-white border border-slate-200/90 shadow-md rounded-xl px-2 py-1.5 flex items-center gap-1 z-10 max-w-[95vw] overflow-x-auto">
                {isHost && (
                  <>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setTool("pen")}
                        title="Vẽ tự do"
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                          tool === "pen" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Pencil className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("line")}
                        title="Gạch chân"
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                          tool === "line" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Minus className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("ellipse")}
                        title="Khoanh tròn"
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                          tool === "ellipse" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Circle className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("arrow")}
                        title="Mũi tên"
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                          tool === "arrow" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <MoveUpRight className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("text")}
                        title="Viết chữ"
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                          tool === "text" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Type className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("eraser")}
                        title="Xóa nét"
                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs cursor-pointer transition-colors ${
                          tool === "eraser" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Eraser className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                    </div>

                    <div className="h-4 w-[1px] bg-slate-200 mx-1" />

                    {/* Color picker */}
                    <div className="flex items-center gap-1.5 px-1">
                      {COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setColor(c)}
                          aria-label={`Màu ${c}`}
                          className="h-4 w-4 rounded-full cursor-pointer transition-transform hover:scale-115"
                          style={{
                            background: c,
                            outline: color === c ? "2px solid #0f172a" : "1px solid rgba(0,0,0,0.15)",
                            outlineOffset: 1.5,
                          }}
                        />
                      ))}
                    </div>

                    <div className="h-4 w-[1px] bg-slate-200 mx-1" />

                    <button
                      onClick={() => setObjs(objs.slice(0, -1))}
                      disabled={!objs.length}
                      title="Hoàn tác"
                      className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    >
                      <Undo2 className="w-3.5 h-3.5 text-slate-500" strokeWidth={1.75} />
                      <span className="hidden sm:inline">Hoàn tác</span>
                    </button>
                    <button
                      onClick={() => setObjs([])}
                      disabled={!objs.length}
                      title="Xóa tất cả nét vẽ"
                      className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span className="hidden sm:inline">Xóa hết</span>
                    </button>

                    <div className="h-4 w-[1px] bg-slate-200 mx-1" />
                  </>
                )}

                {/* Điều hướng slide */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => go(index - 1)}
                    disabled={!isHost || index === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    title="Slide trước"
                  >
                    <ChevronLeft className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  <span className="px-2 text-xs font-medium font-mono tabular-nums text-slate-700">
                    {index + 1} / {doc.slides.length}
                  </span>
                  <button
                    onClick={() => go(index + 1)}
                    disabled={!isHost || index === doc.slides.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    title="Slide sau"
                  >
                    <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>

                <div className="h-4 w-[1px] bg-slate-200 mx-1" />

                {/* Các nút tương tác thêm của PeerMind */}
                <button
                  onClick={() => setTool("pen")}
                  title="Bút dạ quang (Highlighter)"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Highlighter className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => setTool("text")}
                  title="Ghi chú (StickyNote)"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <StickyNote className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => send("✋ [Giơ tay] Xin phát biểu!")}
                  title="Giơ tay phát biểu"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                >
                  <Hand className="w-4 h-4" strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => {
                    if (!document.fullscreenElement) {
                      document.documentElement.requestFullscreen?.();
                    } else {
                      document.exitFullscreen?.();
                    }
                  }}
                  title="Toàn màn hình"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </div>

              {!isHost && (
                <p className="absolute bottom-16 text-center text-xs text-slate-500 bg-white/80 backdrop-blur-xs px-3 py-1 rounded-full border border-slate-200 shadow-2xs pointer-events-none">
                  Bạn đang theo dõi bài trình bày của chủ phòng — slide và ghi chú vẽ đồng bộ theo thời gian thực.
                </p>
              )}
            </div>
          )}
        </main>

        {/* 4. Khung chat bên phải */}
        <ChatPanel
          open={chatOpen}
          msgs={msgs}
          members={members}
          onSend={send}
          onOpenMembers={() => setMembersOpen(true)}
        />
      </div>

      {picker && <DocPicker docs={docs} current={doc} onPick={pick} onClose={() => setPicker(false)} />}

      <MembersModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        members={members}
      />
    </div>
  );
}
