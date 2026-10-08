// components/documents/DocumentStore.tsx — Kho tài liệu cá nhân (Thiết kế nâng cấp)
import { useRef, useState, useMemo, useEffect } from "react";
import { DocumentItem } from "../../services/aiService";
import { Icon } from "../common/Icon";

type DocumentStoreProps = {
  docs: DocumentItem[];
  selectedId: number;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onUpload: (files: File[], customSubject?: string) => void;
  isAIChatOpen: boolean;
};

export function DocumentStore({
  docs,
  selectedId,
  onSelect,
  onDelete,
  onUpload,
  isAIChatOpen,
}: DocumentStoreProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // States cho tìm kiếm, bộ lọc & modal
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("TẤT CẢ");
  const [sortBy, setSortBy] = useState<"newest" | "progress" | "name">("newest");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("TOÁN HỌC");
  const [dragging, setDragging] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);

  // Lắng nghe sự kiện click ngoài để tự động đóng Menu 3 chấm
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

  // Lấy danh sách môn học duy nhất
  const categories = useMemo(() => {
    const subs = Array.from(new Set(docs.map((d) => d.subject)));
    return ["TẤT CẢ", ...subs];
  }, [docs]);

  // Lọc và sắp xếp danh sách tài liệu
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
    <section className={`${isAIChatOpen ? "lg:col-span-8" : "lg:col-span-12"} min-w-0 transition-all duration-300`}>
      {/* ── 1. Top Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            <span className="text-xs font-bold tracking-wider text-violet-700 uppercase">Thư viện cá nhân</span>
          </div>
          <h1 className="mt-1 text-3xl font-extrabold text-[#17204d] tracking-tight">Kho tài liệu học tập</h1>
          <p className="mt-1 text-sm text-slate-500">Quản lý, học tập và tương tác AI trực tiếp trên tài liệu của bạn.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 rounded-full bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition cursor-pointer"
          >
            <Icon className="h-4 w-4">
              <path d="M12 5v14M5 12h14" />
            </Icon>
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

      {/* ── 2. Thanh Tìm Kiếm & Bộ Lọc (Search & Filters) ────────────────────── */}
      <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white p-3.5 ring-1 ring-slate-200/80 shadow-2xs">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon className="h-4 w-4">
              <path d="m21 21-4.3-4.3M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z" />
            </Icon>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm tài liệu theo tên hoặc môn học…"
            className="w-full rounded-xl bg-slate-50 pl-10 pr-4 py-2 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-violet-200 border border-transparent focus:border-violet-400"
          />
        </div>

        {/* Lọc danh mục (Categories) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-[#17204d] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Sắp xếp (Sort) */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 outline-none cursor-pointer"
        >
          <option value="newest">Mới nhất</option>
          <option value="progress">Tiến độ cao nhất</option>
          <option value="name">Tên A-Z</option>
        </select>
      </div>

      {/* ── 3. Danh sách Tài liệu Grid ────────────────────────────────────────── */}
      <div className="mt-6">
        {filteredDocs.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <span className="text-4xl">🔍</span>
            <h3 className="mt-3 font-bold text-slate-800">Không tìm thấy tài liệu nào</h3>
            <p className="mt-1 text-sm text-slate-500">Thử thay đổi từ khóa tìm kiếm hoặc lọc danh mục khác.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("TẤT CẢ");
              }}
              className="mt-4 rounded-full bg-violet-100 px-4 py-2 text-xs font-bold text-violet-700 hover:bg-violet-200 transition cursor-pointer"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div
            className={`grid gap-5 ${
              isAIChatOpen
                ? "grid-cols-1 sm:grid-cols-2"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {/* Các Card Tài liệu */}
            {filteredDocs.map((doc) => {
              const active = doc.id === selectedId;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelect(doc.id)}
                  className={`group relative flex flex-col justify-between rounded-3xl p-5 border transition-all cursor-pointer ${
                    active
                      ? "bg-white border-violet-500 shadow-md ring-2 ring-violet-500/20"
                      : "bg-white border-slate-200/90 hover:border-violet-300 hover:shadow-md"
                  }`}
                >
                  {/* Top Info */}
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-2xl text-base font-bold text-white shadow-2xs"
                          style={{ background: doc.color }}
                        >
                          {doc.icon}
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase">
                            {doc.subject}
                          </span>
                          {doc.fileType && (
                            <span className="ml-2 rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                              {doc.fileType}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Menu 3 chấm */}
                      <div className="relative doc-menu-container" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                          className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                        >
                          <Icon className="h-4 w-4">
                            <circle cx="12" cy="5" r="1.5" />
                            <circle cx="12" cy="12" r="1.5" />
                            <circle cx="12" cy="19" r="1.5" />
                          </Icon>
                        </button>
                        {activeMenuId === doc.id && (
                          <div className="absolute right-0 top-9 z-20 w-36 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl">
                            <button
                              onClick={() => {
                                onDelete(doc.id);
                                setActiveMenuId(null);
                              }}
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              <Icon className="h-3.5 w-3.5">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </Icon>
                              Xóa tài liệu
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-3.5 font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-violet-700 transition">
                      {doc.title}
                    </h3>
                  </div>

                  {/* Progress & Bottom Metadata */}
                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span className="font-semibold text-slate-500">Tiến độ học</span>
                      <span className="font-bold text-slate-800">{doc.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${doc.progress}%`, background: doc.color }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>{doc.pagesCount ? `${doc.pagesCount} trang` : "PDF"} • {doc.fileSize || "3 MB"}</span>
                      <span>{doc.updatedAt || "Gần đây"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 5. Modal Tải File Chuyên Nghiệp ──────────────────────────────────── */}
      {isUploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-6 right-6 grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
            >
              <Icon className="h-4 w-4">
                <path d="m6 6 12 12M18 6 6 18" />
              </Icon>
            </button>

            <h2 className="text-2xl font-extrabold text-[#17204d]">Tải tài liệu mới lên</h2>
            <p className="mt-1 text-sm text-slate-500">
              Hỗ trợ định dạng PDF, DOCX, PPTX. AI sẽ tự động phân tích và sinh câu hỏi.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Chọn môn học</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold outline-none focus:border-violet-500"
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
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition cursor-pointer ${
                  dragging
                    ? "border-violet-500 bg-violet-50"
                    : "border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-violet-400"
                }`}
              >
                <span className="text-3xl">📁</span>
                <span className="mt-3 font-bold text-slate-800 text-sm">Nhấp để chọn file hoặc kéo thả vào đây</span>
                <span className="mt-1 text-xs text-slate-400">PDF, DOCX, PPTX hoặc hình ảnh</span>
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
