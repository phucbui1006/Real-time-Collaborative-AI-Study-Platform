import React, { useState, useEffect } from "react";
import {
  FileText,
  Sparkles,
  CheckCircle2,
  UploadCloud,
  RotateCcw,
  BookOpen,
  Zap,
  MousePointer2,
  HelpCircle,
} from "lucide-react";

type DemoStage = "dragging" | "processing" | "mindmap";

interface SampleDoc {
  id: string;
  name: string;
  type: "PDF" | "PPTX" | "DOCX";
  pages: string;
  time: string;
  rootTitle: string;
  branches: {
    id: number;
    title: string;
    summary: string;
    page: string;
    badgeBg: string;
    cardBg: string;
    quote: string;
  }[];
}

// Viền thẻ thống nhất 1.5px xanh ngọc nhạt / xám xanh
const UNIFIED_BORDER = "border-[1.5px] border-[#cfe5e2] dark:border-[#1f3a3d]";

const SAMPLE_DOCS: SampleDoc[] = [
  {
    id: "ai",
    name: "Giao_trinh_Tri_tue_nhan_tao_120tr.pdf",
    type: "PDF",
    pages: "120 trang",
    time: "3.2 giây",
    rootTitle: "Trí tuệ nhân tạo & LLM",
    branches: [
      {
        id: 0,
        title: "Kiến trúc RAG",
        summary: "Truy xuất văn bản kèm số trang",
        page: "Trang 18",
        badgeBg: "bg-teal-700 text-white",
        cardBg: "bg-teal-50/90 dark:bg-teal-950/50",
        quote: "“Mô hình RAG đối chiếu câu hỏi với kho tài liệu PDF trước khi sinh câu trả lời, kèm số trang để tự kiểm tra.” (Trích trang 18)",
      },
      {
        id: 1,
        title: "Học có giám sát",
        summary: "Phân loại & Hồi quy tuyến tính",
        page: "Trang 45",
        badgeBg: "bg-amber-300 text-slate-950",
        cardBg: "bg-amber-50/90 dark:bg-amber-950/50",
        quote: "“Thuật toán học từ tập dữ liệu đã gán nhãn để dự đoán đầu ra cho dữ liệu mới với sai số nhỏ nhất.” (Trích trang 45)",
      },
      {
        id: 2,
        title: "Cơ chế Attention",
        summary: "Trọng số ngữ cảnh Transformer",
        page: "Trang 89",
        badgeBg: "bg-rose-600 text-white",
        cardBg: "bg-rose-50/90 dark:bg-rose-950/50",
        quote: "“Self-Attention giúp mô hình hiểu mối liên hệ giữa các từ cách xa nhau trong cùng một đoạn văn.” (Trích trang 89)",
      },
    ],
  },
  {
    id: "econ",
    name: "Slide_Kinh_te_vi_mo_Chuong_4.pptx",
    type: "PPTX",
    pages: "64 slide",
    time: "2.7 giây",
    rootTitle: "Chính sách Tiền tệ & Lạm phát",
    branches: [
      {
        id: 0,
        title: "Cung - Cầu tiền tệ",
        summary: "Lãi suất cân bằng trên thị trường",
        page: "Slide 12",
        badgeBg: "bg-teal-700 text-white",
        cardBg: "bg-teal-50/90 dark:bg-teal-950/50",
        quote: "“Khi Ngân hàng Trung ương tăng cung tiền, đường cung tiền dịch chuyển sang phải làm giảm lãi suất ngắn hạn.” (Slide 12)",
      },
      {
        id: 1,
        title: "Công cụ điều hành",
        summary: "Dự trữ bắt buộc & Nghiệp vụ OMO",
        page: "Slide 28",
        badgeBg: "bg-violet-600 text-white",
        cardBg: "bg-violet-50/90 dark:bg-violet-950/50",
        quote: "“Mua bán trái phiếu chính phủ trên thị trường mở (OMO) là công cụ linh hoạt nhất để điều tiết thanh khoản.” (Slide 28)",
      },
      {
        id: 2,
        title: "Đường cong Phillips",
        summary: "Đánh đổi lạm phát và thất nghiệp",
        page: "Slide 51",
        badgeBg: "bg-amber-300 text-slate-950",
        cardBg: "bg-amber-50/90 dark:bg-amber-950/50",
        quote: "“Trong ngắn hạn, tỷ lệ lạm phát và tỷ lệ thất nghiệp có mối quan hệ nghịch biến.” (Slide 51)",
      },
    ],
  },
];

