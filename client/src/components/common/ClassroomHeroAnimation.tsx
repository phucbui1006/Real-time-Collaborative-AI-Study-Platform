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
    nodeBorder: string;
    quote: string;
  }[];
}

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
        summary: "Truy xuất vector chống ảo giác",
        page: "Trang 18",
        badgeBg: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200",
        nodeBorder: "border-teal-400 bg-teal-50/90 dark:bg-teal-950/50 dark:border-teal-500",
        quote: "“Mô hình RAG đối chiếu câu hỏi với kho tài liệu PDF trước khi sinh câu trả lời, kèm số trang chính xác.” (Trích trang 18)",
      },
      {
        id: 1,
        title: "Học có giám sát",
        summary: "Phân loại & Hồi quy tuyến tính",
        page: "Trang 45",
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
        nodeBorder: "border-amber-400 bg-amber-50/90 dark:bg-amber-950/50 dark:border-amber-500",
        quote: "“Thuật toán học từ tập dữ liệu đã gán nhãn để dự đoán đầu ra cho dữ liệu mới với sai số nhỏ nhất.” (Trích trang 45)",
      },
      {
        id: 2,
        title: "Cơ chế Attention",
        summary: "Trọng số ngữ cảnh Transformer",
        page: "Trang 89",
        badgeBg: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
        nodeBorder: "border-rose-400 bg-rose-50/90 dark:bg-rose-950/50 dark:border-rose-500",
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
        badgeBg: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200",
        nodeBorder: "border-teal-400 bg-teal-50/90 dark:bg-teal-950/50 dark:border-teal-500",
        quote: "“Khi Ngân hàng Trung ương tăng cung tiền, đường cung tiền dịch chuyển sang phải làm giảm lãi suất ngắn hạn.” (Slide 12)",
      },
      {
        id: 1,
        title: "Công cụ điều hành",
        summary: "Dự trữ bắt buộc & Nghiệp vụ OMO",
        page: "Slide 28",
        badgeBg: "bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200",
        nodeBorder: "border-violet-400 bg-violet-50/90 dark:bg-violet-950/50 dark:border-violet-500",
        quote: "“Mua bán trái phiếu chính phủ trên thị trường mở (OMO) là công cụ linh hoạt nhất để điều tiết thanh khoản.” (Slide 28)",
      },
      {
        id: 2,
        title: "Đường cong Phillips",
        summary: "Đánh đổi lạm phát và thất nghiệp",
        page: "Slide 51",
        badgeBg: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200",
        nodeBorder: "border-amber-400 bg-amber-50/90 dark:bg-amber-950/50 dark:border-amber-500",
        quote: "“Trong ngắn hạn, tỷ lệ lạm phát và tỷ lệ thất nghiệp có mối quan hệ nghịch biến.” (Slide 51)",
      },
    ],
  },
];

