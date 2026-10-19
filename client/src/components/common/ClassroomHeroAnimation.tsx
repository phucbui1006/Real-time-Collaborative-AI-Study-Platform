import React, { useState, useEffect } from "react";
import {
  FileText,
  Bot,
  Network,
  Brain,
  ArrowRight,
} from "lucide-react";

export const ClassroomHeroAnimation: React.FC = () => {
  const [activeNode, setActiveNode] = useState<number>(0);

  const nodes = [
    { id: 0, title: "Mô hình RAG & Vector", desc: "Embeddings từ slide 18", tag: "Slide 18", color: "indigo" },
    { id: 1, title: "Machine Learning", desc: "Học có giám sát & SVM", tag: "Slide 24", color: "cyan" },
    { id: 2, title: "Neural Networks", desc: "Attention & Transformer", tag: "Slide 31", color: "purple" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveNode((prev) => (prev + 1) % nodes.length);
    }, 3500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-lg select-none lg:max-w-none">
      {/* Khung viền kính hiện đại chuẩn Glassmorphism (Linear / Raycast vibe) */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 sm:p-6 shadow-2xl backdrop-blur-xl transition-all duration-300">
        
        {/* Ánh sáng dạ quang Ambient Glow phía sau */}
        <div className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-indigo-500/15 dark:bg-indigo-500/25 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-cyan-500/15 dark:bg-cyan-500/20 blur-3xl" />

        {/* 1. Header Cửa sổ Phân tích Tài liệu (Document Analysis Bar) */}
        <div className="relative flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
            </div>
            <span className="ml-2 font-mono text-[11px] font-medium text-slate-500 dark:text-slate-400">
              AI Knowledge Studio v2.4
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>AI Connected</span>
            </span>
          </div>
        </div>

        {/* 2. Thẻ Tài liệu Phân tích (Document Status Card) */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800/90 bg-slate-50/80 dark:bg-slate-950/80 p-3 sm:p-4 mb-4 shadow-inner">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500 border border-rose-500/25">
                <FileText className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    Giao_trinh_Tri_tue_nhan_tao.pdf
                  </h4>
                  <span className="rounded bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.2 text-[9px] font-mono font-bold text-rose-500 uppercase">
                    PDF
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                  <span>48 trang</span>
                  <span>•</span>
                  <span>8.4 MB</span>
                  <span>•</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">Bóc tách 100%</span>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end shrink-0">
              <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 px-2 py-0.5 rounded">
                Vector Grounded
              </span>
            </div>
          </div>
        </div>

        {/* 3. Khung Sơ đồ Tư duy Động (Interactive Mindmap Canvas) */}
        <div className="relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-950/90 p-4 sm:p-5 mb-4 shadow-sm overflow-hidden">
          {/* Lưới tọa độ Subtle Dot Grid */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#6366f1_1px,transparent_1px)] dark:bg-[radial-gradient(#4f46e5_1px,transparent_1px)] opacity-10 [background-size:16px_16px]" />

          {/* Header của Mindmap */}
          <div className="relative flex items-center justify-between text-xs mb-4">
            <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
              <Network className="h-4 w-4 text-indigo-500" />
              Sơ đồ tư duy tài liệu (AI Generated Mindmap)
            </span>
            <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
              Auto-sync 32 nodes
            </span>
          </div>

          {/* Node Gốc (Root Node) */}
          <div className="relative flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 dark:bg-indigo-600 text-white px-3.5 py-1.5 text-xs font-bold shadow-lg shadow-indigo-500/25 border border-indigo-400/40">
              <Brain className="h-4 w-4 animate-pulse text-indigo-200" />
              <span>Trí tuệ nhân tạo (AI Core)</span>
            </div>
          </div>

          {/* 3 Nhánh con kết nối động (Sub-branches) */}
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {nodes.map((n) => {
              const isSelected = activeNode === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setActiveNode(n.id)}
                  className={`text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50/90 dark:bg-slate-900 border-indigo-500 dark:border-indigo-400 shadow-md ring-1 ring-indigo-500/30"
                      : "bg-slate-50/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                      {n.tag}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {n.title}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {n.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Khung Trợ lý Chat RAG (RAG AI Assistant Box) */}
        <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-950/90 p-3.5 sm:p-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                Trợ lý AI PeerMind
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded">
              Độ tin cậy 99.4%
            </span>
          </div>

          <p className="text-slate-600 dark:text-slate-300 text-[11px] sm:text-xs leading-relaxed">
            {activeNode === 0 &&
              "Kiến trúc RAG (Retrieval-Augmented Generation) chia nhỏ slide thành các vector embeddings, giúp truy xuất tức thì lời giải đáp chính xác và loại bỏ hoàn toàn hiện tượng ảo giác AI."}
            {activeNode === 1 &&
              "Phần Machine Learning trong giáo trình phân loại rõ 3 trường phái: Học có giám sát (Supervised), Học không giám sát (Unsupervised) và Học tăng cường (Reinforcement Learning)."}
            {activeNode === 2 &&
              "Cơ chế Self-Attention trong Transformer (Slide 31) tính toán trọng số quan hệ giữa tất cả các token trong chuỗi, tạo nền tảng cho các mô hình ngôn ngữ lớn LLM ngày nay."}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-[11px]">
            <span className="text-slate-400 dark:text-slate-500 font-mono">
              Trích xuất tự động • 15 câu Quiz sẵn sàng
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
              <span>Mở bài ôn tập</span>
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ClassroomHeroAnimation;
