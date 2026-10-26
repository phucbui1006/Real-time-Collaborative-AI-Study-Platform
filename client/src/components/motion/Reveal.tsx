// components/motion/Reveal.tsx — Hiển thị mờ -> rõ + trượt lên 16px khi vào khung nhìn (một lần)
import React, { ElementType, ReactNode } from "react";
import { useInView, usePrefersReducedMotion } from "./motionTokens";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  delay?: number; // Độ trễ tính bằng ms
  duration?: "fast" | "base" | "slow";
  offset?: number; // Khoảng trượt mặc định 16px
  threshold?: number;
  once?: boolean;
  style?: React.CSSProperties;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className = "",
  as: Component = "div",
  delay = 0,
  duration = "base",
  offset = 16,
  threshold = 0.15,
  once = true,
  style = {},
}) => {
  const [ref, inView, isClientReady] = useInView({ threshold, once });
  const prefersReduced = usePrefersReducedMotion();

  const durVar =
    duration === "fast"
      ? "var(--dur-fast, 150ms)"
      : duration === "slow"
      ? "var(--dur-slow, 600ms)"
      : "var(--dur-base, 250ms)";

  // Progressive enhancement: Nếu JS bị lỗi hoặc chưa sẵn sàng, mặc định hiển thị đầy đủ
  const shouldAnimate = isClientReady;
  const isVisible = !shouldAnimate || inView;

  const motionStyle: React.CSSProperties = {
    ...style,
    opacity: isVisible ? 1 : 0,
    // Chỉ animate transform và opacity theo đúng quy tắc
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
  };

  return (
    <Component ref={ref} className={className} style={motionStyle}>
      {children}
    </Component>
  );
};
