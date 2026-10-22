import React from "react";

type LogoProps = {
  className?: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
};

/**
 * Component Logo chuẩn của PeerMind theo phong cách SuperHi:
 * - Khối hình học phẳng tròn màu xanh ngọc #0b7a75 (dark: #2dd4bf) với viền đặc 2px #111118 và bóng đặc
 * - Biểu tượng chữ P hình học phẳng, không gradient
 * - Typography: Be Vietnam Pro font-normal, không gradient
 */
export const Logo: React.FC<LogoProps> = ({
  className = "",
  onClick,
  size = "md",
  showText = true,
}) => {
  const iconSizeClass = {
    sm: "h-8 w-8 text-sm",
    md: "h-9 w-9 text-base",
    lg: "h-11 w-11 text-lg",
  }[size];

  const textSizeClass = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center gap-2.5 transition-transform duration-120 active:translate-y-[1px] cursor-pointer focus:outline-hidden ${className}`}
      aria-label="PeerMind - Về trang chủ"
      title="PeerMind - Về trang chủ"
    >
      <div
        className={`${iconSizeClass} rounded-full bg-[#0b7a75] dark:bg-[#2dd4bf] border-2 border-[#111118] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] flex items-center justify-center shrink-0 transition-colors`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="w-5 h-5"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Chữ P hình học phẳng phong cách SuperHi */}
          <path
            d="M6 4h7a5 5 0 0 1 5 5 5 5 0 0 1-5 5H6V4z"
            className="fill-white dark:fill-[#111118]"
          />
          <circle
            cx="13"
            cy="9"
            r="2"
            className="fill-[#0b7a75] dark:fill-[#2dd4bf]"
          />
          <rect
            x="6"
            y="12"
            width="3.5"
            height="8"
            rx="0"
            className="fill-white dark:fill-[#111118]"
          />
          {/* Chấm tròn trang trí màu vàng SuperHi */}
          <circle
            cx="18.5"
            cy="18.5"
            r="2"
            className="fill-[#ffda00]"
          />
        </svg>
      </div>
      {showText && (
        <span className={`${textSizeClass} font-normal tracking-[-0.015em] leading-none select-none text-[#111118] dark:text-[#f0f6ff]`}>
          PeerMind
        </span>
      )}
    </button>
  );
};

export default Logo;
