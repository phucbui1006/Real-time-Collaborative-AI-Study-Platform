// components/motion/motionTokens.ts — Các tiện ích và hook dùng chung cho hệ thống hiệu ứng chuyển động
import React, { useState, useEffect, useRef } from "react";

/**
 * Hook lắng nghe cài đặt prefers-reduced-motion của hệ điều hành
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return prefersReduced;
}

export interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

/**
 * Hook kiểm tra phần tử đã vào khung nhìn (Viewport) hay chưa
 * Hỗ trợ Progressive Enhancement: Mặc định hiển thị nếu JS không khả dụng
 */
export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: UseInViewOptions = {}
): [React.RefObject<T | null>, boolean, boolean] {
  const { threshold = 0.15, rootMargin = "0px", once = true } = options;
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return [ref, isInView, isClientReady];
}

export interface TextSegment {
  text: string;
  isWord: boolean;
}

/**
 * Tách văn bản tiếng Việt theo TỪ (Word Segmentation) bằng Intl.Segmenter và chuẩn hóa NFC
 * Không tách theo từng ký tự đơn lẻ để tránh làm tách dấu tiếng Việt
 */
export function segmentVietnameseWords(rawText: string, locale = "vi"): TextSegment[] {
  // Bắt buộc chuẩn hóa Unicode NFC theo quy chuẩn tiếng Việt
  const normalized = (rawText || "").normalize("NFC");
  if (!normalized) return [];

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    try {
      const segmenter = new (Intl as any).Segmenter(locale, { granularity: "word" });
      const segments = Array.from(segmenter.segment(normalized)) as {
        segment: string;
        isWordLike?: boolean;
      }[];
      return segments.map((s) => ({
        text: s.segment,
        isWord: Boolean(s.isWordLike || s.segment.trim().length > 0),
      }));
    } catch {
      // Fallback nếu có lỗi khởi tạo Intl.Segmenter
    }
  }

  // Fallback an toàn cho môi trường cũ
  const tokens = normalized.split(/(\s+)/);
  return tokens.map((t) => ({
    text: t,
    isWord: t.trim().length > 0,
  }));
}
