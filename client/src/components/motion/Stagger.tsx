// components/motion/Stagger.tsx — Hiệu ứng nạp lần lượt danh sách thẻ với độ trễ --stagger (60ms)
import React, { ElementType, ReactNode, Children, isValidElement, cloneElement } from "react";
import { useInView, usePrefersReducedMotion } from "./motionTokens";

export interface StaggerProps {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  staggerDelay?: number; // Mặc định 60ms theo token --stagger
  baseDelay?: number;
  duration?: "fast" | "base" | "slow";
  offset?: number; // Khoảng trượt 16px
  threshold?: number;
  once?: boolean;
  style?: React.CSSProperties;
}

export const Stagger: React.FC<StaggerProps> = ({
  children,
  className = "",
  as: Component = "div",
  staggerDelay = 60,
  baseDelay = 0,
  duration = "base",
  offset = 16,
  threshold = 0.1,
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

  // Progressive enhancement: Nếu JS bị lỗi, luôn hiển thị đầy đủ danh sách
  const shouldAnimate = isClientReady;
  const isVisible = !shouldAnimate || inView;

  const childArray = Children.toArray(children);

  return (
    <Component ref={ref} className={className} style={style}>
      {childArray.map((child, idx) => {
        if (!isValidElement(child)) return child;

        const delay = prefersReduced ? 0 : baseDelay + idx * staggerDelay;

        const itemMotionStyle: React.CSSProperties = {
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
        };

        return cloneElement(child, {
          style: {
            ...((child.props as any).style || {}),
            ...itemMotionStyle,
          },
        } as any);
      })}
    </Component>
  );
};
