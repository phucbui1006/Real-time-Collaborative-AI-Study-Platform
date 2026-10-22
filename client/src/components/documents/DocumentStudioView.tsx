// components/documents/DocumentStudioView.tsx — Màn hình Studio chuyên dụng (Split-screen Reader + AI Chatbot)
import React, { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  Network,
  HelpCircle,
  Send,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  DocumentItem,
  ChatMessage,
  askAI,
  fetchDocConversations,
  saveDocConversation,
} from "../../services/aiService";
import { getSubjectStyle } from "./DocumentStore";

interface DocumentStudioViewProps {
  doc: DocumentItem;
  onBack: () => void;
  userId?: string;
  userName?: string;
}

export const DocumentStudioView: React.FC<DocumentStudioViewProps> = ({
  doc,
  onBack,
  userName = "Bạn",
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(16);
  const [selectedText, setSelectedText] = useState<string>("");
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const pages = doc.pagesContent && doc.pagesContent.length > 0
    ? doc.pagesContent
    : [doc.title];
  const totalPages = pages.length;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const readerContentRef = useRef<HTMLDivElement>(null);
  const subjectStyle = getSubjectStyle(doc.subject);

  // 1. Tải lịch sử trò chuyện của tài liệu này từ Supabase
  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      try {
        const history = await fetchDocConversations(doc.id);
        if (history.length > 0) {
          setMessages(history);
        } else {
          // Tin nhắn mở đầu mặc định
          setMessages([
            {
              role: "ai",
              text: `Chào ${userName}! Mình là Trợ lý AI của tài liệu **"${doc.title}"**. Mình đã đọc hiểu toàn bộ ${totalPages} trang của giáo trình này. Bạn có thể hỏi mình bất kỳ chi tiết nào hoặc bôi đen văn bản bên trái để mình giải thích nha! ✨`,
              isGemini: true,
            },
          ]);
        }
      } catch (err) {
        console.warn("Lỗi tải lịch sử chat:", err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [doc.id, doc.title, totalPages, userName]);

  // Cuộn tin nhắn xuống đáy
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 2. Bắt sự kiện bôi đen văn bản để hiển thị Quick Action Tooltip
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setTooltipPos(null);
      setSelectedText("");
      return;
    }

    const text = selection.toString().trim();
    if (text.length > 3) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(text);
      setTooltipPos({
        x: rect.left + rect.width / 2,
        y: Math.max(10, rect.top - 46),
      });
    }
  };

  // 3. Gửi câu hỏi cho AI (kèm lưu CSDL)
  const handleSendQuestion = async (customPrompt?: string) => {
    const q = (customPrompt || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = { role: "user", text: q };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    if (!customPrompt) setInput("");
    setLoading(true);
    setTooltipPos(null);

    try {
      const res = await askAI(q, doc, newHistory);
      const aiMsg: ChatMessage = { role: "ai", text: res.text, isGemini: res.isGemini };
      setMessages((prev) => [...prev, aiMsg]);

      // Lưu cuộc trò chuyện vào Supabase DB
      await saveDocConversation(doc.id, q, res.text);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Mình đang gặp chút gián đoạn kết nối. Bạn thử hỏi lại lần nữa nhé!", isGemini: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 4. Nhảy đến trang khi bấm vào trích dẫn [Trang X]
  const handleJumpToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
      // Cuộn đầu trang khung đọc
      readerContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Render câu trả lời AI với các trích dẫn [Trang X] có thể click
  const renderAIMessageText = (text: string) => {
    // Tìm các cụm [Trang X] hoặc [Trang X, Y]
    const parts = text.split(/(\[Trang\s*\d+\])/gi);

    return (
      <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
        {parts.map((part, i) => {
          const match = part.match(/\[Trang\s*(\d+)\]/i);
          if (match) {
            const pageNo = parseInt(match[1], 10);
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleJumpToPage(pageNo)}
                className="inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 rounded-[5000px] text-xs font-mono font-normal bg-[#91d8ec] dark:bg-[#2dd4bf]/20 text-[#111118] dark:text-[#2dd4bf] border border-[#111118] hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-[0_1px_0_0_#111118]"
                title={`Nhấp để mở trang ${pageNo}`}
              >
                📄 Trang {pageNo} →
              </button>
            );
          }
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                p: ({ children }) => <span className="inline">{children}</span>,
              }}
            >
              {part}
            </ReactMarkdown>
          );
        })}
      </div>
    );
  };

  const currentPageText = pages[currentPage - 1] || "Không có nội dung cho trang này.";

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full overflow-hidden bg-[#f0f6ff] dark:bg-[#111118] transition-colors duration-150">
      {/* ── Top Bar Header Studio ─────────────────────────────────────────── */}
      <header className="h-14 shrink-0 bg-white dark:bg-[#1b1b26] border-b border-[#e1edff] dark:border-[#2a2a3a] px-4 sm:px-6 flex items-center justify-between gap-4 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-[5000px] bg-[#e1edff] dark:bg-[#242436] border border-[#111118] text-xs font-normal text-[#111118] dark:text-[#f0f6ff] shadow-[0_2px_0_0_#111118] hover:bg-[#d0e2ff] active:translate-y-[1px] transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Thư viện</span>
          </button>

          <div className="h-5 w-[1px] bg-[#e1edff] dark:bg-[#2a2a3a] shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className={`px-2.5 py-0.5 rounded-[5000px] text-[10px] font-mono shrink-0 border border-[#111118] ${subjectStyle.box}`}>
              {doc.subject}
            </span>
            <h1 className="text-sm sm:text-base font-normal text-[#111118] dark:text-[#f0f6ff] truncate">
              {doc.title}
            </h1>
          </div>
        </div>

        {/* Các nút tác vụ nhanh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleSendQuestion(`Hãy tóm tắt ngắn gọn các ý cốt lõi nhất của tài liệu "${doc.title}"`)}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[5000px] bg-[#ffda00] text-[#111118] border border-[#111118] text-xs font-normal shadow-[0_2px_0_0_#111118] hover:bg-[#ebd000] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tóm tắt</span>
          </button>

          <button
            onClick={() => handleSendQuestion(`Vẽ sơ đồ tư duy phân nhánh cho tài liệu "${doc.title}"`)}
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[5000px] bg-[#91d8ec] text-[#111118] border border-[#111118] text-xs font-normal shadow-[0_2px_0_0_#111118] hover:bg-[#80cee4] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Mindmap</span>
          </button>

          <button
            onClick={() => handleSendQuestion(`Soạn 3 câu hỏi trắc nghiệm ôn tập cho tài liệu "${doc.title}"`)}
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[5000px] bg-[#ffbac4] text-[#111118] border border-[#111118] text-xs font-normal shadow-[0_2px_0_0_#111118] hover:bg-[#f3abb6] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Tạo Quiz</span>
          </button>
        </div>
      </header>

      {/* ── Main Workspace: Split Screen (Reader 60% | AI Studio 40%) ────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* ─── CỘT TRÁI: DOCUMENT READER ───────────────────────────────────── */}
        <section className="flex-1 flex flex-col h-full bg-[#f0f6ff] dark:bg-[#111118] border-r border-[#e1edff] dark:border-[#2a2a3a] overflow-hidden">
          {/* Thanh điều khiển trang & Zoom */}
          <div className="h-12 shrink-0 bg-white/80 dark:bg-[#1b1b26]/80 backdrop-blur-xs border-b border-[#e1edff] dark:border-[#2a2a3a] px-4 flex items-center justify-between text-xs">
            {/* Phân trang */}
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-8 h-8 rounded-full border border-[#111118] bg-[#e1edff] dark:bg-[#242436] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none hover:bg-[#d0e2ff] cursor-pointer shadow-[0_1px_0_0_#111118]"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono text-xs text-[#111118] dark:text-[#f0f6ff] px-3 py-1 rounded-[5000px] bg-[#e1edff] dark:bg-[#242436] border border-[#111118]">
                Trang {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-8 h-8 rounded-full border border-[#111118] bg-[#e1edff] dark:bg-[#242436] flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none hover:bg-[#d0e2ff] cursor-pointer shadow-[0_1px_0_0_#111118]"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Phóng to / Thu nhỏ cỡ chữ */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#111118]/60 dark:text-[#f0f6ff]/60 hidden sm:inline">Cỡ chữ:</span>
              <button
                onClick={() => setFontSize((s) => Math.max(13, s - 1))}
                className="w-7 h-7 rounded-full border border-[#111118]/40 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                title="Thu nhỏ chữ"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                className="w-7 h-7 rounded-full border border-[#111118]/40 flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                title="Phóng to chữ"
              >
                A+
              </button>
            </div>
          </div>

          {/* Vùng đọc nội dung trang */}
          <div
            ref={readerContentRef}
            onMouseUp={handleTextSelection}
            onTouchEnd={handleTextSelection}
            className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center"
          >
            <div
              style={{ fontSize: `${fontSize}px` }}
              className="w-full max-w-3xl min-h-[500px] bg-white dark:bg-[#1b1b26] rounded-[24px] border-2 border-[#111118] dark:border-[#2a2a3a] p-6 sm:p-10 shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000] leading-relaxed text-[#111118] dark:text-[#f0f6ff] transition-all select-text"
            >
              {/* Tiêu đề đầu trang */}
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e1edff] dark:border-[#2a2a3a] text-xs font-mono text-[#111118]/60 dark:text-[#f0f6ff]/60">
                <span>{doc.title}</span>
                <span className="bg-[#e1edff] dark:bg-[#242436] px-2.5 py-0.5 rounded-[5000px] border border-[#111118]">
                  TRANG {currentPage}
                </span>
              </div>

              {/* Nội dung trang */}
              <div className="whitespace-pre-wrap font-normal selection:bg-[#ffda00] selection:text-[#111118]">
                {currentPageText}
              </div>

              {/* Chân trang */}
              <div className="mt-12 pt-4 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between text-xs text-[#111118]/50 dark:text-[#f0f6ff]/50 font-mono">
                <span>PeerMind Document Reader · RAG Ready</span>
                <span>{currentPage} / {totalPages}</span>
              </div>
            </div>
          </div>

          {/* Tooltip nổi khi bôi đen văn bản */}
          {tooltipPos && selectedText && (
            <div
              style={{
                position: "fixed",
                left: `${tooltipPos.x}px`,
                top: `${tooltipPos.y}px`,
                transform: "translateX(-50%)",
              }}
              className="z-50 flex items-center gap-1.5 bg-[#111118] text-white p-1.5 rounded-[5000px] shadow-[0_4px_12px_rgba(0,0,0,0.3)] text-xs border border-white/20 animate-in fade-in zoom-in-95"
            >
              <button
                onClick={() => handleSendQuestion(`Giải thích chi tiết đoạn sau trong trang ${currentPage}: "${selectedText}"`)}
                className="px-3 py-1 rounded-[5000px] bg-[#0b7a75] hover:bg-[#08635f] text-white font-normal transition-colors cursor-pointer"
              >
                ✨ Hỏi AI đoạn này
              </button>
              <button
                onClick={() => handleSendQuestion(`Tóm tắt 1 câu ngắn gọn đoạn này: "${selectedText}"`)}
                className="px-2.5 py-1 rounded-[5000px] hover:bg-white/10 text-white/90 font-normal transition-colors cursor-pointer"
              >
                Tóm tắt
              </button>
            </div>
          )}
        </section>

        {/* ─── CỘT PHẢI: AI TUTOR STUDIO ───────────────────────────────────── */}
        <section className="w-full lg:w-[420px] xl:w-[460px] flex flex-col h-full bg-white dark:bg-[#1b1b26] border-t lg:border-t-0 lg:border-l border-[#e1edff] dark:border-[#2a2a3a] shrink-0">
          {/* Header Chat */}
          <div className="h-12 shrink-0 border-b border-[#e1edff] dark:border-[#2a2a3a] px-4 flex items-center justify-between bg-white dark:bg-[#1b1b26]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0b7a75] text-white flex items-center justify-center border border-[#111118] shadow-[0_1px_0_0_#111118]">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">
                Trợ lý AI PeerMind
              </span>
            </div>

            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#16ab59]">
              <span className="w-2 h-2 rounded-full bg-[#16ab59] animate-pulse" />
              RAG Active
            </span>
          </div>

          {/* Danh sách tin nhắn hội thoại */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="py-12 text-center text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60">
                Đang tải lịch sử trò chuyện...
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-[20px] px-4 py-3 text-sm leading-relaxed border transition-colors ${
                      msg.role === "user"
                        ? "bg-[#0b7a75] text-white border-[#111118] shadow-[0_2px_0_0_#111118]"
                        : "bg-[#f0f6ff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]"
                    }`}
                  >
                    {msg.role === "ai" ? renderAIMessageText(msg.text) : msg.text}
                  </div>
                </div>
              ))
            )}

            {/* Trạng thái đang suy nghĩ */}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-[#0b7a75] dark:text-[#2dd4bf] font-normal py-2">
                <span className="w-2 h-2 rounded-full bg-[#0b7a75] animate-ping" />
                <span>Trợ lý AI đang tra cứu các trang tài liệu...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Gợi ý câu hỏi thông minh theo trang hiện tại */}
          <div className="px-4 py-2 border-t border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff]/60 dark:bg-[#111118]/60 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] text-[#111118]/60 dark:text-[#f0f6ff]/60 shrink-0 font-mono">Gợi ý:</span>
            <button
              onClick={() => handleSendQuestion(`Tóm tắt nội dung chính của Trang ${currentPage}`)}
              className="px-2.5 py-1 rounded-[5000px] bg-white dark:bg-[#242436] border border-[#e1edff] dark:border-[#2a2a3a] text-[11px] font-normal text-[#111118] dark:text-[#f0f6ff] shrink-0 hover:border-[#0b7a75] transition-colors cursor-pointer"
            >
              📄 Tóm tắt trang {currentPage}
            </button>
            <button
              onClick={() => handleSendQuestion(`Trang ${currentPage} có công thức hoặc lưu ý thi cử nào cần nhớ không?`)}
              className="px-2.5 py-1 rounded-[5000px] bg-white dark:bg-[#242436] border border-[#e1edff] dark:border-[#2a2a3a] text-[11px] font-normal text-[#111118] dark:text-[#f0f6ff] shrink-0 hover:border-[#0b7a75] transition-colors cursor-pointer"
            >
              💡 Điểm cần nhớ trang {currentPage}
            </button>
          </div>

          {/* Ô nhập tin nhắn */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion();
            }}
            className="p-3 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center gap-2 bg-white dark:bg-[#1b1b26]"
          >
            <input
              type="text"
              placeholder="Đặt câu hỏi về tài liệu hoặc yêu cầu giải thích..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              className="flex-1 h-11 rounded-[5000px] border border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff] dark:bg-[#242436] px-4 text-sm text-[#111118] dark:text-[#f0f6ff] outline-none focus:border-[#0b7a75] transition-colors"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-11 h-11 rounded-full bg-[#0b7a75] hover:bg-[#08635f] text-white flex items-center justify-center border border-[#111118] shadow-[0_2px_0_0_#111118] disabled:opacity-40 disabled:pointer-events-none active:translate-y-[1px] transition-all cursor-pointer shrink-0"
              title="Gửi câu hỏi"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default DocumentStudioView;
