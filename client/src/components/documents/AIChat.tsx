// components/documents/AIChat.tsx — Khung chat với AI chuẩn Crisp Academic SaaS
import { useRef, useState, useEffect } from "react";

import { MessageSquare, X, Send, Bot } from "lucide-react";
import { DocumentItem, ChatMessage, SUGGESTIONS, askAI } from "../../services/aiService";
import { MiniBarChart } from "./MiniBarChart";

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
          className="inline-flex items-center gap-2.5 rounded-md bg-indigo-950 px-4 py-2.5 text-white shadow-xs border border-indigo-900/50 hover:bg-indigo-900 transition-colors duration-150 cursor-pointer"
          title="Mở khung Trợ lý AI"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-medium text-sm">Hỏi Trợ lý AI</span>
          <MessageSquare className="h-4 w-4 text-slate-300" strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  return (
    <aside className="lg:col-span-4 min-w-0 transition-all duration-300 h-full">
      <div className="sticky top-20 z-20 flex h-[calc(100vh-6.5rem)] min-h-[550px] flex-col overflow-hidden rounded-lg bg-white border border-slate-200/80 shadow-2xs">
        {/* Header */}
        <div className="bg-slate-900 px-4 py-3 text-white shrink-0 flex items-center justify-between border-b border-slate-800">
          <div className="min-w-0">
            <div className="font-semibold text-sm flex items-center gap-2">
              <Bot className="h-4 w-4 text-indigo-400" strokeWidth={1.75} />
              Trợ lý AI PeerMind
            </div>
            <div className="mt-0.5 truncate text-xs text-slate-400">
              {doc ? `Đang xem: ${doc.title}` : "Chưa chọn tài liệu"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Thu gọn khung chat"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Khung tin nhắn */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[88%] rounded-md px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-950 text-white border border-indigo-900/50 shadow-2xs"
                    : "bg-white text-slate-800 border border-slate-200/80 shadow-2xs"
                }`}
              >
                {m.text}
                {m.chart && <MiniBarChart data={m.chart} />}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-ping" />
              AI đang nghiên cứu tài liệu…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Gợi ý nhanh & Input */}
        <div className="border-t border-slate-200 bg-white p-3 shrink-0 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.prompt)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
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
              className="flex-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-md bg-indigo-950 text-white hover:bg-indigo-900 border border-indigo-900/50 shadow-xs text-sm font-medium transition-colors disabled:opacity-40 cursor-pointer shrink-0"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
