// components/documents/DocumentStudioView.tsx — Màn hình Studio chuyên dụng (Split-screen Reader + AI Chatbot)
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
  Upload,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import { extractDocumentContent, sanitizeExtractedText } from "../../services/pdfService";
import { supabase } from "../../services/supabaseClient";
import { isValidUUID } from "../../utils";

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
  onUpdateDoc,
}) => {
  const [activeDoc, setActiveDoc] = useState<DocumentItem>(doc);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);
  const [fontSize, setFontSize] = useState<number>(16);
  const [selectedText, setSelectedText] = useState<string>("");
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [isUpdatingFile, setIsUpdatingFile] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const readerContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveDoc(doc);
    // Nếu doc chưa có pagesContent thì tải ngay cho riêng tài liệu này
    if (!doc.pagesContent || doc.pagesContent.length === 0) {
      (async () => {
        try {
          const { data: detail } = await supabase
            .from("documents")
            .select("pages_content")
            .eq("id", doc.id)
            .single();

          if (detail && Array.isArray(detail.pages_content) && detail.pages_content.length > 0) {
            setActiveDoc((prev) => ({ ...prev, pagesContent: detail.pages_content }));
            onUpdateDoc?.({ ...doc, pagesContent: detail.pages_content });
          }
        } catch (e) {
          console.warn("Lỗi tải chi tiết trang trong Studio:", e);
        }
      })();
    }
  }, [doc, onUpdateDoc]);

  const pages = activeDoc.pagesContent && activeDoc.pagesContent.length > 0
    ? activeDoc.pagesContent
    : [activeDoc.title];
  const totalPages = pages.length;

  const subjectStyle = getSubjectStyle(activeDoc.subject);

  // Phát hiện tài liệu cũ bị lỗi chỉ có placeholder dummy
  const isDummyContent =
    pages.length <= 4 &&
    pages.some(
      (p) =>
        p.includes("Chương 1: Giới thiệu") ||
        p.includes("Chương 1: Các khái niệm cơ bản") ||
        p.includes("Tài liệu học tập chuyên ngành định dạng")
    );

  // 1. Tải lịch sử trò chuyện của tài liệu này từ Supabase
  useEffect(() => {
    async function loadHistory() {
      setLoadingHistory(true);
      const defaultWelcome: ChatMessage = {
        role: "ai",
        text: `Chào ${userName}! Mình là Trợ lý AI của tài liệu **"${activeDoc.title}"**. Mình đã đọc hiểu toàn bộ ${totalPages} trang của tài liệu này. Bạn có thể hỏi mình bất kỳ chi tiết nào hoặc bôi đen văn bản bên trái để mình giải thích nha! ✨`,
        isGemini: true,
      };

      try {
        const history = await fetchDocConversations(activeDoc.id);
        if (history.length > 0) {
          // Đồng bộ lại tiêu đề tài liệu trong lời chào đầu tiên nếu tên tài liệu đã được cập nhật
          const updatedHistory = history.map((msg, idx) => {
            if (idx === 0 && msg.role === "ai" && (msg.text.includes("Mình là Trợ lý AI của tài liệu") || msg.text.startsWith("Chào "))) {
              return defaultWelcome;
            }
            return msg;
          });
          setMessages(updatedHistory);
        } else {
          // Tin nhắn mở đầu mặc định
          setMessages([defaultWelcome]);
        }
      } catch (err) {
        console.warn("Lỗi tải lịch sử chat:", err);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadHistory();
  }, [activeDoc.id, activeDoc.title, totalPages, userName]);

  // Cuộn khung đọc sách về đầu trang mỗi khi chuyển trang
  useEffect(() => {
    readerContentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

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
      const res = await askAI(q, activeDoc, newHistory);
      const aiMsg: ChatMessage = { role: "ai", text: res.text, isGemini: res.isGemini };
      setMessages((prev) => [...prev, aiMsg]);

      // Lưu cuộc trò chuyện vào Supabase DB
      await saveDocConversation(activeDoc.id, q, res.text);
    } catch {
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

  // 5. Cập nhật / Tải lại file nguồn trực tiếp trong Studio
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdatingFile(true);
    try {
      const extracted = await extractDocumentContent(file);
      const updated: DocumentItem = {
        ...activeDoc,
        pagesCount: extracted.totalPages,
        pagesContent: extracted.pages,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        updatedAt: "Vừa xong",
      };

      setActiveDoc(updated);
      onUpdateDoc?.(updated);

      // Lưu cập nhật vào CSDL Supabase nếu là tài khoản thật
      if (isValidUUID(userId)) {
        await supabase
          .from("documents")
          .update({
            total_pages: extracted.totalPages,
            pages_content: extracted.pages,
          })
          .eq("id", activeDoc.id);
      } else {
        // Cập nhật cho tài khoản khách trong LocalStorage
        const localKey = `peermind_docs_${userId || "guest"}`;
        try {
          const currentLocal = JSON.parse(localStorage.getItem(localKey) || "[]");
          const idx = currentLocal.findIndex((d: any) => d.id === activeDoc.id);
          if (idx !== -1) {
            currentLocal[idx].pagesCount = extracted.totalPages;
            currentLocal[idx].pagesContent = extracted.pages;
            localStorage.setItem(localKey, JSON.stringify(currentLocal));
          }
        } catch {}
      }

      setCurrentPage(1);
      alert(`Đã trích xuất thành công ${extracted.totalPages} trang từ "${file.name}"!`);
    } catch (err: any) {
      alert("Không thể trích xuất nội dung file: " + (err.message || "Lỗi không xác định"));
    } finally {
      setIsUpdatingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const rawPageText = pages[currentPage - 1] || "Không có nội dung cho trang này.";
  // Làm sạch các thẻ HTML bookmark của Word (<a id="_Toc..."></a>) để văn bản luôn sạch đẹp
  const currentPageText = useMemo(() => {
    return sanitizeExtractedText(rawPageText);
  }, [rawPageText]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full overflow-hidden bg-[#f0f6ff] dark:bg-[#111118] transition-colors duration-150">
      {/* Input ẩn để chọn file khi muốn cập nhật / trích xuất lại */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.pptx,.txt,.md"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ── Top Bar Header Studio ─────────────────────────────────────────── */}
      <header className="h-14 shrink-0 bg-white dark:bg-[#1b1b26] border-b border-[#e1edff] dark:border-[#2a2a3a] px-4 sm:px-6 flex items-center justify-between shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] z-20">
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
            onClick={() => fileInputRef.current?.click()}
            disabled={isUpdatingFile}
            title="Chọn lại file DOCX/PDF để trích xuất lại nội dung"
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-[5000px] border border-[#111118] bg-white dark:bg-[#242436] hover:bg-[#e1edff] text-xs font-normal text-[#111118] dark:text-[#f0f6ff] shadow-[0_2px_0_0_#111118] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{isUpdatingFile ? "Đang trích xuất..." : "Cập nhật file"}</span>
          </button>

          <button
            onClick={() => handleSendQuestion(`Hãy tóm tắt ngắn gọn các ý cốt lõi nhất của tài liệu "${activeDoc.title}"`)}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[5000px] bg-[#ffda00] text-[#111118] border border-[#111118] text-xs font-normal shadow-[0_2px_0_0_#111118] hover:bg-[#ebd000] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tóm tắt</span>
          </button>

          <button
            onClick={() => handleSendQuestion(`Vẽ sơ đồ tư duy phân nhánh cho tài liệu "${activeDoc.title}"`)}
            className="hidden md:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[5000px] bg-[#91d8ec] text-[#111118] border border-[#111118] text-xs font-normal shadow-[0_2px_0_0_#111118] hover:bg-[#80cee4] active:translate-y-[1px] transition-all cursor-pointer"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Mindmap</span>
          </button>

          <button
            onClick={() => handleSendQuestion(`Soạn 3 câu hỏi trắc nghiệm ôn tập cho tài liệu "${activeDoc.title}"`)}
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
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="w-8 h-8 rounded-full border border-[#111118] bg-white dark:bg-[#1b1b26] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#e1edff] active:scale-95 transition-all cursor-pointer shadow-[0_1px_0_0_#111118]"
                title="Trang trước"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono px-3 py-1 bg-[#e1edff] dark:bg-[#242436] rounded-[5000px] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] font-normal">
                Trang {currentPage} / {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="w-8 h-8 rounded-full border border-[#111118] bg-white dark:bg-[#1b1b26] flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#e1edff] active:scale-95 transition-all cursor-pointer shadow-[0_1px_0_0_#111118]"
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
                className="px-2 py-0.5 rounded border border-[#111118] bg-white dark:bg-[#1b1b26] font-mono hover:bg-[#e1edff] text-xs"
                title="Giảm cỡ chữ"
              >
                A-
              </button>
              <button
                onClick={() => setFontSize((s) => Math.min(22, s + 1))}
                className="px-2 py-0.5 rounded border border-[#111118] bg-white dark:bg-[#1b1b26] font-mono hover:bg-[#e1edff] text-xs"
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
              className="w-full max-w-3xl min-h-[550px] h-auto bg-white dark:bg-[#1b1b26] rounded-[24px] border-2 border-[#111118] dark:border-[#2a2a3a] p-6 sm:p-10 shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000] leading-relaxed text-[#111118] dark:text-[#f0f6ff] transition-all select-text flex flex-col justify-between break-words mb-10 shrink-0"
            >
              <div>
                {/* Banner thông báo nếu tài liệu cũ chưa trích xuất DOCX */}
                {isDummyContent && (
                  <div className="mb-6 p-4 rounded-[16px] border-2 border-[#111118] bg-[#ffda00]/20 text-[#111118] dark:text-[#f0f6ff] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_2px_0_0_#111118]">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-xl">⚠️</span>
                      <div>
                        <p className="font-semibold">Tài liệu này được tải lên trước khi cập nhật tính năng đọc DOCX</p>
                        <p className="text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-normal">
                          Nhấp nút bên cạnh để chọn lại file gốc "{activeDoc.title}.docx" và mở đầy đủ 34 trang nhé!
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUpdatingFile}
                      className="shrink-0 px-4 py-2 rounded-[5000px] bg-[#0b7a75] hover:bg-[#08635f] text-white text-xs font-medium border border-[#111118] shadow-[0_2px_0_0_#111118] transition-all cursor-pointer"
                    >
                      {isUpdatingFile ? "Đang trích xuất..." : "📥 Chọn file đọc ngay →"}
                    </button>
                  </div>
                )}

                {/* Tiêu đề đầu trang */}
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#e1edff] dark:border-[#2a2a3a] text-xs font-mono text-[#111118]/60 dark:text-[#f0f6ff]/60">
                  <span className="truncate max-w-[200px] sm:max-w-md">{activeDoc.title}</span>
                  <span className="bg-[#e1edff] dark:bg-[#242436] px-2.5 py-0.5 rounded-[5000px] border border-[#111118] shrink-0">
                    TRANG {currentPage}
                  </span>
                </div>

                {/* Nội dung trang định dạng Markdown */}
                <div className="prose dark:prose-invert max-w-none text-base leading-relaxed break-words overflow-x-auto selection:bg-[#ffda00] selection:text-[#111118]">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {currentPageText}
                  </ReactMarkdown>
                </div>
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
                onClick={() => handleSendQuestion(`Tóm tắt ý chính của đoạn sau: "${selectedText}"`)}
                className="px-3 py-1 rounded-[5000px] bg-[#ffda00] hover:bg-[#ebd000] text-[#111118] font-normal transition-colors cursor-pointer"
              >
                Tóm tắt
              </button>
            </div>
          )}
        </section>

        {/* ─── CỘT PHẢI: AI TUTOR PANEL ────────────────────────────────────── */}
        <section className="w-full lg:w-[450px] xl:w-[500px] flex flex-col h-full bg-white dark:bg-[#1b1b26] border-t lg:border-t-0 border-[#e1edff] dark:border-[#2a2a3a] shadow-[-4px_0_12px_rgba(0,0,0,0.03)] overflow-hidden">
          {/* Header AI Tutor */}
          <div className="h-12 shrink-0 px-4 border-b border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between text-xs bg-[#f0f6ff]/50 dark:bg-[#111118]/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0b7a75] text-white flex items-center justify-center font-mono">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <span className="font-normal text-[#111118] dark:text-[#f0f6ff]">Trợ lý AI PeerMind</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#16ab59]">
              <span className="w-2 h-2 rounded-full bg-[#16ab59] animate-pulse" />
              <span>RAG Active</span>
            </div>
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
                    className={`max-w-[90%] rounded-[20px] p-3.5 text-sm leading-relaxed border ${
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
                <div className="rounded-[20px] p-3.5 bg-[#f0f6ff] dark:bg-[#111118] border border-[#111118] shadow-[0_2px_0_0_#111118] text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 flex items-center gap-2">
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
              className="shrink-0 px-2.5 py-1 rounded-[5000px] border border-[#111118] bg-white dark:bg-[#242436] hover:bg-[#e1edff] text-[#111118] dark:text-[#f0f6ff] cursor-pointer shadow-[0_1px_0_0_#111118]"
            >
              📄 Tóm tắt trang {currentPage}
            </button>
            <button
              onClick={() => handleSendQuestion(`Những điểm cần ghi nhớ ở Trang ${currentPage} là gì?`)}
              className="shrink-0 px-2.5 py-1 rounded-[5000px] border border-[#111118] bg-white dark:bg-[#242436] hover:bg-[#e1edff] text-[#111118] dark:text-[#f0f6ff] cursor-pointer shadow-[0_1px_0_0_#111118]"
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
                className="flex-1 h-11 px-4 rounded-[5000px] border border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff] dark:bg-[#111118] text-sm text-[#111118] dark:text-[#f0f6ff] focus:outline-none focus:border-[#0b7a75] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-11 h-11 rounded-full bg-[#0b7a75] hover:bg-[#08635f] text-white flex items-center justify-center border border-[#111118] shadow-[0_2px_0_0_#111118] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all active:translate-y-[1px]"
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
