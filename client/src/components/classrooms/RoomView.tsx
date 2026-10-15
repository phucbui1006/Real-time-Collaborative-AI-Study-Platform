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
export type ChatMsg = { who?: string; text: string; me?: boolean };

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

  const onlineCount = members.filter((m) => m.isOnline).length;

  return (
    <aside
      className="shrink-0 overflow-hidden transition-all duration-300 border-l border-slate-200 bg-white"
      style={{ width: open ? 320 : 0 }}
      aria-hidden={!open}
    >
      <div className="flex h-full flex-col w-[320px]">
        {/* Header khung chat */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-slate-700" strokeWidth={1.75} />
            <span className="text-xs font-semibold text-slate-900 tracking-tight">Trò chuyện</span>
          </div>
          <button
            onClick={onOpenMembers}
            title="Xem danh sách người trong phòng"
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-slate-200 bg-white text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
          >
            <Users className="h-3 w-3 text-slate-500" strokeWidth={1.75} />
            <span className="font-mono tabular-nums">{members.length}</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" title={`${onlineCount} đang online`} />
          </button>
        </div>

        {/* Nội dung tin nhắn */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4 bg-slate-50/50">
          {msgs.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Chưa có tin nhắn nào. Hãy gửi lời chào!
            </div>
          ) : (
            msgs.map((m, i) => (
              <div key={i} className={m.me ? "text-right" : "text-left"}>
                {!m.me && (
                  <div className="mb-1 text-[11px] font-medium text-slate-500">{m.who}</div>
                )}
                <span
                  className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                    m.me
                      ? "bg-indigo-950 text-white font-normal"
                      : "bg-white text-slate-800 border border-slate-200/90 shadow-2xs"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            ))
          )}
          <div ref={end} />
        </div>

        {/* Form gửi tin nhắn */}
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-200 bg-white p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhắn tin trong phòng…"
            className="flex-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="inline-flex items-center justify-center h-9 w-9 rounded-md bg-indigo-950 text-white hover:bg-indigo-900 transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
            aria-label="Gửi tin nhắn"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
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
  const [msgs, setMsgs] = useState<ChatMsg[]>([{ who: "Hà My", text: "Chào cả nhóm, mình vào rồi nhé!" }]);
  const [membersOpen, setMembersOpen] = useState(false);

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
    setMsgs((m) => [...m, { me: true, text }]);
    setTimeout(() => {
      setMsgs((m) => [...m, { who: "Hà My", text: "Mình đã nhận được 👍" }]);
      setUnread((u) => (chatOpen ? 0 : u + 1));
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex h-screen flex-col overflow-hidden bg-slate-100 text-slate-800">
      {/* Thanh tiêu đề trên (Header chuẩn Crisp Academic SaaS) */}
      <header className="flex h-14 items-center justify-between gap-3 px-5 border-b border-slate-200 bg-white shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-semibold text-sm text-slate-900 truncate">{room.name}</h1>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider text-slate-700 bg-slate-100 border border-slate-200 tabular-nums">
            {room.code}
          </span>
          {isHost && (
            <span className="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Chủ phòng
            </span>
          )}

          {/* Nút bấm xem số lượng người */}
          <button
            onClick={() => setMembersOpen(true)}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            title="Xem danh sách người trong phòng"
          >
            <Users className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
            <span className="font-mono tabular-nums">{members.length} thành viên</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => setPicker(true)}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            >
              <FileText className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
              <span>{doc ? "Đổi tài liệu" : "Chọn tài liệu"}</span>
            </button>
          )}
          <button
            onClick={() => setChatOpen((v) => !v)}
            className={`relative inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs font-medium transition-colors cursor-pointer shadow-2xs ${
              chatOpen
                ? "bg-slate-100 text-slate-900 border-slate-300"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
            <span>{chatOpen ? "Ẩn chat" : "Trò chuyện"}</span>
            {!chatOpen && unread > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white tabular-nums">
                {unread}
              </span>
            )}
          </button>
          <button
            onClick={onLeave}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer shadow-2xs"
          >
            <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Rời phòng</span>
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Khu trình bày */}
        <main className="relative flex min-w-0 flex-1 flex-col items-center justify-center overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA]">
          {!doc ? (
            <div className="w-full max-w-md rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-2xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                <FileText className="h-6 w-6 text-slate-600" strokeWidth={1.75} />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900 tracking-tight">
                {isHost ? "Chưa chọn tài liệu trình bày" : "Chủ phòng chưa chọn tài liệu"}
              </h2>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                {isHost
                  ? "Chọn một tài liệu từ kho để bắt đầu trình chiếu và cùng thảo luận với các thành viên."
                  : "Slide trình bày sẽ hiển thị tại đây khi chủ phòng bắt đầu."}
              </p>
              {isHost && (
                <button
                  onClick={() => setPicker(true)}
                  className="mt-5 inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-indigo-950 text-white hover:bg-indigo-900 text-xs font-medium transition-all cursor-pointer shadow-xs active:translate-y-[1px]"
                >
                  <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                  <span>Chọn tài liệu trình bày</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full">
              <div className="w-full flex-1 flex items-center justify-center max-h-[calc(100vh-140px)]" style={{ maxWidth: "min(100%, calc((100vh - 160px) * 16 / 9))" }}>
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

              {/* Floating Bottom Toolbar chuẩn UI_DESIGN_SKILL.md Mục 6 */}
              <div className="mt-3 flex items-center gap-2 bg-white border border-slate-200/90 shadow-md rounded-lg p-1.5 shrink-0">
                {isHost && (
                  <>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => setTool("pen")}
                        title="Vẽ tự do"
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs cursor-pointer transition-colors ${
                          tool === "pen" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("line")}
                        title="Gạch chân"
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs cursor-pointer transition-colors ${
                          tool === "line" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("ellipse")}
                        title="Khoanh tròn"
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs cursor-pointer transition-colors ${
                          tool === "ellipse" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Circle className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("arrow")}
                        title="Mũi tên"
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs cursor-pointer transition-colors ${
                          tool === "arrow" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <MoveUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("text")}
                        title="Viết chữ"
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs cursor-pointer transition-colors ${
                          tool === "text" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Type className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                      <button
                        onClick={() => setTool("eraser")}
                        title="Xóa nét"
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-xs cursor-pointer transition-colors ${
                          tool === "eraser" ? "bg-indigo-950 text-white" : "text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        <Eraser className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </button>
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-1" />

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

                    <div className="h-4 w-px bg-slate-200 mx-1" />

                    <button
                      onClick={() => setObjs(objs.slice(0, -1))}
                      disabled={!objs.length}
                      title="Hoàn tác"
                      className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    >
                      <Undo2 className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
                      <span className="hidden sm:inline">Hoàn tác</span>
                    </button>
                    <button
                      onClick={() => setObjs([])}
                      disabled={!objs.length}
                      title="Xóa tất cả nét vẽ"
                      className="inline-flex items-center gap-1 h-8 px-2 rounded-md text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span className="hidden sm:inline">Xóa hết</span>
                    </button>

                    <div className="h-4 w-px bg-slate-200 mx-1" />
                  </>
                )}

                {/* Điều hướng slide */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => go(index - 1)}
                    disabled={!isHost || index === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    title="Slide trước"
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                  <span className="px-2 text-xs font-medium font-mono tabular-nums text-slate-700">
                    {index + 1} / {doc.slides.length}
                  </span>
                  <button
                    onClick={() => go(index + 1)}
                    disabled={!isHost || index === doc.slides.length - 1}
                    className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none cursor-pointer transition-colors"
                    title="Slide sau"
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {!isHost && (
                <p className="mt-2 text-center text-xs text-slate-500">
                  Bạn đang theo dõi bài trình bày của chủ phòng — slide và ghi chú vẽ đồng bộ theo thời gian thực.
                </p>
              )}
            </div>
          )}
        </main>

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