export const ClassroomHeroAnimation: React.FC = () => {
  const [stage, setStage] = useState<DemoStage>("dragging");
  const [docIndex, setDocIndex] = useState(0);
  const [selectedBranch, setSelectedBranch] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const currentDoc = SAMPLE_DOCS[docIndex];

  useEffect(() => {
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
  }, [cycleKey, docIndex]);

  useEffect(() => {
    if (stage !== "processing") return;
    const start = Date.now();
    const interval = setInterval(() => {
      const diff = Math.min(3.2, (Date.now() - start) / 450);
      setElapsedMs(Number(diff.toFixed(1)));
    }, 80);
    return () => clearInterval(interval);
  }, [stage]);

  const handleReplay = () => {
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
    <div className="relative mx-auto w-full select-none">
      {/* Sticker nổi bật "Dưới 5 giây" ngay sát trên khung Hero */}
      <div className="absolute -top-4 right-3 sm:right-6 z-20 inline-flex items-center gap-2 rounded-2xl bg-amber-300 dark:bg-amber-400 text-slate-950 px-4 py-2 text-sm font-extrabold shadow-lg border-2 border-slate-900 rotate-2 animate-bounce">
        <Zap className="h-4 w-4 fill-slate-950" />
        <span>Tạo Mindmap dưới 5 giây!</span>
      </div>

      {/* Khung trình duyệt (Browser Frame) phong cách SuperHi bo góc lớn */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingOver(true);
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={handleDropDemo}
        className={`relative mt-2 overflow-hidden rounded-[2rem] border-2 transition-all duration-300 bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(13,148,136,0.14)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${
          isDraggingOver
            ? "border-teal-500 ring-4 ring-teal-500/20 scale-[1.01]"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        {/* Thanh trình duyệt (Browser Top Bar) */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100/90 dark:bg-slate-800/90 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 rounded-full bg-rose-400 border border-rose-500/30" />
            <span className="h-3.5 w-3.5 rounded-full bg-amber-400 border border-amber-500/30" />
            <span className="h-3.5 w-3.5 rounded-full bg-teal-400 border border-teal-500/30" />
            <div className="ml-2 hidden sm:flex items-center gap-1.5 rounded-full bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              <span>peermind.edu.vn/ai-studio</span>
            </div>
          </div>

          {/* Nút chuyển tài liệu mẫu & Chạy lại demo */}
          <div className="flex items-center gap-1.5">
            {SAMPLE_DOCS.map((doc, idx) => (
              <button
                key={doc.id}
                type="button"
                onClick={() => handleSwitchDoc(idx)}
                className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                  docIndex === idx
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
                }`}
              >
                Mẫu {doc.type}
              </button>
            ))}
            <button
              type="button"
              onClick={handleReplay}
              title="Xem lại hiệu ứng kéo thả"
              className="inline-flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-500 hover:text-teal-600 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Chạy lại</span>
            </button>
          </div>
        </div>

        {/* Thanh trạng thái tiến trình 3 bước nhỏ gọn */}
        <div className="grid grid-cols-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 px-4 py-2.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setStage("dragging")}
            className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
              stage === "dragging"
                ? "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-600 text-white text-[11px]">
              1
            </span>
            <span>Kéo thả file</span>
          </button>
          <button
            type="button"
            onClick={() => setStage("processing")}
            className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
              stage === "processing"
                ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950 text-[11px]">
              2
            </span>
            <span>AI đọc &lt; 5s</span>
          </button>
          <button
            type="button"
            onClick={() => setStage("mindmap")}
            className={`flex items-center justify-center gap-1.5 py-1 rounded-lg transition-colors cursor-pointer ${
              stage === "mindmap"
                ? "text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/60"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-white text-[11px]">
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
                className="relative w-full max-w-md rounded-3xl border-2 border-dashed border-teal-400 dark:border-teal-500/70 bg-teal-50/50 dark:bg-teal-950/30 p-6 sm:p-8 text-center transition-all hover:bg-teal-50 cursor-pointer"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-md shadow-teal-500/25">
                  <UploadCloud className="h-7 w-7" />
                </div>
                <p className="mt-4 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Thả giáo trình PDF, PPTX hoặc DOCX vào đây
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Chấp nhận cả giáo trình dày hàng trăm trang • Bấm để thử ngay
                </p>

                {/* Thẻ File PDF đang được con trỏ kéo vào (CSS Animation) */}
                <div className="mt-6 relative mx-auto max-w-xs animate-hero-drag">
                  <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-900 dark:border-slate-200 bg-white dark:bg-slate-800 p-3.5 shadow-xl text-left">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-800">
                      {currentDoc.type}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                        {currentDoc.name}
                      </p>
                      <p className="text-xs font-medium text-teal-600 dark:text-teal-400">
                        {currentDoc.pages} • Đang thả vào...
                      </p>
                    </div>
                  </div>
                  {/* Con trỏ chuột mô phỏng */}
                  <div className="absolute -bottom-3 -right-3 inline-flex items-center gap-1 rounded-full bg-slate-900 text-white px-2.5 py-1 text-xs font-bold shadow-md">
                    <MousePointer2 className="h-3.5 w-3.5 text-teal-400 fill-teal-400" />
                    <span>Thả file!</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GIAI ĐOẠN 2: ĐANG BÓC TÁCH DƯỚI 5 GIÂY */}
          {stage === "processing" && (
            <div className="my-auto flex flex-col items-center justify-center py-6 text-center animate-fade-in">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-500 text-white shadow-lg shadow-teal-500/30">
                <Sparkles className="h-10 w-10 animate-spin" />
                <span className="absolute -top-2 -right-3 rounded-full bg-amber-300 text-slate-950 px-2.5 py-0.5 text-xs font-extrabold border border-slate-900">
                  {elapsedMs}s
                </span>
              </div>

              <h4 className="mt-5 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                AI đang tóm tắt &amp; vẽ sơ đồ tư duy...
              </h4>
              <p className="mt-1.5 text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Đang đọc <strong className="text-slate-900 dark:text-white">{currentDoc.name}</strong> ({currentDoc.pages})
              </p>

              {/* Thanh tiến trình tốc độ cao */}
              <div className="mt-5 w-full max-w-sm overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 h-3 p-0.5">
                <div className="h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-400 animate-progress-fill" />
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 px-3 py-1">
                  ✓ Bóc tách chương mục
                </span>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 px-3 py-1">
                  ✓ Gắn trích dẫn số trang
                </span>
                <span className="rounded-full bg-pink-100 dark:bg-pink-950 text-pink-800 dark:text-pink-200 px-3 py-1">
                  ✓ Tạo 10 câu hỏi trắc nghiệm
                </span>
              </div>
            </div>
          )}

          {/* GIAI ĐOẠN 3: SƠ ĐỒ TƯ DUY TỰ VẼ RA + TRÍCH DẪN TRANG */}
          {stage === "mindmap" && (
            <div className="flex flex-col justify-between gap-4 animate-fade-in">
              {/* Header thông báo hoàn tất dưới 5 giây */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 px-3.5 py-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-teal-900 dark:text-teal-200">
                  <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-xs">{currentDoc.name}</span>
                </div>
                <span className="rounded-full bg-teal-600 text-white px-2.5 py-0.5 text-xs font-bold">
                  ⚡ Hoàn tất trong {currentDoc.time}
                </span>
              </div>

              {/* Cây Sơ đồ tư duy tự vẽ bằng SVG + các Node */}
              <div className="relative py-1">
                {/* Node Gốc */}
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 dark:bg-teal-500 text-white dark:text-slate-950 px-5 py-2.5 text-sm sm:text-base font-extrabold shadow-md">
                    <Sparkles className="h-4 w-4 text-amber-300 dark:text-slate-950 shrink-0" />
                    <span>{currentDoc.rootTitle}</span>
                  </div>
                </div>

                {/* Đường nối SVG tự vẽ ra (Animated SVG Connector Lines) */}
                <svg
                  className="mx-auto h-8 w-full max-w-md overflow-visible"
                  viewBox="0 0 400 36"
                  fill="none"
                >
                  <path
                    d="M200 0 C200 18, 70 14, 70 34"
                    stroke="#14b8a6"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="animate-draw-line"
                  />
                  <path
                    d="M200 0 L200 34"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="animate-draw-line"
                  />
                  <path
                    d="M200 0 C200 18, 330 14, 330 34"
                    stroke="#f43f5e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="animate-draw-line"
                  />
                </svg>

                {/* 3 Nhánh con Mindmap (Click để xem trích dẫn trang) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {currentDoc.branches.map((b, idx) => {
                    const isSelected = selectedBranch === idx;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setSelectedBranch(idx)}
                        style={{ animationDelay: `${idx * 130}ms` }}
                        className={`animate-node-pop text-left rounded-2xl border-2 p-3 transition-all cursor-pointer ${
                          isSelected
                            ? `${b.nodeBorder} shadow-md -translate-y-0.5`
                            : "border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-800/90 hover:border-teal-400"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${b.badgeBg}`}>
                            {b.page}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">Nhánh #{idx + 1}</span>
                        </div>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white leading-snug">
                          {b.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {b.summary}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hộp Trích dẫn theo trang kiểu NotebookLM */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/70 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300">
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span>Trích dẫn AI chính xác ({currentDoc.branches[selectedBranch].page})</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-800 dark:text-violet-200 px-2.5 py-0.5 text-xs font-bold">
                    <HelpCircle className="h-3.5 w-3.5" />
                    +10 câu trắc nghiệm sẵn sàng
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {currentDoc.branches[selectedBranch].quote}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nhãn phụ trợ dưới khung demo */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-2 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span>Bấm vào các nhánh trên sơ đồ để xem trích dẫn theo trang</span>
        </span>
        <span className="font-bold text-teal-700 dark:text-teal-300">
          🤖 Hỗ trợ AI 24/7
        </span>
      </div>
    </div>
  );
};

export default ClassroomHeroAnimation;