export const ClassroomHeroAnimation: React.FC = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [stage, setStage] = useState<DemoStage>("dragging");
  const [docIndex, setDocIndex] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const currentDoc = SAMPLE_DOCS[docIndex];

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setPrefersReducedMotion(mq.matches);
    if (mq.matches) {
      setStage("mindmap");
    }
    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches) setStage("mindmap");
    };
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      setStage("mindmap");
      return;
    }

    setStage("dragging");
    setElapsedMs(0);

    const toProcessing = setTimeout(() => {
      setStage("processing");
    }, 1800);

    const toMindmap = setTimeout(() => {
      setStage("mindmap");
    }, 3400);

    const restartLoop = setTimeout(() => {
      setCycleKey((prev) => prev + 1);
    }, 12500);

    return () => {
      clearTimeout(toProcessing);
      clearTimeout(toMindmap);
      clearTimeout(restartLoop);
    };
  }, [cycleKey, docIndex, prefersReducedMotion]);

  useEffect(() => {
    if (stage !== "processing" || prefersReducedMotion) return;
    const start = Date.now();
    const interval = setInterval(() => {
      const diff = Math.min(3.2, (Date.now() - start) / 450);
      setElapsedMs(Number(diff.toFixed(1)));
    }, 80);
    return () => clearInterval(interval);
  }, [stage, prefersReducedMotion]);

  const handleReplay = () => {
    if (prefersReducedMotion) {
      setStage("dragging");
      return;
    }
    setCycleKey((prev) => prev + 1);
  };

  const handleSwitchDoc = (idx: number) => {
    setDocIndex(idx);
    setSelectedBranch(0);
  };

  const handleDropDemo = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    setStage("processing");
    setTimeout(() => setStage("mindmap"), 1400);
  };

  return (
    <div className="relative mx-auto w-full select-none pt-3">
      {/* Nhãn nổi "Dưới 5 giây" ngay sát trên khung Hero */}
      <div className={`absolute -top-2 right-3 sm:right-6 z-20 inline-flex items-center gap-2 rounded-2xl bg-amber-300 dark:bg-amber-400 text-slate-950 px-4 py-2 text-sm font-bold shadow-md ${UNIFIED_BORDER}`}>
        <Zap className="h-4 w-4 fill-slate-950" />
        <span>Tạo Mindmap dưới 5 giây</span>
      </div>

      {/* Khung trình duyệt (Browser Frame) với viền thẻ thống nhất 1.5px */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDropDemo}
        className={`relative mt-2 overflow-hidden rounded-[2rem] ${UNIFIED_BORDER} transition-colors duration-200 bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(13,148,136,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)] ${
          isDraggingOver ? "ring-4 ring-teal-500/20" : ""
        }`}
      >
        {/* Thanh trình duyệt (Browser Top Bar) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#cfe5e2] dark:border-[#1f3a3d] bg-slate-100/90 dark:bg-slate-800/90 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-rose-400" />
            <span className="h-3.5 w-3.5 rounded-full bg-amber-400" />
            <span className="h-3.5 w-3.5 rounded-full bg-teal-400" />
            <div className={`ml-2 hidden sm:flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 ${UNIFIED_BORDER}`}>
              <span className="h-2 w-2 rounded-full bg-teal-600" />
              <span>permind.io.vn/ai-studio</span>
            </div>
          </div>

          {/* Nút chuyển tài liệu mẫu & Chạy lại demo */}
          <div className="flex items-center gap-1.5">
            {SAMPLE_DOCS.map((doc, idx) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => handleSwitchDoc(idx)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                  docIndex === idx
                    ? "bg-teal-700 text-white"
                    : `bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-700 ${UNIFIED_BORDER}`
                }`}
              >
                Mẫu {doc.type}
              </button>
            ))}
            <button
              type="button"
              onClick={handleReplay}
              title="Xem lại hiệu ứng kéo thả"
              className={`inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 ${UNIFIED_BORDER} px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-teal-700 transition-colors cursor-pointer`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chạy lại</span>
            </button>
          </div>
        </div>

        {/* Thanh trạng thái tiến trình 3 bước */}
        <div className="grid grid-cols-3 border-b border-[#cfe5e2] dark:border-[#1f3a3d] bg-slate-50/70 dark:bg-slate-900/50 px-3 sm:px-4 py-2.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStage("dragging")}
            className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
              stage === "dragging"
                ? "text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-700 text-white text-xs">
              1
            </span>
            <span>Kéo thả file</span>
          </button>
          <button
            type="button"
            onClick={() => setStage("processing")}
            className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
              stage === "processing"
                ? "text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/60"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-xs">
              2
            </span>
            <span>AI đọc &lt; 5s</span>
          </button>
          <button
            type="button"
            onClick={() => setStage("mindmap")}
            className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
              stage === "mindmap"
                ? "text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-950/60"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white text-xs">
              3
            </span>
            <span>Sơ đồ tư duy</span>
          </button>
        </div>

        {/* Nội dung chính của vùng Demo Động */}
        <div className="relative p-5 sm:p-6 min-h-[390px] flex flex-col justify-between bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px]">
          {/* GIAI ĐOẠN 1: MÔ PHỎNG KÉO THẢ FILE PDF */}
          {stage === "dragging" && (
            <div className="my-auto flex flex-col items-center justify-center py-4 animate-fade-in">
              <div
                onClick={() => setStage("processing")}
                className={`relative w-full max-w-md rounded-3xl ${UNIFIED_BORDER} bg-teal-50/70 dark:bg-teal-950/30 p-6 sm:p-8 text-center transition-colors hover:bg-teal-50 cursor-pointer`}
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-700 text-white shadow-sm">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <p className="mt-4 text-base sm:text-lg font-semibold text-slate-900 dark:text-white">
                  Thả giáo trình PDF, PPTX hoặc DOCX vào đây
                </p>
                <p className="mt-1 text-[15px] leading-[1.6] text-slate-700 dark:text-slate-300">
                  Chấp nhận cả giáo trình dày hàng trăm trang • Bấm để thử ngay
                </p>

                {/* Thẻ File PDF đang được con trỏ kéo vào */}
                <div className="mt-6 relative mx-auto max-w-xs animate-hero-drag">
                  <div className={`flex items-center gap-3 rounded-2xl ${UNIFIED_BORDER} bg-white dark:bg-slate-800 p-3.5 shadow-lg text-left`}>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 font-bold text-xs">
                      {currentDoc.type}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                        {currentDoc.name}
                      </p>
                      <p className="text-xs font-medium text-teal-800 dark:text-teal-300">
                        {currentDoc.pages} • Đang thả vào...
                      </p>
                    </div>
                  </div>
                  <div className="absolute -bottom-3 -right-2 inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-2.5 py-1 text-xs font-semibold shadow-md">
                    <MousePointer2 className="h-3.5 w-3.5 text-teal-400 fill-teal-400" />
                    <span>Thả file</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GIAI ĐOẠN 2: ĐANG BÓC TÁCH DƯỚI 5 GIÂY */}
          {stage === "processing" && (
            <div className="my-auto flex flex-col items-center justify-center py-6 text-center animate-fade-in">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-700 text-white shadow-md">
                <Sparkles className="h-10 w-10 animate-spin" />
                <span className={`absolute -top-2 -right-3 rounded-full bg-amber-300 text-slate-950 px-2.5 py-0.5 text-xs font-bold ${UNIFIED_BORDER}`}>
                  {elapsedMs}s
                </span>
              </div>

              <p className="mt-5 text-lg sm:text-xl font-semibold text-slate-900 dark:text-white">
                AI đang tóm tắt &amp; vẽ sơ đồ tư duy...
              </p>
              <p className="mt-1.5 text-[15px] leading-[1.6] text-slate-700 dark:text-slate-300">
                Đang đọc <strong className="font-semibold text-slate-900 dark:text-white">{currentDoc.name}</strong> ({currentDoc.pages})
              </p>

              <div className="mt-5 w-full max-w-sm overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 h-3 p-0.5">
                <div className="h-full rounded-full bg-teal-600 animate-progress-fill" />
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-teal-100 dark:bg-teal-950 text-teal-900 dark:text-teal-200 px-3 py-1">
                  ✓ Bóc tách chương mục
                </span>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 px-3 py-1">
                  ✓ Gắn trích dẫn số trang
                </span>
                <span className="rounded-full bg-rose-100 dark:bg-rose-950 text-rose-900 dark:text-rose-200 px-3 py-1">
                  ✓ Tạo 10 câu hỏi trắc nghiệm
                </span>
              </div>
            </div>
          )}

          {/* GIAI ĐOẠN 3: SƠ ĐỒ TƯ DUY TỰ VẼ RA + TRÍCH DẪN TRANG */}
          {stage === "mindmap" && (
            <div className="flex flex-col justify-between gap-4 animate-fade-in">
              {/* Header thông báo hoàn tất dưới 5 giây */}
              <div className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-teal-50 dark:bg-teal-950/60 ${UNIFIED_BORDER} px-3.5 py-2`}>
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-teal-900 dark:text-teal-200 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-teal-700 dark:text-teal-400 shrink-0" />
                  <span className="truncate">{currentDoc.name}</span>
                </div>
                <span className="rounded-full bg-teal-700 text-white px-2.5 py-0.5 text-xs font-semibold">
                  ⚡ Hoàn tất trong {currentDoc.time}
                </span>
              </div>

              {/* Cây Sơ đồ tư duy tự vẽ bằng SVG + các Node */}
              <div className="relative py-1">
                {/* Node Gốc */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-teal-500 text-white dark:text-slate-950 px-5 py-2.5 text-sm sm:text-base font-semibold shadow-sm">
                    <Sparkles className="h-4 w-4 text-amber-300 dark:text-slate-950 shrink-0" />
                    <span>{currentDoc.rootTitle}</span>
                  </div>
                </div>

                {/* Đường nối SVG tự vẽ ra */}
                <svg
                  className="mx-auto h-8 w-full max-w-md overflow-visible"
                  viewBox="0 0 400 36"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M200 0 C200 18, 70 14, 70 34"
                    stroke="#0d9488"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="animate-draw-line"
                  />
                  <path
                    d="M200 0 L200 34"
                    stroke="#0d9488"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="animate-draw-line"
                  />
                  <path
                    d="M200 0 C200 18, 330 14, 330 34"
                    stroke="#0d9488"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="animate-draw-line"
                  />
                </svg>

                {/* 3 Nhánh con Mindmap (Mỗi thẻ chỉ giữ 1 huy hiệu số trang, viền thống nhất 1.5px) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {currentDoc.branches.map((b, idx) => {
                    const isSelected = selectedBranch === idx;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBranch(idx)}
                        style={{ animationDelay: `${idx * 130}ms` }}
                        className={`animate-node-pop text-left rounded-2xl ${UNIFIED_BORDER} p-3.5 transition-all cursor-pointer ${
                          isSelected
                            ? `${b.cardBg} ring-2 ring-teal-600/40 shadow-sm`
                            : "bg-white/95 dark:bg-slate-800/90 hover:bg-teal-50/40 dark:hover:bg-slate-800"
                        }`}
                      >
                        <span className={`inline-block rounded-lg px-2.5 py-0.5 text-xs font-semibold mb-2 ${b.badgeBg}`}>
                          {b.page}
                        </span>
                        <h3 className="text-[15px] font-semibold text-slate-900 dark:text-white leading-snug">
                          {b.title}
                        </h3>
                        <p className="mt-1 text-[15px] leading-[1.6] text-slate-700 dark:text-slate-200">
                          {b.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hộp Trích dẫn theo trang kiểu NotebookLM */}
              <div className={`rounded-2xl ${UNIFIED_BORDER} bg-slate-50 dark:bg-slate-800/70 p-3.5`}>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>Trích dẫn theo từng trang ({currentDoc.branches[selectedBranch].page})</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-900 dark:text-violet-200 px-2.5 py-0.5 text-xs font-semibold">
                    <HelpCircle className="h-3.5 w-3.5" />
                    +10 câu trắc nghiệm
                  </span>
                </div>
                <p className="text-[15px] leading-[1.6] text-slate-800 dark:text-slate-200">
                  {currentDoc.branches[selectedBranch].quote}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nhãn phụ trợ dưới khung demo */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <span className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-teal-700 dark:text-teal-400 shrink-0" />
          <span>Bấm vào các nhánh trên sơ đồ để xem trích dẫn theo trang</span>
        </span>
        <span className="font-semibold text-teal-800 dark:text-teal-300">
          🤖 Hỗ trợ AI 24/7
        </span>
      </div>
    </div>
  );
};

export default ClassroomHeroAnimation;
