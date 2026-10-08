// components/documents/AIChat.tsx — Khung chat với AI (Hỗ trợ thu gọn / mở rộng)
import { useRef, useState, useEffect } from "react";
import { DocumentItem, ChatMessage, SUGGESTIONS, askAI } from "../../services/aiService";
import { MiniBarChart } from "./MiniBarChart";
import { Icon } from "../common/Icon";

type AIChatProps = {
  doc: DocumentItem | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function AIChat({ doc, isOpen, onOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Chào Minh Anh! Mình có thể tóm tắt, vẽ biểu đồ hoặc giải đáp thắc mắc về tài liệu của bạn." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading, isOpen]);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || loading) return;
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setInput("");
    setLoading(true);
    try {
      const reply = await askAI(prompt, doc);
      setMessages((m) => [...m, { role: "ai", ...reply }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Không gửi được câu hỏi. Hãy thử lại." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={onOpen}
          className="group flex items-center gap-3 rounded-full bg-[#17204d] p-3.5 text-white shadow-2xl ring-4 ring-violet-500/20 transition-all hover:bg-violet-700 hover:scale-105 cursor-pointer"
          title="Mở khung Trợ lý AI"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="font-bold text-sm pr-1">Hỏi Trợ lý AI</span>
          <Icon className="h-5 w-5 text-violet-300">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </Icon>
        </button>
      </div>
    );
  }

  return (
    <aside className="lg:col-span-4 min-w-0 transition-all duration-300 h-full">
      <div className="sticky top-24 z-20 flex h-[calc(100vh-7.5rem)] min-h-[550px] flex-col overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-slate-200/80">
        {/* Header */}
        <div className="bg-[#17204d] px-5 py-4 text-white shrink-0 flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-bold text-sm flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              Trợ lý AI PeerMind
            </div>
            <div className="mt-1 truncate text-xs text-slate-300">
              {doc ? `Đang xem: ${doc.title}` : "Chưa chọn tài liệu"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition cursor-pointer"
            title="Thu gọn khung chat"
          >
            <Icon className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </Icon>
          </button>
        </div>

        {/* Khung tin nhắn */}
        <div className="flex-1 space-y-3.5 overflow-y-auto bg-slate-50/70 p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xs"
                    : "bg-white text-slate-800 ring-1 ring-slate-200/80 shadow-xs"
                }`}
              >
                {m.text}
                {m.chart && <MiniBarChart data={m.chart} />}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <span className="h-2 w-2 rounded-full bg-violet-500 animate-ping" />
              AI đang nghiên cứu tài liệu…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Gợi ý nhanh & Input */}
        <div className="border-t border-slate-200/80 bg-white p-3.5 shrink-0 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.prompt)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-violet-100 hover:text-violet-700 cursor-pointer"
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Đặt câu hỏi cho AI…"
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-200"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="rounded-full bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:opacity-40 hover:bg-violet-700 cursor-pointer shrink-0"
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
