import { useState, useRef, useEffect, useCallback } from "react";
import { MembersModal, RoomMember } from "./MembersModal";

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

const TOOLS = [
  ["pen", "✎", "Vẽ tự do"],
  ["line", "＿", "Gạch chân"],
  ["ellipse", "◯", "Khoanh tròn"],
  ["arrow", "➚", "Mũi tên"],
  ["text", "T", "Viết chữ"],
  ["eraser", "⌫", "Xoá nét"],
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,.6)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full rounded-3xl p-6 shadow-2xl"
        style={{ maxWidth: 460, background: "#1e293b", color: "#fff" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Chọn tài liệu để trình bày</h2>
            <p className="mt-1 text-sm" style={{ color: "#cbd5e1" }}>
              Lấy từ kho tài liệu của bạn.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="text-xl leading-none cursor-pointer"
            style={{ color: "#cbd5e1" }}
          >
            ✕
          </button>
        </div>
        <ul className="mt-4 space-y-2">
          {docs.map((d) => (
            <li key={d.id}>
              <button
                onClick={() => onPick(d)}
                className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors cursor-pointer"
                style={{ background: current?.id === d.id ? "rgba(124,58,237,.35)" : "rgba(255,255,255,.07)" }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-xs"
                  style={{ background: d.color }}
                >
                  {d.title.slice(0, 1)}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{d.title}</span>
                  <span className="text-xs" style={{ color: "#cbd5e1" }}>
                    {d.slides.length} slide
                  </span>
                </span>
                {current?.id === d.id && (
                  <span className="text-xs font-medium" style={{ color: "#c4b5fd" }}>
                    Đang trình bày
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
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
      className="shrink-0 overflow-hidden transition-all duration-300"
      style={{ width: open ? 320 : 0 }}
      aria-hidden={!open}
    >
      <div className="flex h-full flex-col" style={{ width: 320, background: "#fff", borderLeft: "1px solid #e2e8f0" }}>
        {/* Header khung chat với nút bấm số lượng người */}
        <div
          className="flex items-center justify-between px-4 py-3 font-semibold"
          style={{ background: "#1e293b", color: "#fff" }}
        >
          <span>Trò chuyện</span>
          <button
            onClick={onOpenMembers}
            title="Xem danh sách người trong phòng"
            className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-white/20 hover:text-white transition-all cursor-pointer"
          >
            <span>👥</span>
            <span>{members.length} người</span>
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" title={`${onlineCount} đang online`} />
          </button>
        </div>

        {/* Nội dung tin nhắn */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ background: "#f8fafc" }}>
          {msgs.map((m, i) => (
            <div key={i} className={m.me ? "text-right" : ""}>
              {!m.me && <div className="mb-0.5 text-xs text-slate-400">{m.who}</div>}
              <span
                className="inline-block max-w-[85%] rounded-2xl px-3 py-2 text-left text-sm"
                style={m.me ? { background: "#7c3aed", color: "#fff" } : { background: "#fff", border: "1px solid #e2e8f0" }}
              >
                {m.text}
              </span>
            </div>
          ))}
          <div ref={end} />
        </div>

        {/* Form gửi tin nhắn */}
        <form onSubmit={submit} className="flex gap-2 border-t border-slate-200 bg-white p-3">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhắn cho cả phòng…"
            className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            className="rounded-full px-4 py-2 text-sm font-semibold text-white cursor-pointer"
            style={{ background: "#7c3aed" }}
          >
            Gửi
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

  const btn = { background: "rgba(255,255,255,.1)", color: "#fff" };

  return (
    <div className="fixed inset-0 z-50 flex h-screen flex-col overflow-hidden" style={{ background: "#334155", color: "#fff" }}>
      {/* Thanh tiêu đề trên */}
      <header
        className="flex items-center justify-between gap-3 px-5 py-3 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,.1)" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="font-semibold text-lg">{room.name}</h1>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-widest" style={btn}>
            Mã {room.code}
          </span>
          {isHost && (
            <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "#7c3aed" }}>
              Chủ phòng
            </span>
          )}

          {/* Nút bấm xem số lượng người ở Thanh Tiêu Đề */}
          <button
            onClick={() => setMembersOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/20 transition-all cursor-pointer"
            style={btn}
            title="Xem danh sách người trong phòng"
          >
            <span>👥</span>
            <span>{members.length} người</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isHost && (
            <button
              onClick={() => setPicker(true)}
              className="rounded-full px-4 py-2 text-sm font-semibold cursor-pointer transition-transform active:scale-95"
              style={{ background: "#7c3aed", color: "#fff" }}
            >
              {doc ? "Đổi tài liệu" : "Chọn tài liệu"}
            </button>
          )}
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="relative rounded-full px-4 py-2 text-sm font-semibold cursor-pointer"
            style={btn}
          >
            {chatOpen ? "Ẩn chat" : "Mở chat"}
            {!chatOpen && unread > 0 && (
              <span
                className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold"
                style={{ background: "#ef4444" }}
              >
                {unread}
              </span>
            )}
          </button>
          <button
            onClick={onLeave}
            className="rounded-full px-4 py-2 text-sm font-semibold hover:bg-white/20 transition-colors cursor-pointer"
            style={{ background: "rgba(255,255,255,.15)", color: "#fff" }}
          >
            Rời phòng
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Khu trình bày */}
        <main className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-4 sm:p-6">
          {!doc ? (
            <div className="text-center p-8 rounded-3xl" style={{ background: "rgba(255,255,255,0.05)" }}>
              <div className="text-6xl mb-2">📑</div>
              <p className="mt-3 text-xl font-semibold">
                {isHost ? "Chưa có tài liệu đang trình bày" : "Chủ phòng chưa chọn tài liệu"}
              </p>
              <p className="mt-2 text-sm max-w-md mx-auto" style={{ color: "#cbd5e1" }}>
                {isHost
                  ? "Chọn một tài liệu từ kho để bắt đầu trình bày cho cả phòng."
                  : "Slide sẽ hiện ở đây khi chủ phòng bắt đầu."}
              </p>
              {isHost && (
                <button
                  onClick={() => setPicker(true)}
                  className="mt-6 rounded-full px-6 py-3 text-sm font-semibold cursor-pointer transition-transform active:scale-95 shadow-lg"
                  style={{ background: "#7c3aed", color: "#fff" }}
                >
                  Chọn tài liệu để trình bày
                </button>
              )}
            </div>
          ) : (
            <div className="w-full" style={{ maxWidth: "min(100%, calc((100vh - 220px) * 16 / 9))" }}>
              <SlideStage
                doc={doc}
                index={index}
                objs={objs}
                onChange={setObjs}
                canEdit={isHost}
                tool={tool}
                color={color}
              />

              {/* Thanh công cụ + điều hướng */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                {isHost && (
                  <div className="flex items-center gap-1.5 rounded-full p-1.5 shadow-md" style={btn}>
                    {TOOLS.map(([id, icon, label]) => (
                      <button
                        key={id}
                        onClick={() => setTool(id)}
                        title={label}
                        aria-label={label}
                        aria-pressed={tool === id}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-base font-bold cursor-pointer transition-colors"
                        style={{ background: tool === id ? "#7c3aed" : "transparent", color: "#fff" }}
                      >
                        {icon}
                      </button>
                    ))}
                    <span className="mx-1 h-5 w-px" style={{ background: "rgba(255,255,255,.2)" }} />
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        aria-label={`Màu ${c}`}
                        className="h-6 w-6 rounded-full cursor-pointer transition-transform hover:scale-110"
                        style={{
                          background: c,
                          outline: color === c ? "2px solid #fff" : "2px solid transparent",
                          outlineOffset: 2,
                        }}
                      />
                    ))}
                    <span className="mx-1 h-5 w-px" style={{ background: "rgba(255,255,255,.2)" }} />
                    <button
                      onClick={() => setObjs(objs.slice(0, -1))}
                      disabled={!objs.length}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      style={{ color: "#fff" }}
                    >
                      ↶ Hoàn tác
                    </button>
                    <button
                      onClick={() => setObjs([])}
                      disabled={!objs.length}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                      style={{ color: "#fff" }}
                    >
                      Xoá hết
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-full p-1.5 shadow-md" style={btn}>
                  <button
                    onClick={() => go(index - 1)}
                    disabled={!isHost || index === 0}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-40 cursor-pointer"
                    style={{ color: "#fff" }}
                  >
                    ‹ Trước
                  </button>
                  <span className="px-2 text-sm font-semibold">
                    {index + 1} / {doc.slides.length}
                  </span>
                  <button
                    onClick={() => go(index + 1)}
                    disabled={!isHost || index === doc.slides.length - 1}
                    className="rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-40 cursor-pointer"
                    style={{ color: "#fff" }}
                  >
                    Sau ›
                  </button>
                </div>
              </div>
              {!isHost && (
                <p className="mt-2 text-center text-xs" style={{ color: "#cbd5e1" }}>
                  Bạn đang xem chủ phòng trình bày – slide và nét vẽ cập nhật theo thời gian thực.
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
