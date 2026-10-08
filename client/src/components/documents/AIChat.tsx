// components/documents/AIChat.tsx — Khung chat với AI (Cột 4/10)
import { useRef, useState, useEffect } from "react";
import { DocumentItem, ChatMessage, SUGGESTIONS, askAI } from "../../services/aiService";
import { MiniBarChart } from "./MiniBarChart";

export function AIChat({ doc }: { doc: DocumentItem | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Chào Minh Anh! Mình có thể tóm tắt, vẽ biểu đồ hoặc trả lời câu hỏi về tài liệu của bạn." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

  return (
    <aside className="lg:col-span-4 min-w-0">
      <div className="sticky top-24 flex h-[calc(100vh-8rem)] min-h-[550px] flex-col overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-slate-200">
        {/* Header */}
        <div className="bg-[#141a3d] px-5 py-4 text-white shrink-0">
          <div className="font-semibold flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Trợ lý AI
          </div>
          <div className="mt-1 truncate text-xs text-slate-300">
            {doc ? `Đang hỏi về: ${doc.title}` : "Chưa chọn tài liệu"}
          </div>
        </div>

        {/* Tin nhắn */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === "user" ? "bg-violet-600 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200 shadow-xs"
                }`}
              >
                {m.text}
                {m.chart && <MiniBarChart data={m.chart} />}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-400 italic">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce" />
              AI đang trả lời…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Gợi ý nhanh + ô nhập */}
        <div className="border-t border-slate-200 bg-white p-3 shrink-0">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s.label}
                onClick={() => send(s.prompt)}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-violet-100 hover:text-violet-700 cursor-pointer"
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
              className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40 hover:bg-violet-700 cursor-pointer"
            >
              Gửi
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
