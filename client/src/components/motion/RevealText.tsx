// components/motion/RevealText.tsx — Tách theo TỪ bằng Intl.Segmenter, chuẩn hóa NFC, trễ theo --stagger
import React, { ElementType, useMemo } from "react";
import {
  useInView,
  usePrefersReducedMotion,
  segmentVietnameseWords,
} from "./motionTokens";

export interface RevealTextProps {
  text: string;
  className?: string;
  as?: ElementType;
  staggerDelay?: number; // Mặc định 60ms theo token --stagger
  baseDelay?: number;
  duration?: "fast" | "base" | "slow";
  offset?: number; // Mặc định khoảng trượt 16px
  threshold?: number;
  once?: boolean;
  style?: React.CSSProperties;
  showDebugBox?: boolean; // Bật viền kiểm tra ranh giới padding / line-height
}

export const RevealText: React.FC<RevealTextProps> = ({
  text,
  className = "",
  as: Component = "span",
  staggerDelay = 60,
  baseDelay = 0,
  duration = "base",
  offset = 16,
  threshold = 0.15,
  once = true,
  style = {},
  showDebugBox = false,
}) => {
  const [ref, inView, isClientReady] = useInView({ threshold, once });
  const prefersReduced = usePrefersReducedMotion();

  // Tách văn bản theo TỪ (Word-based) và chuẩn hóa NFC
  const segments = useMemo(() => segmentVietnameseWords(text, "vi"), [text]);

  const durVar =
    duration === "fast"
      ? "var(--dur-fast, 150ms)"
      : duration === "slow"
      ? "var(--dur-slow, 600ms)"
      : "var(--dur-base, 250ms)";

  // Progressive enhancement: Nếu JS bị lỗi, luôn hiển thị đầy đủ văn bản
  const shouldAnimate = isClientReady;
  const isVisible = !shouldAnimate || inView;

  let wordIndex = 0;

  return (
    <Component
      ref={ref}
      className={`inline-block ${className}`}
      style={{
        // Quy tắc 3: Bảo đảm line-height >= 1.25 (chọn 1.35) để không cắt dấu trên dưới của tiếng Việt
        lineHeight: 1.35,
        ...style,
      }}
    >
      {segments.map((seg, idx) => {
        if (!seg.isWord) {
          // Khoảng trắng hoặc ký tự đặc biệt -> Giữ nguyên để tự nhiên wrap dòng theo trình duyệt
          return <span key={idx}>{seg.text}</span>;
        }

        const currentWordIdx = wordIndex++;
        const delay = prefersReduced ? 0 : baseDelay + currentWordIdx * staggerDelay;

        return (
          <span
            key={idx}
            className={`inline-block overflow-hidden align-top ${
              showDebugBox ? "outline outline-1 outline-rose-400 bg-rose-50/20 dark:bg-rose-950/30" : ""
            }`}
            style={{
              // Quy tắc 3: Hiệu ứng mặt nạ (overflow hidden) có line-height >= 1.25 và padding đệm
              // để tuyệt đối không cắt dấu mũ, trăng, hỏi, ngã, móc (ví dụ: Ắ, ễ, ượ, Ẩ, Ỡ, Ộ)
              lineHeight: 1.35,
              paddingTop: "0.25em",
              paddingBottom: "0.25em",
              marginTop: "-0.25em",
              marginBottom: "-0.25em",
            }}
          >
            <span
              className="inline-block"
              style={{
                // Chỉ animate transform và opacity
                opacity: isVisible ? 1 : 0,
                transform: prefersReduced
                  ? "none"
                  : isVisible
                  ? "translate3d(0, 0, 0)"
                  : `translate3d(0, ${offset}px, 0)`,
                transitionProperty: prefersReduced ? "opacity" : "opacity, transform",
                transitionDuration: prefersReduced ? "var(--dur-fast, 150ms)" : durVar,
                transitionTimingFunction: "var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1))",
                transitionDelay: prefersReduced ? "0ms" : `${delay}ms`,
                willChange: isVisible ? "auto" : "opacity, transform",
              }}
            >
              {seg.text}
            </span>
          </span>
        );
      })}
    </Component>
  );
};
