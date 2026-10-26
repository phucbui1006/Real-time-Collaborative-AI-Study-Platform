// components/documents/DocumentStudioView.tsx — Màn hình Studio chuyên dụng (Split-screen Reader + AI Chatbot Multi-Sessions)
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  Network,
  HelpCircle,
  Send,
  Plus,
  Trash2,
  Edit2,
  Check,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  DocumentItem,
  ChatMessage,
  ChatSession,
  askAI,
  fetchDocSessions,
  fetchDocConversations,
  saveDocConversation,
  deleteDocSession,
  renameDocSession,
} from "../../services/aiService";
import { getSubjectStyle } from "./DocumentStore";
import { sanitizeExtractedText } from "../../services/pdfService";
import {
  fetchDocumentPage,
  prefetchDocumentPages,
  getCachedPage,
  isPageCached,
  cleanTextForAI,
} from "../../services/documentPagingService";

interface DocumentStudioViewProps {
  doc: DocumentItem;
  onBack: () => void;
  userId?: string;
  userName?: string;
  onUpdateDoc?: (updatedDoc: DocumentItem) => void;
}

export const DocumentStudioView: React.FC<DocumentStudioViewProps> = ({
  doc,
  onBack,
  userId,
  userName = "Bạn",
  onUpdateDoc: _onUpdateDoc,
}) => {
  const [activeDoc, setActiveDoc] = useState<DocumentItem>(doc);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(16);
  const [selectedText, setSelectedText] = useState<string>("");
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Mặc định khởi tạo một phiên trò chuyện mới tinh để tránh load lại chat cũ khi vừa mở tài liệu
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => `sess_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      role: "ai",
      text: `Chào ${userName}! Mình là Trợ lý AI của tài liệu **"${doc.title}"**. Mình đã đọc hiểu toàn bộ ${doc.pagesCount || 1} trang của tài liệu này. Bạn có thể hỏi mình bất kỳ chi tiết nào hoặc bôi đen văn bản bên trái để mình giải thích nha! ✨`,
      isGemini: true,
    },
  ]);

  // Quản lý nhiều phiên trò chuyện (lưu tối đa 5 phiên gần nhất)
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState<boolean>(false);
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const [editTitleInput, setEditTitleInput] = useState<string>("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const readerContentRef = useRef<HTMLDivElement>(null);

  // Xác định tổng số trang từ metadata (đã có sẵn trong database) hoặc mảng pagesContent
  const totalPages = Math.max(1, activeDoc.pagesCount || activeDoc.pagesContent?.length || 1);

  // Quản lý nội dung trang hiện tại theo cơ chế On-Demand Streaming
  const [pageText, setPageText] = useState<string>(() => {
    if (doc.pagesContent && doc.pagesContent[0]) {
      return doc.pagesContent[0];
    }
    const cached = getCachedPage(doc.id, 0);
    if (cached) return cached;
    return "";
  });
  const [isPageLoading, setIsPageLoading] = useState<boolean>(() => {
    if (doc.pagesContent && doc.pagesContent[0]) return false;
    return !isPageCached(doc.id, 0);
  });

  useEffect(() => {
    setActiveDoc(doc);
  }, [doc]);

  // Nạp trang hiện tại theo nhu cầu (Page-based On-Demand Loading)
  useEffect(() => {
    let isMounted = true;
    const pageIndex = currentPage - 1;

    // 1. Nếu doc đã có sẵn pagesContent mảng đầy đủ (như doc seed mẫu)
    if (activeDoc.pagesContent && activeDoc.pagesContent[pageIndex]) {
      setPageText(activeDoc.pagesContent[pageIndex]);
      setIsPageLoading(false);
      return;
    }

    // 2. Kiểm tra cache tức thì trong RAM (0ms)
    const cached = getCachedPage(activeDoc.id, pageIndex);
    if (cached) {
      setPageText(cached);
      setIsPageLoading(false);
      prefetchDocumentPages(activeDoc.id, pageIndex, totalPages, 2);
      return;
    }

    // 3. Nếu chưa có, nạp đúng 1 trang này từ Supabase (thời gian cực ngắn ~300ms)
    setIsPageLoading(true);
    fetchDocumentPage(activeDoc.id, pageIndex, `${activeDoc.title} — Trang ${currentPage}`)
      .then((content) => {
        if (isMounted) {
          setPageText(content);
          setIsPageLoading(false);
          prefetchDocumentPages(activeDoc.id, pageIndex, totalPages, 2);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsPageLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeDoc.id, currentPage, totalPages, activeDoc.pagesContent, activeDoc.title]);

  const subjectStyle = getSubjectStyle(activeDoc.subject);

  // 1. Tải danh sách 5 phiên trò chuyện gần nhất của tài liệu (không tự ý đổi phiên chat hiện tại)
  useEffect(() => {
    async function loadSessions() {
      try {
        const sList = await fetchDocSessions(activeDoc.id, userId);
        setSessions(sList);
      } catch (err) {
        console.warn("Lỗi tải danh sách phiên chat:", err);
      }
    }
    loadSessions();
  }, [activeDoc.id, userId]);

  // Cuộn khung đọc sách về đầu trang mỗi khi chuyển trang
  useEffect(() => {
    readerContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  // Cuộn tin nhắn xuống đáy
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Tìm thông tin session hiện tại
  const currentSession = sessions.find((s) => s.id === currentSessionId) || {
    id: currentSessionId,
    title: "Cuộc trò chuyện mới",
    createdAt: new Date().toISOString(),
  };

  // Tạo phiên trò chuyện mới (+ Chat mới)
  const handleCreateNewSession = () => {
    const newId = `sess_${Date.now()}`;
    setCurrentSessionId(newId);
    setMessages([
      {
        role: "ai",
        text: `Chào ${userName}! Mình là Trợ lý AI của tài liệu **"${activeDoc.title}"**. Mình đã đọc hiểu toàn bộ ${totalPages} trang của tài liệu này. Bạn có thể hỏi mình bất kỳ chi tiết nào hoặc bôi đen văn bản bên trái để mình giải thích nha! ✨`,
        isGemini: true,
      },
    ]);
    setIsSessionDropdownOpen(false);
    setIsEditingTitle(false);
  };

  // Đổi sang xem lịch sử của phiên trò chuyện cũ từ Dropdown (Lazy Load On-demand)
  const handleSwitchSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) {
      setIsSessionDropdownOpen(false);
      return;
    }
    setCurrentSessionId(sessionId);
    setIsSessionDropdownOpen(false);
    setIsEditingTitle(false);

    setLoadingHistory(true);
    const defaultWelcome: ChatMessage = {
      role: "ai",
      text: `Chào ${userName}! Mình là Trợ lý AI của tài liệu **"${activeDoc.title}"**. Mình đã đọc hiểu toàn bộ ${totalPages} trang của tài liệu này. Bạn có thể hỏi mình bất kỳ chi tiết nào hoặc bôi đen văn bản bên trái để mình giải thích nha! ✨`,
      isGemini: true,
    };

    try {
      const history = await fetchDocConversations(activeDoc.id, sessionId, userId);
      if (history.length > 0) {
        const updatedHistory = history.map((msg, idx) => {
          if (idx === 0 && msg.role === "ai" && (msg.text.includes("Mình là Trợ lý AI của tài liệu") || msg.text.startsWith("Chào "))) {
            return defaultWelcome;
          }
          return msg;
        });
        setMessages(updatedHistory);
      } else {
        setMessages([defaultWelcome]);
      }
    } catch (err) {
      console.warn("Lỗi tải lịch sử chat:", err);
      setMessages([defaultWelcome]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Xóa phiên trò chuyện
  const handleDeleteSession = async (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    const confirmName = target?.title || (sessionId === currentSessionId ? "cuộc trò chuyện hiện tại" : "phiên trò chuyện này");
    if (!window.confirm(`Bạn có chắc chắn muốn xóa "${confirmName}" và toàn bộ lịch sử tin nhắn của phiên này?`)) {
      return;
    }

    await deleteDocSession(activeDoc.id, sessionId, userId);
    const remaining = sessions.filter((s) => s.id !== sessionId);
    setSessions(remaining);

    // Nếu xóa chính phiên đang mở, tự động đưa về một phiên chat mới tinh
    if (currentSessionId === sessionId) {
      handleCreateNewSession();
    }
    setIsSessionDropdownOpen(false);
  };

  // Lưu tên mới cho phiên
  const handleSaveRename = async () => {
    const trimmed = editTitleInput.trim();
    if (!trimmed) {
      setIsEditingTitle(false);
      return;
    }
    await renameDocSession(activeDoc.id, currentSessionId, trimmed, userId);
    setSessions((prev) =>
      prev.map((s) => (s.id === currentSessionId ? { ...s, title: trimmed } : s))
    );
    setIsEditingTitle(false);
  };

  // 3. Bắt sự kiện bôi đen văn bản để hiển thị Quick Action Tooltip
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

  // 4. Gửi câu hỏi cho AI (kèm lưu CSDL theo phiên và user_id)
  const handleSendQuestion = async (customPrompt?: string) => {
    const q = (customPrompt || input).trim();
    if (!q || loading) return;

    const userMsg: ChatMessage = { role: "user", text: q };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    if (!customPrompt) setInput("");
    setLoading(true);
    setTooltipPos(null);

    // Tự động đặt tên cho phiên nếu còn là tên mặc định hoặc phiên mới
    let activeTitle = currentSession?.title || "Cuộc trò chuyện mới";
    if (
      activeTitle === "Cuộc trò chuyện mới" ||
      activeTitle === "Cuộc trò chuyện" ||
      activeTitle === "Cuộc trò chuyện chính"
    ) {
      const autoTitle = q.length > 28 ? q.slice(0, 28) + "..." : q;
      activeTitle = autoTitle;
      renameDocSession(activeDoc.id, currentSessionId, autoTitle, userId);
    }

    // Đưa phiên này vào danh sách 5 phiên gần nhất
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === currentSessionId);
      if (exists) {
        return prev.map((s) => (s.id === currentSessionId ? { ...s, title: activeTitle } : s));
      }
      const newSess: ChatSession = {
        id: currentSessionId,
        title: activeTitle,
        createdAt: new Date().toISOString(),
      };
      return [newSess, ...prev].slice(0, 5);
    });

    try {
      const docForAI: DocumentItem = {
        ...activeDoc,
        pagesContent:
          activeDoc.pagesContent && activeDoc.pagesContent.length > 0
            ? activeDoc.pagesContent
            : [cleanTextForAI(pageText || rawPageText)],
      };
      const res = await askAI(q, docForAI, newHistory);
      const aiMsg: ChatMessage = { role: "ai", text: res.text, isGemini: res.isGemini };
      setMessages((prev) => [...prev, aiMsg]);

      // Lưu cuộc trò chuyện vào Supabase DB kèm session_id và user_id
      await saveDocConversation(activeDoc.id, q, res.text, userId, currentSessionId, activeTitle);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Mình đang gặp chút gián đoạn kết nối. Bạn thử hỏi lại lần nữa nhé!", isGemini: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 5. Nhảy đến trang khi bấm vào trích dẫn [Trang X]
  const handleJumpToPage = (pageNum: number) => {
    if (pageNum >= 1 && pageNum <= totalPages) {
      setCurrentPage(pageNum);
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
                className="inline-flex items-center gap-1 mx-1 px-2.5 py-0.5 rounded-sharp text-xs font-mono font-normal bg-[#91d8ec] dark:bg-[#2dd4bf]/20 text-[#111118] dark:text-[#2dd4bf] border border-[#111118] hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-[0_1px_0_0_#111118]"
                title={`Nhấp để mở trang ${pageNo}`}
              >
                📄 Trang {pageNo} →
              </button>
            );
          }
          return (
            <ReactMarkdown
              key={i}
              remarkPlugins={[remarkGfm, remarkMath]}
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

  const rawPageText = pageText || (activeDoc.pagesContent && activeDoc.pagesContent[currentPage - 1]) || "Không có nội dung cho trang này.";
  // Làm sạch các thẻ HTML bookmark của Word (<a id="_Toc..."></a>) để văn bản luôn sạch đẹp
  const currentPageText = useMemo(() => {
    return sanitizeExtractedText(rawPageText);
  }, [rawPageText]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full overflow-hidden bg-[#f0f6ff] dark:bg-[#111118] transition-colors duration-150">
      {/* ── Top Bar Header Studio ─────────────────────────────────────────── */}
      <header className="h-14 shrink-0 bg-white dark:bg-[#1b1b26] border-b border-[#e1edff] dark:border-[#2a2a3a] px-4 sm:px-6 flex items-center justify-between shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] z-20">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#111118] text-xs font-normal text-[#111118] dark:text-[#f0f6ff] shadow-[0_2px_0_0_#111118] hover:bg-[#d0e2ff] active:translate-y-[1px] transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Thư viện</span>
          </button>

          <div className="h-5 w-[1px] bg-[#e1edff] dark:bg-[#2a2a3a] shrink-0" />

          <div className="flex items-center gap-2 min-w-0">
            <span className={`px-2.5 py-0.5 rounded-sharp text-[10px] font-mono shrink-0 border border-[#111118] ${subjectStyle.box}`}>
              {activeDoc.subject}
            </span>
            <h1 className="text-sm sm:text-base font-normal text-[#111118] dark:text-[#f0f6ff] truncate">
              {activeDoc.title}
            </h1>
          </div>
        </div>

        {/* Các nút tác vụ nhanh */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => handleSendQuestion(`Hãy tóm tắt ngắn gọn các ý cốt lõi nhất của tài liệu "${activeDoc.title}"`)}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-sm bg-[#ffda00] text-[#111118] border border-[#111118] text-xs font-normal shadow-[0_2px_0_0_#111118] hover:bg-[#ebd000] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tóm tắt</span>
          </button>

          <button
            onClick={() => handleSendQuestion(`Vẽ sơ đồ tư duy phân nhánh cho tài liệu "${activeDoc.title}"`)}
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-sm bg-[#91d8ec] text-[#111118] border border-[#111118] text-xs font-normal shadow-[0_2px_0_0_#111118] hover:bg-[#80cee4] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Mindmap</span>
          </button>

          <button
            onClick={() => handleSendQuestion(`Soạn 3 câu hỏi trắc nghiệm ôn tập cho tài liệu "${activeDoc.title}"`)}
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-sm bg-[#ffbac4] text-[#111118] border border-[#111118] text-xs font-normal shadow-[0_2px_0_0_#111118] hover:bg-[#f3abb6] active:translate-y-[1px] transition-all cursor-pointer"
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
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="w-8 h-8 rounded-sm border border-[#111118] bg-white dark:bg-[#1b1b26] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#e1edff] active:scale-95 transition-all cursor-pointer shadow-[0_1px_0_0_#111118]"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono px-3 py-1 bg-[#e1edff] dark:bg-[#242436] rounded-sharp border border-[#111118] text-[#111118] dark:text-[#f0f6ff] font-normal">
                Trang {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="w-8 h-8 rounded-sm border border-[#111118] bg-white dark:bg-[#1b1b26] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#e1edff] active:scale-95 transition-all cursor-pointer shadow-[0_1px_0_0_#111118]"
                title="Trang sau"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Cỡ chữ */}
            <div className="flex items-center gap-2">
              <span className="text-[#111118]/60 dark:text-[#f0f6ff]/60 hidden sm:inline">Cỡ chữ:</span>
              <button
                onClick={() => setFontSize((s) => Math.max(13, s - 1))}
                className="px-2 py-0.5 rounded-sharp border border-[#111118] bg-white dark:bg-[#1b1b26] font-mono hover:bg-[#e1edff] text-xs cursor-pointer"
                title="Giảm cỡ chữ"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                className="px-2 py-0.5 rounded-sharp border border-[#111118] bg-white dark:bg-[#1b1b26] font-mono hover:bg-[#e1edff] text-xs cursor-pointer"
                title="Tăng cỡ chữ"
              >
                A+
              </button>
            </div>
          </div>

          {/* Vùng hiển thị nội dung trang đọc */}
          <div
            ref={readerContentRef}
            onMouseUp={handleTextSelection}
            className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start"
          >
            <div
              style={{ fontSize: `${fontSize}px` }}
              className="w-full max-w-3xl min-h-[550px] h-auto bg-white dark:bg-[#1b1b26] rounded-md border-2 border-[#111118] dark:border-[#2a2a3a] p-6 sm:p-10 shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000] leading-relaxed text-[#111118] dark:text-[#f0f6ff] transition-all select-text flex flex-col justify-between break-words mb-10 shrink-0"
            >
              <div>
                {/* Tiêu đề đầu trang */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e1edff] dark:border-[#2a2a3a] text-xs font-mono text-[#111118]/60 dark:text-[#f0f6ff]/60">
                  <span className="truncate max-w-[200px] sm:max-w-md">{activeDoc.title}</span>
                  <span className="bg-[#e1edff] dark:bg-[#242436] px-2.5 py-0.5 rounded-sharp border border-[#111118] shrink-0">
                    TRANG {currentPage}
                  </span>
                </div>

                {/* Nội dung trang định dạng Markdown hoặc Khung chờ Skeleton khi đang nạp */}
                {isPageLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center space-y-4">
                    <div className="w-9 h-9 border-3 border-[#0b7a75] border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-medium text-[#111118]/70 dark:text-[#f0f6ff]/70 font-mono">
                      Đang nạp trang {currentPage} / {totalPages}...
                    </p>
                    <div className="w-full space-y-3 mt-4 animate-pulse">
                      <div className="h-4 bg-[#e1edff] dark:bg-[#242436] rounded w-3/4" />
                      <div className="h-4 bg-[#e1edff] dark:bg-[#242436] rounded w-full" />
                      <div className="h-4 bg-[#e1edff] dark:bg-[#242436] rounded w-5/6" />
                      <div className="h-4 bg-[#e1edff] dark:bg-[#242436] rounded w-2/3" />
                      <div className="h-32 bg-[#e1edff] dark:bg-[#242436] rounded w-full mt-3" />
                    </div>
                  </div>
                ) : (
                  <div className="prose dark:prose-invert max-w-none text-base leading-relaxed break-words overflow-x-auto selection:bg-[#ffda00] selection:text-[#111118]">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {currentPageText}
                    </ReactMarkdown>
                  </div>
                )}
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
              className="z-50 flex items-center gap-1.5 bg-[#111118] text-white p-1.5 rounded-sm shadow-[0_4px_12px_rgba(0,0,0,0.3)] text-xs border border-white/20 animate-in fade-in zoom-in-95"
            >
              <button
                onClick={() => handleSendQuestion(`Giải thích chi tiết đoạn sau trong trang ${currentPage}: "${selectedText}"`)}
                className="px-3 py-1 rounded-sharp bg-[#0b7a75] hover:bg-[#08635f] text-white font-normal transition-colors cursor-pointer"
              >
                ✨ Hỏi AI đoạn này
              </button>
              <button
                onClick={() => handleSendQuestion(`Tóm tắt ý chính của đoạn sau: "${selectedText}"`)}
                className="px-3 py-1 rounded-sharp bg-[#ffda00] hover:bg-[#ebd000] text-[#111118] font-normal transition-colors cursor-pointer"
              >
                Tóm tắt
              </button>
            </div>
          )}
        </section>

        {/* ─── CỘT PHẢI: AI TUTOR PANEL (MULTI-SESSIONS CHATBOT) ─────────────── */}
        <section className="w-full lg:w-[450px] xl:w-[500px] flex flex-col h-full bg-white dark:bg-[#1b1b26] border-t lg:border-t-0 border-[#e1edff] dark:border-[#2a2a3a] shadow-[-4px_0_12px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Header AI Tutor */}
          <div className="h-12 shrink-0 px-4 border-b border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between text-xs bg-[#f0f6ff]/50 dark:bg-[#111118]/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0b7a75] text-white flex items-center justify-center font-mono">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="font-semibold text-[#111118] dark:text-[#f0f6ff]">Trợ lý AI PeerMind</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateNewSession}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill bg-[#0b7a75] hover:bg-[#08635f] text-white text-[11px] font-medium border border-[#111118] shadow-[0_1px_0_0_#111118] active:translate-y-[1px] transition-all cursor-pointer"
                title="Tạo cuộc trò chuyện mới (+ New Chat)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Chat mới</span>
              </button>
            </div>
          </div>

          {/* Sub-bar: Thanh quản lý phiên trò chuyện (Sessions Selector) */}
          <div className="px-3 py-2 bg-white dark:bg-[#1b1b26] border-b border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between gap-2 text-xs relative z-30">
            <div className="relative flex-1 min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editTitleInput}
                    onChange={(e) => setEditTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveRename();
                      if (e.key === "Escape") setIsEditingTitle(false);
                    }}
                    autoFocus
                    placeholder="Tên cuộc trò chuyện..."
                    className="w-full text-xs px-2.5 py-1 rounded-sm border-2 border-[#0b7a75] bg-white dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] focus:outline-none"
                  />
                  <button
                    onClick={handleSaveRename}
                    className="p-1 rounded-sm bg-[#0b7a75] text-white hover:bg-[#08635f] cursor-pointer"
                    title="Lưu tên"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
                  className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-sm bg-[#f0f6ff] dark:bg-[#242436] hover:bg-[#e1edff] dark:hover:bg-[#2e2e42] text-[#111118] dark:text-[#f0f6ff] border border-[#111118] dark:border-[#2a2a3a] shadow-[0_1px_0_0_#111118] text-xs transition-colors cursor-pointer text-left"
                  title="Bấm để xem & đổi danh sách cuộc trò chuyện"
                >
                  <span className="truncate font-medium flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#0b7a75] dark:text-[#2dd4bf] shrink-0" />
                    <span className="truncate">{currentSession?.title || "Cuộc trò chuyện mới"}</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#111118]/60 dark:text-[#f0f6ff]/60 shrink-0" />
                </button>
              )}

              {/* Menu Dropdown danh sách các phiên */}
              {isSessionDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-full bg-white dark:bg-[#1b1b26] border-2 border-[#111118] dark:border-[#2a2a3a] rounded-md shadow-[0_6px_16px_rgba(0,0,0,0.2)] z-50 p-1.5 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-mono uppercase text-[#111118]/50 dark:text-[#f0f6ff]/50 border-b border-[#e1edff] dark:border-[#2a2a3a] mb-1 flex items-center justify-between">
                    <span>Lịch sử gần đây ({sessions.length}/5)</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCreateNewSession();
                      }}
                      className="text-[9px] text-[#0b7a75] dark:text-[#2dd4bf] font-sans hover:underline cursor-pointer flex items-center gap-0.5"
                    >
                      <Plus className="w-2.5 h-2.5" /> Chat mới
                    </button>
                  </div>
                  {sessions.length === 0 ? (
                    <div className="p-3 text-center text-[11px] text-[#111118]/50 dark:text-[#f0f6ff]/50">
                      Chưa có lịch sử cuộc trò chuyện nào
                    </div>
                  ) : (
                    sessions.map((sess) => {
                      const isActive = sess.id === currentSessionId;
                      return (
                        <div
                          key={sess.id}
                          className={`flex items-center justify-between p-2 rounded-sharp text-xs cursor-pointer transition-colors ${
                            isActive
                              ? "bg-[#0b7a75] text-white font-medium"
                              : "hover:bg-[#f0f6ff] dark:hover:bg-[#242436] text-[#111118] dark:text-[#f0f6ff]"
                          }`}
                          onClick={() => handleSwitchSession(sess.id)}
                        >
                          <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{sess.title}</span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(sess.id);
                            }}
                            className={`p-1 rounded-sharp hover:bg-black/20 ${isActive ? "text-white" : "text-rose-500 hover:text-rose-700"} shrink-0 cursor-pointer`}
                            title="Xóa phiên trò chuyện này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Các nút sửa / xóa phiên hiện tại */}
            {!isEditingTitle && (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    setEditTitleInput(currentSession?.title || "");
                    setIsEditingTitle(true);
                  }}
                  className="p-1.5 rounded-sm hover:bg-[#e1edff] dark:hover:bg-[#242436] text-[#111118]/70 dark:text-[#f0f6ff]/70 transition-colors cursor-pointer"
                  title="Đổi tên cuộc trò chuyện này"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteSession(currentSessionId)}
                  className="p-1.5 rounded-sm hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                  title="Xóa cuộc trò chuyện này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Vùng tin nhắn Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loadingHistory ? (
              <div className="flex items-center justify-center h-32 text-xs text-[#111118]/50 dark:text-[#f0f6ff]/50">
                Đang tải lịch sử cuộc trò chuyện...
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-sm p-3.5 text-sm leading-relaxed border ${
                      msg.role === "user"
                        ? "bg-[#0b7a75] text-white border-[#111118] shadow-[0_2px_0_0_#111118]"
                        : "bg-[#f0f6ff] dark:bg-[#111118] text-[#111118] dark:text-[#f0f6ff] border-[#111118] shadow-[0_2px_0_0_#111118]"
                    }`}
                  >
                    {msg.role === "ai" ? renderAIMessageText(msg.text) : msg.text}
                  </div>
                  <span className="text-[10px] text-[#111118]/40 dark:text-[#f0f6ff]/40 mt-1 font-mono px-1">
                    {msg.role === "user" ? "Bạn" : "PeerMind AI"}
                  </span>
                </div>
              ))
            )}

            {loading && (
              <div className="flex items-start gap-2">
                <div className="rounded-sm p-3.5 bg-[#f0f6ff] dark:bg-[#111118] border border-[#111118] shadow-[0_2px_0_0_#111118] text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#0b7a75] animate-ping" />
                  <span>AI đang đọc trang liên quan và soạn câu trả lời...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Thanh gợi ý câu hỏi theo trang hiện tại */}
          <div className="px-4 py-2 border-t border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff]/30 dark:bg-[#111118]/30 flex items-center gap-1.5 overflow-x-auto text-[11px]">
            <span className="text-[#111118]/50 dark:text-[#f0f6ff]/50 shrink-0 font-mono">Gợi ý:</span>
            <button
              onClick={() => handleSendQuestion(`Tóm tắt nội dung chính của Trang ${currentPage}`)}
              className="shrink-0 px-2.5 py-1 rounded-sm border border-[#111118] bg-white dark:bg-[#242436] hover:bg-[#e1edff] text-[#111118] dark:text-[#f0f6ff] cursor-pointer shadow-[0_1px_0_0_#111118]"
            >
              📄 Tóm tắt trang {currentPage}
            </button>
            <button
              onClick={() => handleSendQuestion(`Những điểm cần ghi nhớ ở Trang ${currentPage} là gì?`)}
              className="shrink-0 px-2.5 py-1 rounded-sm border border-[#111118] bg-white dark:bg-[#242436] hover:bg-[#e1edff] text-[#111118] dark:text-[#f0f6ff] cursor-pointer shadow-[0_1px_0_0_#111118]"
            >
              💡 Điểm cần nhớ trang {currentPage}
            </button>
          </div>

          {/* Ô nhập câu hỏi */}
          <div className="p-3 border-t border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendQuestion();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Đặt câu hỏi về tài liệu hoặc yêu cầu giải thích..."
                disabled={loading}
                className="flex-1 h-11 px-4 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff] dark:bg-[#111118] text-sm text-[#111118] dark:text-[#f0f6ff] focus:outline-none focus:border-[#0b7a75] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-11 h-11 rounded-pill bg-[#0b7a75] hover:bg-[#08635f] text-white flex items-center justify-center border border-[#111118] shadow-[0_2px_0_0_#111118] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:translate-y-[1px]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
