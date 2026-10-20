// components/documents/AIChat.tsx — Khung chat AI đa năng hỗ trợ Phóng to / Thu nhỏ & Drag resize
import { useRef, useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  FileText,
  HelpCircle,
  Sparkles,
  Network,
  Compass,
  Minus,
  Maximize2,
  Minimize2,
  ChevronUp,
  ChevronDown,
  Square,
} from "lucide-react";
import { DocumentItem, ChatMessage, askAI } from "../../services/aiService";
import { hasGeminiApiKey } from "../../services/geminiClient";
import { MiniBarChart } from "./MiniBarChart";

type AIChatProps = {
  doc: DocumentItem | null;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export type ChatSizeMode = "normal" | "expanded" | "minimized";

/**
 * Component hiển thị tin nhắn AI chuẩn định dạng Markdown & Công thức toán học KaTeX / LaTeX
 */
function FormattedAIMessage({ text }: { text: string }) {
  // Tiền xử lý văn bản:
  // 1. Chuyển đổi toàn diện các ký hiệu chữ Hy Lạp (kể cả có backslash hoặc không có backslash) sang ký hiệu Unicode chuẩn (α, β, γ, θ, φ, π...)
  //    QUAN TRỌNG: Khớp cả dấu gạch chéo ngược "\" nếu có (\\?alpha) để tránh để lại "\" biến thành "\α", "\θ", "\φ" khiến KaTeX báo lỗi đỏ
  // 2. Chuyển đổi dấu nhân sao (*) giữa các biến số lượng giác thành dấu nhân toán học (·) để tránh bị Markdown hiểu lầm thành chữ in nghiêng
  // 3. Chuẩn hóa các ký hiệu toán học phổ thông
  const normalized = text
    .replace(/([a-zA-Z0-9])\s*\*\s*cos/g, "$1 · cos")
    .replace(/([a-zA-Z0-9])\s*\*\s*sin/g, "$1 · sin")
    .replace(/\\?alpha\b/gi, "α")
    .replace(/\\?beta\b/gi, "β")
    .replace(/\\?gamma\b/gi, "γ")
    .replace(/\\?theta\b/gi, "θ")
    .replace(/\\?(?:phi|varphi)\b/gi, "φ")
    .replace(/(?:\\pi|\bpi\b)/gi, "π")
    .replace(/\\?lambda\b/gi, "λ")
    .replace(/\\?omega\b/gi, "ω")
    .replace(/\\?Delta\b/g, "Δ")
    .replace(/\\?delta\b/g, "δ")
    .replace(/\\?sigma\b/gi, "σ")
    .replace(/\\text\{cm\}\^2/g, "cm²")
    .replace(/\\text\{m\}\^2/g, "m²")
    .replace(/\\div\b/g, "÷")
    .replace(/\\neq\b/g, "≠")
    .replace(/\\leq\b/g, "≤")
    .replace(/\\geq\b/g, "≥")
    .replace(/\\infty\b/g, "∞")
    .replace(/\\pm\b/g, "±")
    .replace(/(\\rightarrow|\\to)\b/g, "→");

  return (
    <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={{
          h1: ({ children }) => (
            <h4 className="font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-300 mt-3 mb-1">
              {children}
            </h4>
          ),
          h2: ({ children }) => (
            <h4 className="font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-300 mt-3 mb-1">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h4 className="font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-300 mt-3 mb-1">
              {children}
            </h4>
          ),
          h4: ({ children }) => (
            <h4 className="font-bold text-xs sm:text-sm text-indigo-600 dark:text-indigo-300 mt-3 mb-1">
              {children}
            </h4>
          ),
          p: ({ children }) => <p className="my-1.5 leading-relaxed">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-900 dark:text-white">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-4 space-y-1 my-1.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-4 space-y-1 my-1.5">{children}</ol>
          ),
          li: ({ children }) => <li className="my-0.5 leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <div className="my-2.5 rounded-xl border border-indigo-200/80 dark:border-indigo-800/80 bg-gradient-to-r from-indigo-50/80 via-sky-50/40 to-white dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-slate-900 p-2.5 text-indigo-950 dark:text-indigo-200 font-mono text-xs shadow-2xs">
              {children}
            </div>
          ),
          code: ({ children }) => (
            <code className="rounded bg-indigo-50 dark:bg-indigo-950/80 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl bg-slate-900 text-slate-100 p-3 my-2 text-[11px] font-mono leading-relaxed">
              {children}
            </pre>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

export function AIChat({ doc, isOpen, onOpen, onClose }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "Chào bạn nha! Mình là Trợ lý AI PeerMind 😊. Bạn có thể hỏi mình bất kỳ điều gì: từ công thức toán học, hình học, viết code lập trình, tiếng Anh, mẹo học tập... cho đến tóm tắt bài giảng hay vẽ sơ đồ tư duy nhé! Cần mình trợ giúp gì cứ nhắn ngay nha! ✨",
      isGemini: hasGeminiApiKey(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingStatus, setThinkingStatus] = useState("Đang phân tích ý định...");
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isAbortedRef = useRef(false);
  const isGeminiReady = hasGeminiApiKey();
  const endRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const touchStartYRef = useRef(0);

  // 3 Chế độ kích thước: 'normal' | 'expanded' | 'minimized'
  const [chatSizeMode, setChatSizeMode] = useState<ChatSizeMode>("normal");
  // Cho phép kéo cạnh trái chỉnh chiều rộng tùy ý (từ 380px đến 820px)
  const [customWidth, setCustomWidth] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Dọn dẹp timer khi unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  // Luân phiên thay đổi dòng trạng thái khi AI đang suy nghĩ
  useEffect(() => {
    if (!loading) return;
    const statuses = [
      "Đang phân tích ý định...",
      "Đang tra cứu cơ sở tri thức...",
      "Đang chuẩn bị câu trả lời...",
    ];
    let idx = 0;
    setThinkingStatus(statuses[0]);
    const timer = setInterval(() => {
      idx = (idx + 1) % statuses.length;
      setThinkingStatus(statuses[idx]);
    }, 750);
    return () => clearInterval(timer);
  }, [loading]);

  // 1. PHÁT HIỆN NGƯỜI DÙNG CUỘN LÊN ĐỂ NHẢ KHÓA AUTO-SCROLL (SMART SCROLL LOCK)
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    // Nếu cách đáy hơn 60px: người dùng đã chủ động cuộn lên trên
    if (distanceFromBottom > 60) {
      shouldAutoScrollRef.current = false;
      setShowScrollBottomBtn(true);
    } else if (distanceFromBottom <= 40) {
      // Nếu đã cuộn trở lại sát đáy (<= 40px)
      shouldAutoScrollRef.current = true;
      setShowScrollBottomBtn(false);
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Khi người dùng lăn chuột lên (deltaY < 0), ngắt tức thì auto-scroll
    if (e.deltaY < 0) {
      shouldAutoScrollRef.current = false;
      setShowScrollBottomBtn(true);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Khi vuốt kéo xuống xem tin nhắn cũ phía trên
    if (e.touches[0].clientY > touchStartYRef.current + 5) {
      shouldAutoScrollRef.current = false;
      setShowScrollBottomBtn(true);
    }
  };

  // Cuộn xuống đáy có kiểm soát
  const scrollToBottom = (force = false) => {
    if (force) {
      shouldAutoScrollRef.current = true;
      setShowScrollBottomBtn(false);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    // Nếu người dùng đang cuộn lên đọc bài, TUYỆT ĐỐI KHÔNG can thiệp kéo xuống
    if (!shouldAutoScrollRef.current) return;

    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  // Chỉ cuộn khi mở khung chat hoặc thêm tin nhắn mới (không re-trigger liên tục khi đang gõ từng ký tự)
  useEffect(() => {
    if (isOpen && chatSizeMode !== "minimized" && !isTyping) {
      scrollToBottom(false);
    }
  }, [messages.length, loading, isOpen, chatSizeMode]);

  // 4. DỪNG TẠO CÂU TRẢ LỜI (STOP GENERATING)
  const handleStopGenerating = () => {
    isAbortedRef.current = true;
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    setIsTyping(false);
    setLoading(false);
  };

  // Logic kéo mép trái để tùy chỉnh chiều rộng
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const startX = e.clientX;
    const initialWidth =
      chatContainerRef.current?.getBoundingClientRect().width ||
      (chatSizeMode === "expanded" ? 740 : 450);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      // Vì khung neo ở mép phải màn hình, kéo sang trái (startX - moveX > 0) sẽ làm tăng chiều rộng
      const deltaX = startX - moveEvent.clientX;
      const newWidth = Math.min(820, Math.max(380, initialWidth + deltaX));
      setCustomWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || loading || isTyping) return;
    const newHistory = [...messages, { role: "user" as const, text: prompt }];
    setMessages(newHistory);
    setInput("");
    setLoading(true);
    isAbortedRef.current = false;

    // Reset cờ cuộn khi người dùng gửi tin nhắn mới và cuộn xuống đáy 1 lần
    shouldAutoScrollRef.current = true;
    setShowScrollBottomBtn(false);
    setTimeout(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }, 50);

    const startTime = Date.now();
    try {
      const reply = await askAI(prompt, doc, newHistory);
      if (isAbortedRef.current) return;

      // 1. HIỆU ỨNG ĐANG SUY NGHĨ: giữ tối thiểu 1.6 giây
      const elapsed = Date.now() - startTime;
      const minWait = 1600;
      if (elapsed < minWait) {
        await new Promise((r) => setTimeout(r, minWait - elapsed));
      }
      if (isAbortedRef.current) return;

      setLoading(false);
      setIsTyping(true);

      // 2. HIỆU ỨNG GÕ CHỮ TỪNG KÝ TỰ (TYPEWRITER / STREAMING EFFECT)
      const aiMsgIndex = newHistory.length;
      const initialAiMsg: ChatMessage = {
        role: "ai",
        text: "",
        isGemini: reply.isGemini,
        chart: reply.chart,
      };
      setMessages((prev) => [...prev, initialAiMsg]);

      const fullText = reply.text || "";
      const totalLength = fullText.length;
      let currentIndex = 0;

      // Tốc độ khoảng 25-35ms mỗi bước:
      // Tùy theo độ dài chuỗi mà điều chỉnh bước nhảy để mượt mà và không bắt người dùng đợi quá lâu
      const step = totalLength > 800 ? 5 : totalLength > 400 ? 3 : 2;
      const delay = 28;

      await new Promise<void>((resolve) => {
        const timer = setInterval(() => {
          if (isAbortedRef.current) {
            clearInterval(timer);
            typingTimerRef.current = null;
            resolve();
            return;
          }

          currentIndex = Math.min(totalLength, currentIndex + step);
          const currentSlice = fullText.slice(0, currentIndex);

          setMessages((prev) => {
            const updated = [...prev];
            if (updated[aiMsgIndex]) {
              updated[aiMsgIndex] = {
                ...updated[aiMsgIndex],
                text: currentSlice,
              };
            }
            return updated;
          });

          // Chỉ tự động cập nhật vị trí cuộn khi shouldAutoScrollRef.current === true
          // KHÔNG dùng scrollIntoView smooth trong vòng lặp typewriter
          if (shouldAutoScrollRef.current && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }

          if (currentIndex >= totalLength) {
            clearInterval(timer);
            typingTimerRef.current = null;
            resolve();
          }
        }, delay);

        typingTimerRef.current = timer;
      });
    } catch {
      if (!isAbortedRef.current) {
        setLoading(false);
        setMessages((m) => [...m, { role: "ai", text: "Mình đang bị nghẽn mạng xíu, bạn nhắn lại với mình nha! 😊" }]);
      }
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  // Nút mở dạng Pill Button tròn khi đóng hoàn toàn
  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={onOpen}
          className="inline-flex items-center gap-2.5 rounded-full bg-indigo-600 px-4 py-2.5 text-white shadow-lg hover:bg-indigo-700 transition-all cursor-pointer hover:scale-105 active:scale-95"
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

  // Xác định chiều rộng & chiều cao theo từng chế độ
  const getContainerSizeClasses = () => {
    if (chatSizeMode === "minimized") {
      return "w-[300px] h-14 rounded-2xl shadow-lg cursor-pointer";
    }
    if (chatSizeMode === "expanded") {
      return `${customWidth ? "" : "w-[680px] lg:w-[740px]"} h-[82vh] max-w-[95vw] rounded-2xl shadow-2xl`;
    }
    // Normal mode: cân đối chiều cao và chiều rộng
    return `${customWidth ? "" : "w-[430px] sm:w-[450px]"} h-[580px] max-h-[75vh] max-w-[92vw] rounded-2xl shadow-2xl`;
  };

  return (
    <div
      ref={chatContainerRef}
      style={
        customWidth && chatSizeMode !== "minimized"
          ? { width: `${customWidth}px` }
          : undefined
      }
      className={`fixed bottom-6 right-6 z-40 flex flex-col overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 ${getContainerSizeClasses()} ${
        isDragging ? "" : "transition-all duration-300 ease-in-out"
      }`}
    >
      {/* 3. Dải kéo vô hình ở cạnh trái để tự do chỉnh độ rộng (Chỉ hiện khi không thu nhỏ) */}
      {chatSizeMode !== "minimized" && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-indigo-500/40 active:bg-indigo-600/50 transition-colors z-50 flex items-center justify-center group"
          title="Nhấn giữ và kéo sang trái/phải để tinh chỉnh độ rộng khung chat"
        >
          <div className="w-0.5 h-7 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-indigo-500 transition-colors" />
        </div>
      )}

      {/* HEADER: Tiêu đề, Trạng thái & Cụm nút Phóng to / Thu nhỏ / Đóng */}
      <div
        onClick={() => chatSizeMode === "minimized" && setChatSizeMode("normal")}
        className={`bg-gradient-to-r from-indigo-50/80 via-sky-50/50 to-white dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40 px-3.5 py-3 shrink-0 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 ${
          chatSizeMode === "minimized" ? "h-full select-none" : ""
        }`}
      >
        {/* Khối thông tin Trợ lý & Tài liệu */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Bot className="h-4 w-4" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Trợ lý AI</span>
              {loading ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  Đang suy nghĩ...
                </span>
              ) : isTyping ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                  Đang trả lời...
                </span>
              ) : isGeminiReady ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Gemini Flash
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  Sẵn sàng
                </span>
              )}
            </div>
            <div className="mt-0.5 truncate text-[11px]">
              {doc ? (
                <span className="inline-block max-w-[190px] truncate text-slate-600 dark:text-slate-300 font-medium">
                  📖 {doc.title}
                </span>
              ) : (
                <span className="text-slate-400">Trợ lý học tập đa năng</span>
              )}
            </div>
          </div>
        </div>

        {/* 2. CỤM NÚT ĐIỀU KHIỂN TRÊN HEADER */}
        <div className="flex items-center gap-0.5 shrink-0 ml-1.5">
          {/* Nút 1: Thu gọn / Mở lại (Minus / ChevronUp) */}
          {chatSizeMode === "minimized" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setChatSizeMode("normal");
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Mở lại khung chat"
            >
              <ChevronUp className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setChatSizeMode("minimized");
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Thu gọn khung chat"
            >
              <Minus className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}

          {/* Nút 2: Phóng to / Thu nhỏ kích thước (Maximize2 / Minimize2) */}
          {chatSizeMode === "expanded" ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCustomWidth(null);
                setChatSizeMode("normal");
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Thu nhỏ về mặc định"
            >
              <Minimize2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCustomWidth(null);
                setChatSizeMode("expanded");
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
              title="Phóng to khung chat"
            >
              <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}

          {/* Nút 3: Đóng khung chat (X) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Đóng khung chat"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* THÂN TIN NHẮN & Ô NHẬP LIỆU (Ẩn khi ở chế độ 'minimized') */}
      {chatSizeMode !== "minimized" && (
        <>
          {/* Khung tin nhắn cuộn mượt */}
          <div className="relative flex-1 min-h-0 flex flex-col">
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              className="flex-1 space-y-3.5 overflow-y-auto bg-slate-50/40 dark:bg-slate-950/60 p-4 min-h-0"
            >
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white shadow-2xs font-normal whitespace-pre-wrap"
                        : "bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/60 shadow-2xs"
                    }`}
                  >
                    {m.role === "ai" && m.isGemini && (
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Gemini Flash</span>
                      </div>
                    )}

                    {m.role === "user" ? (
                      <div>{m.text}</div>
                    ) : (
                      <div>
                        <FormattedAIMessage text={m.text} />
                        {isTyping && i === messages.length - 1 && (
                          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-indigo-500 animate-pulse align-middle" />
                        )}
                      </div>
                    )}

                    {m.chart && (!isTyping || i < messages.length - 1) && <MiniBarChart data={m.chart} />}
                  </div>
                </div>
              ))}

              {/* Action Cards & Gợi ý câu hỏi */}
              {messages.length === 1 && (
                <div className="pt-2 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                    Gợi ý nhanh cho bạn:
                  </p>
                  <div
                    className={`grid gap-1.5 ${
                      chatSizeMode === "expanded" ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
                    }`}
                  >
                    <button
                      onClick={() => !loading && !isTyping && send("Bạn có thể cho tôi biết công thức tính chu vi và diện tích hình tròn là gì không?")}
                      disabled={loading || isTyping}
                      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800 transition-all text-left shadow-2xs cursor-pointer group disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 border border-sky-200/60 dark:border-sky-500/30 shrink-0">
                        <Compass className="h-3.5 w-3.5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                          📐 Công thức chu vi & diện tích hình tròn
                        </div>
                      </div>
                    </button>

                    {doc && (
                      <>
                        <button
                          onClick={() => !loading && !isTyping && send("Tóm tắt nội dung chính của tài liệu này")}
                          disabled={loading || isTyping}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800 transition-all text-left shadow-2xs cursor-pointer group disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-50 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-200/60 dark:border-purple-500/30 shrink-0">
                            <FileText className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              📄 Tóm tắt nhanh tài liệu này
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => !loading && !isTyping && send("Vẽ mô hình tư duy cho tôi")}
                          disabled={loading || isTyping}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800 transition-all text-left shadow-2xs cursor-pointer group disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/30 shrink-0">
                            <Network className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              🧠 Dựng sơ đồ tư duy (Mindmap)
                            </div>
                          </div>
                        </button>

                        <button
                          onClick={() => !loading && !isTyping && send("Tạo 3 câu hỏi ôn tập từ tài liệu này")}
                          disabled={loading || isTyping}
                          className="flex items-center gap-2.5 p-2.5 rounded-lg border border-slate-200/90 dark:border-slate-700/70 bg-white dark:bg-slate-800/50 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/40 dark:hover:bg-slate-800 transition-all text-left shadow-2xs cursor-pointer group disabled:opacity-50 disabled:pointer-events-none"
                        >
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/30 shrink-0">
                            <HelpCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                              📝 Đố vui 3 câu trắc nghiệm
                            </div>
                          </div>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* 1. HIỆU ỨNG ĐANG SUY NGHĨ (Thinking Bubble) */}
              {loading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="max-w-[88%] rounded-2xl px-4 py-3 bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border border-slate-200/90 dark:border-slate-700/60 shadow-sm space-y-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "3s" }} />
                      <span className="font-semibold">Trợ lý AI PeerMind</span>
                    </div>

                    {/* 3 dấu chấm nảy liên tục animate-bounce */}
                    <div className="flex items-center gap-1.5 py-1">
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>

                    {/* Dòng trạng thái nhỏ luân phiên thay đổi */}
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic flex items-center gap-1.5 transition-all duration-300">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span>{thinkingStatus}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
          </div>

          {/* 3. NÚT NỔI "CUỘN XUỐNG CUỐI" (FLOATING JUMP-TO-BOTTOM BUTTON) */}
          {showScrollBottomBtn && (
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-slate-800/95 hover:bg-indigo-600 text-white border border-slate-700 shadow-lg rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer animate-fade-in group whitespace-nowrap"
              title="Cuộn xuống tin nhắn mới nhất"
            >
              <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              <span>{isTyping ? "↓ Đang viết tiếp..." : "Cuộn xuống cuối"}</span>
            </button>
          )}

          {/* Ô nhập liệu tin nhắn */}
          <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && !isTyping && send(input)}
                disabled={loading || isTyping}
                placeholder={
                  loading
                    ? "AI đang suy nghĩ câu trả lời..."
                    : isTyping
                    ? "AI đang viết câu trả lời..."
                    : "Hỏi bất kỳ điều gì (giải toán, lập trình, tóm tắt bài...)..."
                }
                className="flex-1 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-950 px-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors disabled:opacity-60"
              />
              {loading || isTyping ? (
                <button
                  type="button"
                  onClick={handleStopGenerating}
                  className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 shadow-xs text-xs font-medium transition-all cursor-pointer shrink-0"
                  title="Dừng tạo câu trả lời"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => send(input)}
                  disabled={!input.trim()}
                  className="inline-flex items-center justify-center h-9 px-3.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs text-xs font-medium transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer shrink-0"
                  title="Gửi câu hỏi"
                >
                  <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
