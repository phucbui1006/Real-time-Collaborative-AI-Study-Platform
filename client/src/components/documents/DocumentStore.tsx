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
} from "lucide-react";
import { DocumentItem } from "../../services/aiService";

type DocumentStoreProps = {
  docs: DocumentItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onUpload: (files: File[], customSubject?: string) => void;
  isAIChatOpen: boolean;
  isLoading?: boolean;
};

// Helper function ánh xạ màu sắc và icon theo môn học
export function getSubjectStyle(subject: string) {
  const s = subject.toUpperCase();
  if (s.includes("TRÍ TUỆ NHÂN TẠO") || s.includes("AI")) {
    return {
      box: "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-200/60 dark:border-violet-500/30",
      text: "text-violet-600 dark:text-violet-400 font-semibold",
      icon: <Bot className="h-4 w-4" strokeWidth={1.75} />,
    };
  }
  if (s.includes("CÔNG NGHỆ") || s.includes("LẬP TRÌNH") || s.includes("WEB")) {
    return {
      box: "bg-sky-50 dark:bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-200/60 dark:border-sky-500/30",
      text: "text-sky-600 dark:text-sky-400 font-semibold",
      icon: <Code2 className="h-4 w-4" strokeWidth={1.75} />,
    };
  }
  if (s.includes("VẬT LÝ")) {
    return {
      box: "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/30",
      text: "text-amber-600 dark:text-amber-400 font-semibold",
      icon: <Zap className="h-4 w-4" strokeWidth={1.75} />,
    };
  }
  if (s.includes("NGOẠI NGỮ") || s.includes("TIẾNG ANH") || s.includes("ENGLISH")) {
    return {
      box: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/30",
      text: "text-emerald-600 dark:text-emerald-400 font-semibold",
      icon: <Languages className="h-4 w-4" strokeWidth={1.75} />,
    };
  }
  // Mặc định là TOÁN HỌC hoặc môn khác
  return {
    box: "bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-400 font-semibold",
    icon: <Calculator className="h-4 w-4" strokeWidth={1.75} />,
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
  isAIChatOpen,
  isLoading = false,
}: DocumentStoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("TẤT CẢ");
  const [sortBy, setSortBy] = useState<"newest" | "progress" | "name">("newest");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("TOÁN HỌC");
  const [dragging, setDragging] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

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
    const subs = Array.from(new Set(docs.map((d) => d.subject)));
    return ["TẤT CẢ", ...subs];
  }, [docs]);

  const filteredDocs = useMemo(() => {
    return docs
      .filter((d) => {
        const matchesSearch =
          d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.subject.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === "TẤT CẢ" || d.subject === activeCategory;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        if (sortBy === "progress") return b.progress - a.progress;
        if (sortBy === "name") return a.title.localeCompare(b.title);
        return b.id - a.id;
      });
  }, [docs, searchQuery, activeCategory, sortBy]);

  const handleFileChange = (files: FileList | File[] | null, subject = selectedSubject) => {
    if (files && files.length > 0) {
      onUpload(Array.from(files), subject);
      setIsUploadModalOpen(false);
    }
  };

  return (
    <section className={`${isAIChatOpen ? "lg:col-span-8" : "lg:col-span-12"} min-w-0`}>
      {/* ── 1. Top Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Thư viện cá nhân</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight sm:text-3xl">Kho tài liệu học tập</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Quản lý, học tập và tương tác AI trực tiếp trên tài liệu của bạn.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs shadow-indigo-500/20 active:translate-y-[1px] transition-all cursor-pointer text-sm"
          >
            <Upload className="h-4 w-4" strokeWidth={1.75} />
            Tải tài liệu lên
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

      {/* ── 2. Thanh Tìm Kiếm & Bộ Lọc (Thiết kế phân tầng chuẩn mực, không bao giờ vỡ bố cục khi mở AI) ── */}
      <div className="mt-6 space-y-3 rounded-2xl bg-white dark:bg-slate-900 p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        {/* Hàng 1: Ô tìm kiếm toàn diện + Bộ chọn sắp xếp (Thẳng hàng tuyệt đối) */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tài liệu theo tên hoặc môn học…"
              className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-9 pr-3 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
            />
          </div>

          {/* Sắp xếp */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 shrink-0 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none cursor-pointer focus:border-indigo-600 shadow-2xs"
          >
            <option value="newest">Mới nhất</option>
            <option value="progress">Tiến độ cao nhất</option>
            <option value="name">Tên A-Z</option>
          </select>
        </div>

        {/* Hàng 2: Bộ lọc danh mục môn học (Soft Tinted Filter Pills) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Môn học:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`h-7 rounded-md px-2.5 text-xs transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white border border-indigo-500 font-semibold shadow-2xs"
                  : "bg-white dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 font-medium"
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
                className="flex flex-col justify-between rounded-xl p-5 border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 h-[210px] animate-pulse shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
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
          <div className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" strokeWidth={1.75} />
            <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-50 text-sm">Không tìm thấy tài liệu nào</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Thử thay đổi từ khóa tìm kiếm hoặc lọc danh mục khác.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("TẤT CẢ");
              }}
              className="mt-4 inline-flex items-center h-8 px-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-2xs transition-colors cursor-pointer"
            >
              Xóa bộ lọc
            </button>
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
              const fileTypeBadge = getFileTypeBadgeStyle(doc.fileType);
              const progressStyle = getProgressBarStyle(doc.progress);

              return (
                <div
                  key={doc.id}
                  onClick={() => onSelect(doc.id)}
                  className={`group relative flex flex-col justify-between rounded-xl p-5 border transition-[border-color,box-shadow,transform] duration-200 cursor-pointer shadow-2xs ${
                    active
                      ? "bg-white dark:bg-slate-900 border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-600/20 shadow-md"
                      : "bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/60 hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  {/* Top Info */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg border shrink-0 ${subjectStyle.box}`}>
                          {subjectStyle.icon}
                        </div>
                        <div>
                          <span className={`text-[10px] font-bold tracking-wider uppercase ${subjectStyle.text}`}>
                            {doc.subject}
                          </span>
                          {doc.fileType && (
                            <span className={`ml-2 rounded px-1.5 py-0.5 text-[9px] uppercase ${fileTypeBadge}`}>
                              {doc.fileType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu 3 chấm */}
                      <div className="relative doc-menu-container" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" strokeWidth={1.75} />
                        </button>
                        {activeMenuId === doc.id && (
                          <div className="absolute right-0 top-9 z-20 w-36 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 shadow-md">
                            <button
                              onClick={() => {
                                onDelete(doc.id);
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                              Xóa tài liệu
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-3 font-semibold text-slate-900 dark:text-slate-50 text-base sm:text-lg line-clamp-2 leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {doc.title}
                    </h3>
                  </div>

                  {/* Progress & Bottom Metadata */}
                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-medium text-slate-500 dark:text-slate-400">Tiến độ</span>
                      <span className={`font-mono tabular-nums font-bold ${progressStyle.text}`}>
                        {doc.progress}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-1.5 rounded-full transition-[width] duration-300 ease-out ${progressStyle.bar}`}
                        style={{ width: `${doc.progress}%` }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
                      <span>{doc.pagesCount ? `${doc.pagesCount} trang` : "PDF"} · {doc.fileSize || "3 MB"}</span>
                      <span>{doc.updatedAt || "Gần đây"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. Modal Tải File ────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-5 right-5 flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>

            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">Tải tài liệu mới lên</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Hỗ trợ định dạng PDF, DOCX, PPTX. AI sẽ tự động phân tích và sinh câu hỏi.
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase mb-1.5">Chọn môn học</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-600"
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
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                  dragging
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50 hover:bg-slate-50 dark:hover:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Upload className="h-6 w-6 text-slate-400" strokeWidth={1.75} />
                <span className="mt-2.5 font-medium text-slate-900 dark:text-slate-100 text-sm">Nhấp để chọn file hoặc kéo thả vào đây</span>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF, DOCX, PPTX hoặc hình ảnh</span>
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
