import React, { useState, useEffect } from "react";
import {
  FileText,
  Bot,
  Network,
  Sparkles,
} from "lucide-react";

export const ClassroomHeroAnimation: React.FC = () => {
  const [activeNode, setActiveNode] = useState<number>(0);

  const nodes = [
    { id: 0, title: "Mô hình RAG & Vector", desc: "Khái niệm cốt lõi trang 18", tag: "Trang 18", colorBg: "bg-[#ffda00]" },
    { id: 1, title: "Học máy & Phân loại", desc: "Học có giám sát & SVM", tag: "Trang 24", colorBg: "bg-[#91d8ec]" },
    { id: 2, title: "Mạng Transformer", desc: "Cơ chế Attention trong LLM", tag: "Trang 31", colorBg: "bg-[#ffbac4]" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveNode((prev) => (prev + 1) % nodes.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [nodes.length]);

  return (
    <div className="relative mx-auto w-full max-w-lg select-none lg:max-w-none">
      {/* Khung thẻ SuperHi phẳng có viền đặc 2px và bóng đặc */}
      <div className="relative overflow-hidden rounded-[24px] border-2 border-[#111118] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-5 sm:p-6 shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000] transition-colors duration-150">
        
        {/* 1. Header Cửa sổ Phân tích Tài liệu */}
        <div className="relative flex items-center justify-between pb-3.5 mb-4 border-b border-[#e1edff] dark:border-[#2a2a3a]">
          <div className="flex items-center gap-2">
            <span className="font-normal text-sm text-[#111118] dark:text-[#f0f6ff]">
              Sơ đồ tư duy &amp; Trợ lý học tập
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[5000px] text-xs font-normal bg-[#16ab59] text-white border border-[#111118]">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>Đang kết nối</span>
            </span>
          </div>
        </div>

        {/* 2. Thẻ Tài liệu Phân tích */}
        <div className="rounded-[20px] border border-[#e1edff] dark:border-[#2a2a3a] bg-[#f0f6ff] dark:bg-[#242436] p-4 mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffda00] text-[#111118] border border-[#111118] shadow-[0_2px_0_0_#111118]">
                <FileText className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff] truncate">
                    Giao_trinh_Tri_tue_nhan_tao.pdf
                  </h4>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-mono">
                  <span>48 trang</span>
                  <span>•</span>
                  <span>8.4 MB</span>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end shrink-0">
              <span className="text-xs font-normal text-[#111118] dark:text-[#f0f6ff] bg-[#91d8ec] border border-[#111118] px-3 py-1 rounded-[5000px] shadow-[0_1px_0_0_#111118]">
                Đã phân tích
              </span>
            </div>
          </div>
        </div>

        {/* 3. Khung Sơ đồ Tư duy */}
        <div className="relative rounded-[20px] border border-[#e1edff] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-4 mb-4 shadow-[0_2px_0_0_#111118]">
          <div className="relative flex items-center justify-between text-xs mb-4">
            <span className="flex items-center gap-1.5 font-normal text-[#111118] dark:text-[#f0f6ff]">
              <Network className="h-4 w-4 text-[#0b7a75] dark:text-[#2dd4bf]" />
              Sơ đồ tư duy bài giảng
            </span>
            <span className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 font-mono">
              3 nhánh trọng tâm
            </span>
          </div>

          {/* Node Gốc */}
          <div className="relative flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 rounded-[5000px] bg-[#0b7a75] dark:bg-[#2dd4bf] text-white dark:text-[#111118] px-4 py-2 text-xs font-normal border-2 border-[#111118] shadow-[0_2px_0_0_#111118]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Trí tuệ nhân tạo (AI Core)</span>
            </div>
          </div>

          {/* 3 Nhánh con */}
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {nodes.map((n) => {
              const isSelected = activeNode === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setActiveNode(n.id)}
                  className={`text-left p-3 rounded-[16px] border-2 border-[#111118] transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#e1edff] dark:bg-[#242436] shadow-[0_3px_0_0_#0b7a75] dark:shadow-[0_3px_0_0_#2dd4bf]"
                      : "bg-[#f0f6ff] dark:bg-[#242436]/50 shadow-[0_2px_0_0_#111118] hover:bg-[#e1edff]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[5000px] border border-[#111118] text-[#111118] ${n.colorBg}`}>
                      {n.tag}
                    </span>
                  </div>
                  <div className="text-xs font-normal text-[#111118] dark:text-[#f0f6ff] truncate">
                    {n.title}
                  </div>
                  <div className="text-[10px] text-[#111118]/70 dark:text-[#f0f6ff]/70 mt-0.5 truncate font-normal">
                    {n.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Khung Trợ lý Chat RAG */}
        <div className="relative rounded-[20px] border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] p-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#0b7a75] text-white flex items-center justify-center shrink-0 border border-[#111118]">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="font-normal text-xs text-[#111118] dark:text-[#f0f6ff]">
                Trợ lý AI PeerMind
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#111118] bg-[#91d8ec] border border-[#111118] px-2 py-0.5 rounded-[5000px]">
              Tài liệu chuẩn
            </span>
          </div>

          <p className="text-[#111118]/80 dark:text-[#f0f6ff]/80 text-xs leading-relaxed font-normal">
            {activeNode === 0 &&
              "Kiến trúc RAG chia nhỏ tài liệu thành từng đoạn thông tin cô đọng, giúp bạn hỏi đáp và tra cứu chuẩn xác từng định lý ngay trên slide bài giảng."}
            {activeNode === 1 &&
              "Phần Học máy phân loại rõ 3 phương pháp: Học có giám sát, Học không giám sát và Học tăng cường cùng các ví dụ ứng dụng thực tế."}
            {activeNode === 2 &&
              "Cơ chế Self-Attention trong Transformer giúp mô hình hiểu mối tương quan giữa các từ ngữ, là nền tảng cốt lõi của các mô hình ngôn ngữ lớn."}
          </p>
        </div>

      </div>
    </div>
  );
};

export default ClassroomHeroAnimation;
