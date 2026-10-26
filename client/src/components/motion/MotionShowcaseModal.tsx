// components/motion/MotionShowcaseModal.tsx — Trang minh họa nội bộ kiểm tra hệ thống chuyển động & dấu tiếng Việt
import React, { useState } from "react";
import { X, Play, Eye, Sliders, Sparkles, Layers, Type, ShieldCheck } from "lucide-react";
import { Reveal } from "./Reveal";
import { RevealText } from "./RevealText";
import { Stagger } from "./Stagger";

interface MotionShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MotionShowcaseModal: React.FC<MotionShowcaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [replayKey, setReplayKey] = useState<number>(0);
  const [showDebugBox, setShowDebugBox] = useState<boolean>(true);
  const [simulatedReduced, setSimulatedReduced] = useState<boolean>(false);

  if (!isOpen) return null;

  const triggerReplay = () => {
    setReplayKey((k) => k + 1);
  };

  const STRESS_STRING = "Ắng ễ ượ Ẩ Ỡ Ộ";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#111118]/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-lg bg-white dark:bg-[#1b1b26] border-2 border-[#111118] dark:border-[#2a2a3a] text-[#111118] dark:text-[#f0f6ff] shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000] overflow-hidden">
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between bg-[#f0f6ff]/60 dark:bg-[#111118]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#0b7a75] text-white border border-[#111118] shadow-[0_2px_0_0_#111118]">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-lg font-normal tracking-[-0.015em]">
                Phòng thí nghiệm hiệu ứng chuyển động &amp; Dấu tiếng Việt
              </h2>
              <p className="text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70">
                Kiểm tra token, tách từ bằng Intl.Segmenter, hiệu ứng mặt nạ không cắt dấu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#111118] dark:border-[#2a2a3a] text-[#111118] dark:text-[#f0f6ff] flex items-center justify-center shadow-[0_2px_0_0_#111118] hover:bg-[#d0e2ff] cursor-pointer transition-all"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Thanh điều khiển tương tác (Interactive Controls) */}
        <div className="px-6 py-3 bg-[#e1edff]/50 dark:bg-[#242436]/60 border-b border-[#e1edff] dark:border-[#2a2a3a] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={triggerReplay}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-[#0b7a75] hover:bg-[#08635f] text-white border border-[#111118] shadow-[0_2px_0_0_#111118] active:translate-y-[1px] cursor-pointer font-normal transition-all"
            >
              <Play className="h-3 w-3 fill-white" />
              <span>Phát lại hiệu ứng (Replay)</span>
            </button>

            <button
              onClick={() => setShowDebugBox(!showDebugBox)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-[#111118] transition-all cursor-pointer ${
                showDebugBox
                  ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border-rose-500 shadow-[0_1px_0_0_#e11d48]"
                  : "bg-white dark:bg-[#1b1b26] text-[#111118] dark:text-[#f0f6ff] shadow-[0_1px_0_0_#111118]"
              }`}
            >
              <Eye className="h-3 w-3" />
              <span>{showDebugBox ? "Đang bật viền ranh giới" : "Bật viền ranh giới"}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={simulatedReduced}
                onChange={(e) => setSimulatedReduced(e.target.checked)}
                className="rounded-sharp text-[#0b7a75] focus:ring-0"
              />
              <span className="text-xs text-[#111118]/80 dark:text-[#f0f6ff]/80">
                Giả lập giảm chuyển động (Reduced Motion)
              </span>
            </label>
          </div>
        </div>

        {/* Nội dung minh họa cuộn được */}
        <div key={replayKey} className="p-6 space-y-8 overflow-y-auto min-w-0">
          {/* SECTION 1: STRESS TEST DẤU TIẾNG VIỆT */}
          <div className="rounded-md p-5 bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e1edff] dark:border-[#2a2a3a]">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-[#0b7a75] dark:text-[#2dd4bf]" />
                <h3 className="font-normal text-base text-[#111118] dark:text-[#f0f6ff]">
                  1. Kiểm tra không cắt dấu tiếng Việt: "{STRESS_STRING}"
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#0b7a75] dark:text-[#2dd4bf] bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-sharp border border-teal-300 dark:border-teal-700">
                line-height = 1.35 · padding = 0.25em
              </span>
            </div>

            <p className="mt-2 text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 leading-relaxed">
              Các chữ cái có dấu phức tạp như <strong>Ắ</strong> (mũ trăng + sắc), <strong>ễ</strong> (mũ + ngã), <strong>ượ</strong> (móc đôi + nặng), <strong>Ẩ</strong>, <strong>Ỡ</strong>, <strong>Ộ</strong> được kiểm tra ở 6 cỡ chữ để xác thực không bị cắt góc (clipping) bởi hiệu ứng mặt nạ <code>overflow: hidden</code>.
            </p>

            <div className="mt-6 space-y-4">
              {[
                { size: "text-xs", label: "12px (text-xs)" },
                { size: "text-sm", label: "14px (text-sm)" },
                { size: "text-base", label: "16px (text-base)" },
                { size: "text-xl", label: "20px (text-xl)" },
                { size: "text-3xl", label: "30px (text-3xl)" },
                { size: "text-5xl", label: "48px (text-5xl)" },
              ].map(({ size, label }) => (
                <div
                  key={size}
                  className="p-3 rounded-sm bg-[#f0f6ff]/50 dark:bg-[#242436]/40 border border-[#e1edff] dark:border-[#2a2a3a] flex flex-col sm:flex-row sm:items-baseline justify-between gap-2"
                >
                  <span className="text-[11px] font-mono text-[#111118]/50 dark:text-[#f0f6ff]/50 shrink-0 w-32">
                    {label}
                  </span>
                  <div className="flex-1 overflow-x-auto">
                    <RevealText
                      text={STRESS_STRING}
                      className={`${size} font-normal text-[#111118] dark:text-[#f0f6ff]`}
                      showDebugBox={showDebugBox}
                      staggerDelay={simulatedReduced ? 0 : 60}
                      duration={simulatedReduced ? "fast" : "base"}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: REVEAL TEXT VỚI CÂU VĂN THỰC TẾ */}
          <div className="rounded-md p-5 bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#e1edff] dark:border-[#2a2a3a]">
              <Sparkles className="h-4 w-4 text-[#0b7a75] dark:text-[#2dd4bf]" />
              <h3 className="font-normal text-base text-[#111118] dark:text-[#f0f6ff]">
                2. &lt;RevealText&gt; — Tách theo TỪ (Intl.Segmenter, trễ --stagger 60ms)
              </h3>
            </div>
            <div className="mt-4 p-4 rounded-sm bg-[#f0f6ff]/70 dark:bg-[#242436]/60 border border-[#e1edff] dark:border-[#2a2a3a]">
              <RevealText
                text="PeerMind là nền tảng học tập cộng tác thời gian thực với trợ lý AI thông minh, hỗ trợ tự động bóc tách tài liệu và ôn luyện bài thi hiệu quả."
                className="text-base sm:text-lg font-normal text-[#111118] dark:text-[#f0f6ff] leading-relaxed"
                showDebugBox={showDebugBox}
                staggerDelay={simulatedReduced ? 0 : 60}
                duration={simulatedReduced ? "fast" : "base"}
              />
            </div>
          </div>

          {/* SECTION 3: REVEAL KHỐI NỘI DUNG */}
          <div className="rounded-md p-5 bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#e1edff] dark:border-[#2a2a3a]">
              <ShieldCheck className="h-4 w-4 text-[#0b7a75] dark:text-[#2dd4bf]" />
              <h3 className="font-normal text-base text-[#111118] dark:text-[#f0f6ff]">
                3. &lt;Reveal&gt; — Mờ -&gt; rõ + trượt lên 16px (--ease-out)
              </h3>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Reveal
                offset={16}
                delay={simulatedReduced ? 0 : 0}
                className="p-4 rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#111118] shadow-[0_2px_0_0_#111118]"
              >
                <div className="text-xs font-mono uppercase text-[#0b7a75] dark:text-[#2dd4bf]">Khối A</div>
                <h4 className="mt-1 font-normal text-base text-[#111118] dark:text-[#f0f6ff]">
                  Trượt lên 16px (250ms)
                </h4>
                <p className="mt-1 text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70">
                  Chỉ thay đổi transform và opacity, không gây reflow layout.
                </p>
              </Reveal>

              <Reveal
                offset={16}
                delay={simulatedReduced ? 0 : 120}
                className="p-4 rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#111118] shadow-[0_2px_0_0_#111118]"
              >
                <div className="text-xs font-mono uppercase text-[#0b7a75] dark:text-[#2dd4bf]">Khối B (Trễ 120ms)</div>
                <h4 className="mt-1 font-normal text-base text-[#111118] dark:text-[#f0f6ff]">
                  Chuyển động nhẹ và mượt
                </h4>
                <p className="mt-1 text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70">
                  Tôn trọng nguyên tắc 60fps và đường cong cubic-bezier tự nhiên.
                </p>
              </Reveal>
            </div>
          </div>

          {/* SECTION 4: STAGGER DANH SÁCH THẺ */}
          <div className="rounded-md p-5 bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a] shadow-[0_2px_0_0_#111118]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#e1edff] dark:border-[#2a2a3a]">
              <Layers className="h-4 w-4 text-[#0b7a75] dark:text-[#2dd4bf]" />
              <h3 className="font-normal text-base text-[#111118] dark:text-[#f0f6ff]">
                4. &lt;Stagger&gt; — Thác đổ danh sách thẻ (độ trễ 60ms/thẻ)
              </h3>
            </div>

            <Stagger
              staggerDelay={simulatedReduced ? 0 : 60}
              className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {[
                { title: "Tài liệu Toán học", sub: "12 trang · 2.5 MB", icon: "📄", color: "bg-[#ffda00]" },
                { title: "Bài thi Tiếng Anh", sub: "15 câu hỏi · 10 phút", icon: "📝", color: "bg-[#91d8ec]" },
                { title: "Phòng học Vật lý", sub: "4 thành viên đang online", icon: "🌐", color: "bg-[#ffbac4]" },
              ].map((card, i) => (
                <div
                  key={i}
                  className="rounded-md p-4 bg-white dark:bg-[#1b1b26] border border-[#111118] shadow-[0_2px_0_0_#111118] flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-sm border border-[#111118] shadow-[0_1px_0_0_#111118] flex items-center justify-center text-lg ${card.color}`}>
                    {card.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-normal text-sm text-[#111118] dark:text-[#f0f6ff]">{card.title}</div>
                    <div className="text-xs text-[#111118]/60 dark:text-[#f0f6ff]/60 mt-0.5">{card.sub}</div>
                  </div>
                </div>
              ))}
            </Stagger>
          </div>

          {/* SECTION 5: THÔNG SỐ TOKEN CHUYỂN ĐỘNG */}
          <div className="rounded-md p-5 bg-[#f0f6ff]/60 dark:bg-[#111118]/50 border border-[#e1edff] dark:border-[#2a2a3a]">
            <div className="flex items-center gap-2 pb-2">
              <Sliders className="h-4 w-4 text-[#0b7a75] dark:text-[#2dd4bf]" />
              <h3 className="font-normal text-sm text-[#111118] dark:text-[#f0f6ff]">
                Thông số Token chuyển động được khai báo trong CSS
              </h3>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded-sm bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a]">
                <div className="text-[10px] text-[#111118]/50 dark:text-[#f0f6ff]/50">--ease-out</div>
                <div className="font-semibold text-[#0b7a75] dark:text-[#2dd4bf] text-[11px] mt-0.5 truncate">
                  (0.22, 1, 0.36, 1)
                </div>
              </div>
              <div className="p-2.5 rounded-sm bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a]">
                <div className="text-[10px] text-[#111118]/50 dark:text-[#f0f6ff]/50">--dur-fast</div>
                <div className="font-semibold text-[#111118] dark:text-[#f0f6ff] text-[11px] mt-0.5">150ms</div>
              </div>
              <div className="p-2.5 rounded-sm bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a]">
                <div className="text-[10px] text-[#111118]/50 dark:text-[#f0f6ff]/50">--dur-base</div>
                <div className="font-semibold text-[#111118] dark:text-[#f0f6ff] text-[11px] mt-0.5">250ms</div>
              </div>
              <div className="p-2.5 rounded-sm bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a]">
                <div className="text-[10px] text-[#111118]/50 dark:text-[#f0f6ff]/50">--dur-slow</div>
                <div className="font-semibold text-[#111118] dark:text-[#f0f6ff] text-[11px] mt-0.5">600ms</div>
              </div>
              <div className="p-2.5 rounded-sm bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a]">
                <div className="text-[10px] text-[#111118]/50 dark:text-[#f0f6ff]/50">--stagger</div>
                <div className="font-semibold text-[#111118] dark:text-[#f0f6ff] text-[11px] mt-0.5">60ms</div>
              </div>
              <div className="p-2.5 rounded-sm bg-white dark:bg-[#1b1b26] border border-[#e1edff] dark:border-[#2a2a3a]">
                <div className="text-[10px] text-[#111118]/50 dark:text-[#f0f6ff]/50">--slide-offset</div>
                <div className="font-semibold text-[#111118] dark:text-[#f0f6ff] text-[11px] mt-0.5">16px</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="px-6 py-3 border-t border-[#e1edff] dark:border-[#2a2a3a] flex items-center justify-between text-xs bg-[#f0f6ff]/40 dark:bg-[#111118]/40 shrink-0">
          <span className="text-[#111118]/60 dark:text-[#f0f6ff]/60">
            Trang minh họa nội bộ · Không ảnh hưởng route hay dữ liệu chính
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-pill bg-[#111118] dark:bg-[#f0f6ff] text-white dark:text-[#111118] text-xs font-normal cursor-pointer hover:opacity-90 transition-opacity"
          >
            Đóng phòng thí nghiệm
          </button>
        </div>
      </div>
    </div>
  );
};
