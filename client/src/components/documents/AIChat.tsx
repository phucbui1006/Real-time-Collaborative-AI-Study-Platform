// components/documents/AIChat.tsx — Khung chat với AI chuẩn Crisp Academic SaaS
import { useRef, useState, useEffect } from "react";
import { MessageSquare, X, Send, Bot, FileText, GitFork, HelpCircle, Settings, Sparkles, Key } from "lucide-react";
import { DocumentItem, ChatMessage, askAI } from "../../services/aiService";
import { hasGeminiApiKey } from "../../services/geminiClient";
import { AIKeyModal } from "./AIKeyModal";
import { MiniBarChart } from "./MiniBarChart";

type AIChatProps = {
  doc: DocumentItem | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export function AIChat({ doc, isOpen, onOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "Chào bạn! Mình là Trợ lý AI PeerMind. Mình có thể giải đáp chi tiết về tài liệu, tóm tắt bài giảng hoặc tạo nhanh bộ câu hỏi ôn tập giúp bạn.",
      isGemini: hasGeminiApiKey(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isGeminiReady, setIsGeminiReady] = useState(hasGeminiApiKey());
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsGeminiReady(hasGeminiApiKey());
  }, []);

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
    <>
      <aside className="lg:col-span-4 min-w-0 transition-all duration-300 h-full">
        <div className="sticky top-20 z-20 flex h-[calc(100vh-6.5rem)] min-h-[550px] flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs dark:shadow-2xl">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-sky-50/50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 px-4 py-3 shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Bot className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span>Trợ lý AI</span>
                  {isGeminiReady ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Gemini 2.0
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                      Dự phòng
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[11px]">
                  {doc ? (
                    <span className="inline-block max-w-[170px] truncate text-slate-600 dark:text-slate-300 font-medium">
                      {doc.title}
                    </span>
                  ) : (
                    <span className="text-slate-400">Chưa chọn tài liệu</span>
                  )}
                </div>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsKeyModalOpen(true)}
                className={`flex h-7 px-2 items-center gap-1 rounded-md text-xs transition-colors cursor-pointer ${
                  isGeminiReady
                    ? "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800"
                    : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800 hover:bg-amber-100"
                }`}
                title="Cài đặt Google Gemini API Key"
              >
                {isGeminiReady ? <Settings className="h-3.5 w-3.5" /> : <Key className="h-3.5 w-3.5" />}
                {!isGeminiReady && <span className="text-[10px] font-semibold">Cài Key</span>}
              </button>

              <button
                onClick={onClose}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                title="Thu gọn khung chat"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          </div>

          {/* Khung tin nhắn */}
          <div className="flex-1 space-y-3.5 overflow-y-auto bg-slate-50/40 dark:bg-slate-950/60 p-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white shadow-2xs font-normal"
                      : "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/60 shadow-2xs"
                  }`}
                >
                  {m.role === "ai" && m.isGemini && (
                    <div className="mb-1 flex items-center gap-1 text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Gemini AI</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{m.text}</div>
                  {m.chart && <MiniBarChart data={m.chart} />}
                </div>
              </div>
            ))}

            {/* Interactive Action Cards khi mới bắt đầu */}
            {messages.length === 1 && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                  Gợi ý nhanh cho tài liệu này:
                </p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => send("Tóm tắt nội dung chính của tài liệu này")}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800 transition-all text-left shadow-2xs cursor-pointer group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-500/30 shrink-0">
                      <FileText className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Tóm tắt tài liệu
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Trích xuất ý chính và công thức quan trọng
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => send("Vẽ biểu đồ tiến độ học của tôi")}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800 transition-all text-left shadow-2xs cursor-pointer group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 dark:bg-cyan-500/15 text-sky-600 dark:text-cyan-300 border border-sky-200/60 dark:border-cyan-500/30 shrink-0">
                      <GitFork className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Vẽ biểu đồ tiến độ
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Xem mức độ hoàn thành bài học dưới dạng biểu đồ
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => send("Tạo 5 câu hỏi ôn tập từ tài liệu này")}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800 transition-all text-left shadow-2xs cursor-pointer group"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30 shrink-0">
                      <HelpCircle className="h-4 w-4" strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        Tạo câu hỏi ôn tập
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        Khởi tạo bộ trắc nghiệm tự luyện tức thì
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-300 italic bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 w-fit shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                <span>AI đang đọc hiểu và phân tích tài liệu…</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Form Input */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                placeholder="Đặt câu hỏi cho AI về tài liệu…"
                className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs text-xs font-medium transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
                title="Gửi câu hỏi"
              >
                <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Modal Cài đặt API Key */}
      <AIKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        onKeyUpdated={() => setIsGeminiReady(hasGeminiApiKey())}
      />
    </>
  );
}
