import { useRef, useState, useMemo, useEffect } from "react";
import {
  Search,
  Upload,
  MoreVertical,
  Trash2,
  X,
  FileText,
  Bot,
  Code2,
  Zap,
  Languages,
  Calculator,
  Loader2,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { DocumentItem } from "../../services/aiService";

type DocumentStoreProps = {
  docs: DocumentItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onUpload: (files: File[], customSubject?: string) => Promise<void> | void;
  onReimport?: (docId: number, file: File) => Promise<void> | void;
  isAIChatOpen: boolean;
  isLoading?: boolean;
  userName?: string;
};

// Helper function ánh xạ màu sắc và icon theo môn học (chuẩn SuperHi)
export function getSubjectStyle(subject: string) {
  const s = subject.toUpperCase();
  if (s.includes("TRÍ TUỆ NHÂN TẠO") || s.includes("AI")) {
    return {
      box: "bg-[#ffda00] text-[#111118] border border-[#111118]",
      text: "text-[#111118]",
      icon: <Bot className="h-5 w-5" strokeWidth={1.75} />,
    };
  }
  if (s.includes("CÔNG NGHỆ") || s.includes("LẬP TRÌNH") || s.includes("WEB")) {
    return {
      box: "bg-[#91d8ec] text-[#111118] border border-[#111118]",
      text: "text-[#111118]",
      icon: <Code2 className="h-5 w-5" strokeWidth={1.75} />,
    };
  }
  if (s.includes("VẬT LÝ")) {
    return {
      box: "bg-[#ffbac4] text-[#111118] border border-[#111118]",
      text: "text-[#111118]",
      icon: <Zap className="h-5 w-5" strokeWidth={1.75} />,
    };
  }
  if (s.includes("NGOẠI NGỮ") || s.includes("TIẾNG ANH") || s.includes("ENGLISH")) {
    return {
      box: "bg-[#16ab59] text-white border border-[#111118]",
      text: "text-[#111118]",
      icon: <Languages className="h-5 w-5" strokeWidth={1.75} />,
    };
  }
  return {
    box: "bg-[#ffda00] text-[#111118] border border-[#111118]",
    text: "text-[#111118]",
    icon: <Calculator className="h-5 w-5" strokeWidth={1.75} />,
  };
}

// Helper function nhãn định dạng File
export function getFileTypeBadgeStyle(type?: string) {
  switch (type) {
    case "PDF":
      return "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-200/70 dark:border-rose-500/30 font-semibold";
    case "PPTX":
      return "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-200/70 dark:border-amber-500/30 font-semibold";
    case "DOCX":
      return "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-200/70 dark:border-sky-500/30 font-semibold";
    default:
      return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 font-medium";
  }
}

// Helper dynamic progress bar
export function getProgressBarStyle(progress: number) {
  if (progress < 50) {
    return { bar: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" };
  }
  if (progress < 80) {
    return { bar: "bg-indigo-600 dark:bg-indigo-500", text: "text-indigo-600 dark:text-indigo-400" };
  }
  return { bar: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
}

export function DocumentStore({
  docs,
  selectedId,
  onSelect,
  onDelete,
  onUpload,
  onReimport,
  isAIChatOpen,
  isLoading = false,
  userName = "Minh Anh",
}: DocumentStoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);
  const reimportInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("TẤT CẢ");
  const [sortBy, setSortBy] = useState<"newest" | "name">("newest");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("TOÁN HỌC");
  const [dragging, setDragging] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [reimportDocId, setReimportDocId] = useState<number | null>(null);

  // Trạng thái thông báo lỗi khi chọn file không hợp lệ
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string | null>(null);

  const handleCloseModal = () => {
    setIsUploadModalOpen(false);
    setUploadErrorMsg(null);
  };

  const handleFileChange = async (files: FileList | File[] | null, subject = selectedSubject) => {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const file = fileList[0];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);

    // Kiểm tra định dạng .doc cũ (trình duyệt không đọc được)
    if (ext === ".doc") {
      setUploadErrorMsg("Vui lòng lưu file thành .docx hoặc .pdf rồi tải lên lại");
      return;
    }

    // 1. Kiểm tra định dạng sơ bộ
    const allowed = [".pdf", ".docx", ".pptx", ".txt", ".md", ".png", ".jpg", ".jpeg"];
    if (!allowed.includes(ext)) {
      setUploadErrorMsg(`Định dạng file "${ext}" không được hỗ trợ. Vui lòng chọn file PDF, Word (.docx) hoặc PowerPoint (.pptx).`);
      return;
    }

    // 2. Kiểm tra dung lượng (tối đa 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setUploadErrorMsg(`File "${file.name}" (${sizeMb} MB) vượt quá dung lượng tối đa cho phép là 20 MB.`);
      return;
    }

    // File hợp lệ: Đóng popup ngay lập tức để không cản trở người dùng
    setIsUploadModalOpen(false);
    setUploadErrorMsg(null);

    // Bắt đầu quá trình bóc tách trong nền trên ô tài liệu bên dưới
    try {
      await onUpload(fileList, subject);
    } catch (err: any) {
      console.error("Lỗi khi tải file:", err);
    }
  };

  const triggerReimport = (id: number) => {
    setReimportDocId(id);
    setActiveMenuId(null);
    reimportInputRef.current?.click();
  };

  const handleReimportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && reimportDocId !== null && onReimport) {
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (ext === ".doc") {
        setUploadErrorMsg("Vui lòng lưu file thành .docx hoặc .pdf rồi tải lên lại");
        setIsUploadModalOpen(true);
        e.target.value = "";
        setReimportDocId(null);
        return;
      }
      await onReimport(reimportDocId, file);
    }
    e.target.value = "";
    setReimportDocId(null);
  };

  useEffect(() => {
    if (activeMenuId === null) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".doc-menu-container")) {
        setActiveMenuId(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [activeMenuId]);

  const categories = useMemo(() => {
    const subs = Array.from(new Set(docs.map((d) => d.subject))).filter(
      (s) => s && s.trim().toUpperCase() !== "TEST"
    );
    return ["TẤT CẢ", ...subs];
  }, [docs]);

  const filteredDocs = useMemo(() => {
    return docs
      .filter((d) => {
        const tLower = d.title.trim().toLowerCase();
        const sLower = d.subject.trim().toLowerCase();
        if (tLower === "test" || tLower.startsWith("test ") || sLower === "test") return false;

        const matchesSearch =
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === "TẤT CẢ" || d.subject === activeCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.title.localeCompare(b.title);
        return b.id - a.id;
      });
  }, [docs, searchQuery, activeCategory, sortBy]);

  return (
    <section className={`${isAIChatOpen ? "lg:col-span-8" : "lg:col-span-12"} min-w-0 relative`}>
      {/* Hình trang trí cắt giấy phẳng (SuperHi decorative paper cutouts) */}
      <div
        className="pointer-events-none fixed -top-24 -right-24 w-[380px] h-[380px] bg-[#91d8ec] opacity-75 dark:opacity-20 z-0"
        style={{
          clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)",
          transform: "rotate(14deg)",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none fixed -bottom-24 -left-20 w-[400px] h-[400px] bg-[#ffda00] opacity-75 dark:opacity-20 z-0"
        style={{
          clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
          transform: "rotate(-8deg)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10">
        {/* ── 1. Top Header ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#16ab59] border border-[#111118]" />
              <span className="text-xs font-normal tracking-wide text-[#111118]/70 dark:text-[#f0f6ff]/70 uppercase">
                XIN CHÀO, {userName.toUpperCase()}
              </span>
            </div>
            <h1 className="mt-1 text-3xl sm:text-[42px] font-normal text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">
              Tài liệu &amp; Hỏi đáp AI
            </h1>
            <p className="mt-1 text-base font-normal text-[#111118]/75 dark:text-[#f0f6ff]/75">
              Hỏi đáp, tóm tắt và ghi nhớ kiến thức trên giáo trình của bạn.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-pill bg-[#0b7a75] hover:bg-[#08635f] dark:bg-[#2dd4bf] dark:text-[#111118] text-white font-normal border border-[#111118] shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000] active:translate-y-[2px] transition-transform cursor-pointer text-base"
            >
              <Upload className="h-5 w-5" strokeWidth={1.75} />
              <span>Tải tài liệu lên</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,image/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files)}
            />
          </div>
        </div>

        {/* ── 2. Thanh Tìm Kiếm & Bộ Lọc ────────────────────────────────────────── */}
        <div className="mt-8 space-y-4 rounded-md bg-white dark:bg-[#1b1b26] p-5 border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-[#111118]/50 dark:text-[#f0f6ff]/50">
                <Search className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm tài liệu theo tên hoặc môn học…"
                className="w-full h-12 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] pl-12 pr-4 text-base text-[#111118] dark:text-[#f0f6ff] placeholder:text-[#111118]/50 dark:placeholder:text-[#f0f6ff]/50 outline-none focus:border-[#0b7a75] dark:focus:border-[#2dd4bf] focus:ring-2 focus:ring-[#0b7a75] dark:focus:ring-[#2dd4bf] transition-colors"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-12 shrink-0 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] px-5 text-sm font-normal text-[#111118] dark:text-[#f0f6ff] outline-none cursor-pointer focus:border-[#0b7a75]"
            >
              <option value="newest">Mới nhất</option>
              <option value="name">Tên A-Z</option>
            </select>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 border-t border-[#e1edff] dark:border-[#2a2a3a]">
            <span className="text-xs font-normal text-[#111118]/60 dark:text-[#f0f6ff]/60 uppercase tracking-wider shrink-0 mr-1">
              Môn học:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`h-9 px-4 text-sm font-normal transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeCategory === cat
                    ? "rounded-pill bg-[#0b7a75] dark:bg-[#2dd4bf] text-white dark:text-[#111118] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]"
                    : "rounded-[8px] bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] hover:bg-[#d0e2ff] dark:hover:bg-[#2e2e42]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. Danh sách Tài liệu Grid ────────────────────────────────────────── */}
        <div className="mt-6">
          {isLoading ? (
            <div
              className={`grid gap-4 ${
                isAIChatOpen
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="flex flex-col justify-between rounded-md p-5 border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 h-[210px] animate-pulse shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-sm bg-slate-100 dark:bg-slate-800" />
                        <div className="h-3 w-20 rounded bg-slate-100 dark:bg-slate-800" />
                      </div>
                      <div className="h-4 w-4 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="h-4 w-4/5 rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-2.5 w-12 rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="h-2.5 w-8 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                    <div className="flex justify-between pt-1">
                      <div className="h-2 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                      <div className="h-2 w-16 rounded bg-slate-100 dark:bg-slate-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="rounded-md border border-dashed border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-12 text-center shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
              <FileText className="mx-auto h-10 w-10 text-[#0b7a75] dark:text-[#2dd4bf]" strokeWidth={1.75} />
              <h3 className="mt-3 text-base font-normal text-[#111118] dark:text-[#f0f6ff]">
                {docs.length === 0 ? "Kho tài liệu của bạn đang trống" : "Không tìm thấy tài liệu phù hợp"}
              </h3>
              <p className="mt-1 text-sm font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70 max-w-md mx-auto">
                {docs.length === 0
                  ? "Hãy tải lên giáo trình PDF, DOCX hoặc Slide bài giảng để bắt đầu khai phá kiến thức cùng Trợ lý AI nhé!"
                  : "Thử thay đổi từ khóa tìm kiếm hoặc chọn danh mục khác."}
              </p>
              {docs.length === 0 ? (
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="primary-button mt-5 mx-auto cursor-pointer"
                >
                  Tải tài liệu mới lên
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("TẤT CẢ");
                  }}
                  className="secondary-button mt-4 mx-auto cursor-pointer text-xs"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div
              className={`grid gap-4 ${
                isAIChatOpen
                  ? "grid-cols-1 sm:grid-cols-2"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {filteredDocs.map((doc) => {
                const active = doc.id === selectedId;
                const subjectStyle = getSubjectStyle(doc.subject);
                const isDocUploading = doc.isUploading;

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (!isDocUploading && !doc.uploadError) {
                        onSelect(doc.id);
                      }
                    }}
                    className={`group relative flex flex-col justify-between rounded-md p-6 border transition-[border-color,box-shadow,transform] duration-200 ${
                      isDocUploading
                        ? "bg-[#f0f6ff] dark:bg-[#1f1f2e] border-2 border-dashed border-[#0b7a75] dark:border-[#2dd4bf] shadow-[0_2px_0_0_#111118] cursor-wait"
                        : doc.uploadError
                        ? "bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 shadow-[0_2px_0_0_#111118]"
                        : active
                        ? "bg-white dark:bg-[#1b1b26] border-[#0b7a75] dark:border-[#2dd4bf] ring-2 ring-[#0b7a75] dark:ring-[#2dd4bf] shadow-[0_4px_0_0_#111118] dark:shadow-[0_4px_0_0_#000000] cursor-pointer"
                        : "bg-white dark:bg-[#1b1b26] border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] hover:border-[#0b7a75] dark:hover:border-[#2dd4bf] hover:shadow-[0_4px_0_0_#111118] hover:-translate-y-0.5 cursor-pointer"
                    }`}
                  >
                    {/* Top Info */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-11 w-11 items-center justify-center rounded-sm border border-[#111118] shrink-0 shadow-[0_1px_0_0_#111118] ${subjectStyle.box}`}>
                            {isDocUploading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-[#0b7a75] dark:text-[#2dd4bf]" />
                            ) : (
                              subjectStyle.icon
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`rounded-sharp px-3 py-0.5 text-xs font-normal border border-[#111118] ${subjectStyle.box}`}>
                                {doc.subject}
                              </span>
                              {doc.fileType && (
                                <span className="rounded-sharp px-2.5 py-0.5 text-xs uppercase border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff]">
                                  {doc.fileType}
                                </span>
                              )}
                              {isDocUploading ? (
                                <span className="inline-flex items-center gap-1.5 rounded-sharp px-2.5 py-0.5 text-xs font-normal bg-[#ffda00] text-[#111118] border border-[#111118] animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#111118] animate-ping" />
                                  {doc.uploadProgress || "Đang bóc tách..."}
                                </span>
                              ) : doc.uploadError ? (
                                <span className="rounded-sharp px-2.5 py-0.5 text-xs font-normal bg-rose-500 text-white border border-[#111118]">
                                  Lỗi tải lên
                                </span>
                              ) : doc.isPublic ? (
                                <span className="rounded-sharp px-2.5 py-0.5 text-xs font-normal bg-[#16ab59] text-white border border-[#111118]">
                                  Mẫu chung
                                </span>
                              ) : (
                                <span className="rounded-sharp px-2.5 py-0.5 text-xs font-normal bg-[#91d8ec] text-[#111118] border border-[#111118]">
                                  Cá nhân
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Menu 3 chấm */}
                        {!isDocUploading && (
                          <div className="relative doc-menu-container" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                            >
                              <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                            {activeMenuId === doc.id && (
                              <div className="absolute right-0 top-9 z-20 w-36 rounded-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-md">
                                {onReimport && (
                                  <button
                                    onClick={() => triggerReimport(doc.id)}
                                    className="flex w-full items-center gap-2 rounded-sharp px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5 text-[#0b7a75] dark:text-[#2dd4bf]" strokeWidth={1.75} />
                                    <span>Import lại</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    onDelete(doc.id);
                                    setActiveMenuId(null);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-sharp px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                                >
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                                  {doc.isPublic ? "Ẩn tài liệu" : "Xóa tài liệu"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <h3 className="mt-4 font-normal text-[#111118] dark:text-[#f0f6ff] text-lg sm:text-xl line-clamp-2 leading-snug">
                        {doc.title}
                      </h3>

                      {doc.uploadError && (
                        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-normal">
                          {doc.uploadError}
                        </p>
                      )}
                    </div>

                    {/* Bottom Metadata */}
                    <div className="mt-5 pt-3 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 font-mono tabular-nums">
                      <span>
                        {doc.pagesCount ? `${doc.pagesCount} trang` : isDocUploading ? "Đang đếm trang..." : "PDF"} · {doc.fileSize || "3 MB"}
                      </span>
                      {isDocUploading ? (
                        <span className="text-[#0b7a75] dark:text-[#2dd4bf] font-medium flex items-center gap-1.5 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          {doc.uploadProgress || "Đang xử lý..."}
                        </span>
                      ) : doc.uploadError ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(doc.id);
                          }}
                          className="text-rose-600 hover:underline cursor-pointer"
                        >
                          Xóa thẻ lỗi
                        </button>
                      ) : (
                        <span className="text-[#0b7a75] dark:text-[#2dd4bf] font-medium group-hover:underline flex items-center gap-1 transition-colors">
                          Mở Studio →
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Input ẩn hỗ trợ Import lại tài liệu */}
      <input
        ref={reimportInputRef}
        type="file"
        accept=".pdf,.docx,.pptx"
        className="hidden"
        onChange={handleReimportFile}
      />

      {/* ── 4. Modal Tải File ──────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111118]/60 backdrop-blur-xs"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-lg rounded-lg border-2 border-[#111118] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-7 shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute top-5 right-5 w-9 h-9 rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#111118] text-[#111118] dark:text-[#f0f6ff] flex items-center justify-center shadow-[0_2px_0_0_#111118] hover:bg-[#d5e5ff] active:translate-y-[1px] transition-transform cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>

            <h2 className="text-2xl font-normal text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">
              Tải tài liệu mới lên
            </h2>
            <p className="mt-1 text-sm font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
              Hỗ trợ định dạng PDF, Word (.docx), PowerPoint (.pptx). Hệ thống bóc tách chuẩn xác từng trang theo đúng file gốc.
            </p>

            {uploadErrorMsg && (
              <div className="mt-4 rounded-[4px] border-2 border-[#111118] bg-[#fee2e2] dark:bg-[#7f1d1d]/40 p-4 flex items-start gap-3 shadow-[0_2px_0_0_#111118]">
                <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center border border-[#111118] shrink-0">
                  <AlertCircle className="h-4 w-4" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                    Không thể chọn file này
                  </h4>
                  <p className="mt-0.5 text-xs text-rose-800 dark:text-rose-300">
                    {uploadErrorMsg}
                  </p>
                </div>
                <button
                  onClick={() => setUploadErrorMsg(null)}
                  className="text-rose-700 dark:text-rose-300 text-xs hover:underline cursor-pointer"
                >
                  Bỏ qua
                </button>
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-normal text-[#111118] dark:text-[#f0f6ff] uppercase mb-1.5">
                  Chọn môn học
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full h-12 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] px-4 text-base font-normal text-[#111118] dark:text-[#f0f6ff] outline-none focus:border-[#0b7a75]"
                >
                  <option value="TOÁN HỌC">Toán học</option>
                  <option value="NGOẠI NGỮ">Ngoại ngữ</option>
                  <option value="VẬT LÝ">Vật lý</option>
                  <option value="CÔNG NGHỆ">Công nghệ</option>
                  <option value="TRÍ TUỆ NHÂN TẠO">Trí tuệ nhân tạo</option>
                </select>
              </div>

              {/* Vùng thả file */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  handleFileChange(e.dataTransfer.files);
                }}
                onClick={() => modalFileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center rounded-[4px] border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
                  dragging
                    ? "border-[#0b7a75] bg-[#e1edff] dark:bg-[#242436]"
                    : "border-[#111118]/30 dark:border-[#2a2a3a] bg-[#f0f6ff] dark:bg-[#242436]/50 hover:border-[#0b7a75] hover:bg-[#e1edff]/60"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-[#91d8ec] border border-[#111118] text-[#111118] flex items-center justify-center mb-2 shadow-[0_2px_0_0_#111118]">
                  <Upload className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <span className="font-normal text-[#111118] dark:text-[#f0f6ff] text-sm">
                  Nhấp để chọn file hoặc kéo thả vào đây
                </span>
                <span className="mt-1 text-xs font-normal text-[#111118]/70 dark:text-[#f0f6ff]/70">
                  Hỗ trợ PDF, DOCX, PPTX (tối đa 20 MB)
                </span>
              </div>

              <input
                ref={modalFileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.pptx,image/*"
                className="hidden"
                onChange={(e) => handleFileChange(e.target.files)}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
