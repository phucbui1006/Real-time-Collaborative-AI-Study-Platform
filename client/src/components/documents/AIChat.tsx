// components/documents/AIChat.tsx — Khung chat với AI chuẩn Crisp Academic SaaS
import { useRef, useState, useEffect } from "react";
import { MessageSquare, X, Send, Bot, FileText, GitFork, HelpCircle } from "lucide-react";
import { DocumentItem, ChatMessage, askAI } from "../../services/aiService";
import { MiniBarChart } from "./MiniBarChart";

type AIChatProps = {
  doc: DocumentItem | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function AIChat({ doc, isOpen, onOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "Chào Minh Anh! Mình là Trợ lý AI PeerMind. Mình có thể tóm tắt tài liệu, trực quan hóa biểu đồ tiến độ hoặc tạo câu hỏi ôn tập giúp bạn." },
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
          className="inline-flex items-center gap-2.5 rounded-full bg-indigo-600 px-4 py-2.5 text-white shadow-md hover:bg-indigo-700 transition-all cursor-pointer"
          title="Mở khung Trợ lý AI"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="font-medium text-sm">Hỏi Trợ lý AI</span>
          <MessageSquare className="h-4 w-4 text-white" strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  return (
    <aside className="lg:col-span-4 min-w-0 transition-all duration-300 h-full">
      <div className="sticky top-20 z-20 flex h-[calc(100vh-6.5rem)] min-h-[550px] flex-col overflow-hidden rounded-xl bg-white border border-slate-200/80 shadow-2xs">
        {/* Header - Redesigned to light gradient (Mục 5) */}
        <div className="bg-gradient-to-r from-indigo-50/80 via-sky-50/50 to-white px-4 py-3.5 shrink-0 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                <span>Trợ lý AI PeerMind</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" title="Sẵn sàng" />
              </div>
              <div className="mt-0.5 truncate text-xs">
                {doc ? (
                  <span className="inline-block max-w-[200px] truncate bg-white border border-slate-200 text-indigo-600 text-[11px] font-medium px-2 py-0.5 rounded-md">
                    Đang xem: {doc.title}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">Chưa chọn tài liệu</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            title="Thu gọn khung chat"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Khung tin nhắn */}
        <div className="flex-1 space-y-3.5 overflow-y-auto bg-slate-50/40 p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={`max-w-[88%] rounded-lg px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-950 text-white shadow-2xs font-normal"
                    : "bg-white text-slate-800 border border-slate-200/90 shadow-2xs"
                }`}
              >
                {m.text}
                {m.chart && <MiniBarChart data={m.chart} />}
              </div>
            </div>
          ))}

          {/* Interactive Action Cards khi mới bắt đầu hoặc giữa khung chat */}
          {messages.length === 1 && (
            <div className="pt-2 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
                Gợi ý nhanh cho tài liệu này:
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => send("Tóm tắt nội dung chính của tài liệu này")}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-left shadow-2xs cursor-pointer group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 text-purple-600 border border-purple-200/60 shrink-0">
                    <FileText className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Tóm tắt tài liệu
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Trích xuất ý chính và công thức quan trọng
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => send("Vẽ biểu đồ tiến độ học của tôi")}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-left shadow-2xs cursor-pointer group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 text-sky-600 border border-sky-200/60 shrink-0">
                    <GitFork className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Vẽ biểu đồ tiến độ
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Xem mức độ hoàn thành bài học dưới dạng biểu đồ
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => send("Tạo 5 câu hỏi ôn tập từ tài liệu này")}
                  className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/90 bg-white hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-left shadow-2xs cursor-pointer group"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 text-amber-600 border border-amber-200/60 shrink-0">
                    <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Tạo câu hỏi ôn tập
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Khởi tạo bộ trắc nghiệm tự luyện tức thì
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic bg-white p-2 rounded-md border border-slate-200/80 w-fit">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
              AI đang nghiên cứu tài liệu…
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Form Input */}
        <div className="border-t border-slate-200 bg-white p-3 shrink-0">
          <div className="flex items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Đặt câu hỏi cho AI về tài liệu…"
              className="flex-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="inline-flex items-center justify-center h-9 px-3.5 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs text-xs font-medium transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
              title="Gửi câu hỏi"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
