import React from "react";
import logoIcon from "../../assets/logo/per-transparent.png";

type LogoProps = {
  className?: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
};

/**
 * Component Logo chuẩn của PeerMind theo UI_DESIGN_SKILL.md (Mục 4):
 * - Biểu tượng chữ P lớn bên trái (h-9 w-9)
 * - Khối chữ PeerMind bên phải (text-xl font-bold tracking-tight):
 *   chữ "Peer" màu text-sky-500, chữ "Mind" màu text-indigo-950
 */
export const Logo: React.FC<LogoProps> = ({
  className = "",
  onClick,
  size = "md",
  showText = true,
}) => {
  const iconSizeClass = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-10 w-10",
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
      className={`group inline-flex shrink-0 items-center gap-3 transition-opacity duration-150 hover:opacity-90 cursor-pointer focus:outline-hidden ${className}`}
      aria-label="PeerMind - Về trang chủ"
      title="PeerMind - Về trang chủ"
    >
      <img
        src={logoIcon}
        alt="PeerMind Icon"
        className={`${iconSizeClass} shrink-0 object-contain`}
      />
      {showText && (
        <span className={`${textSizeClass} font-normal tracking-[-0.015em] leading-none select-none text-[#111118] dark:text-[#f0f6ff]`}>
          PeerMind
        </span>
      )}
    </button>
  );
};

export default Logo;
