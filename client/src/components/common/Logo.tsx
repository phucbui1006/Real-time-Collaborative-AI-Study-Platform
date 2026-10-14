import React from "react";
import logoCropped from "../../assets/logo/logo-cropped.png";

type LogoProps = {
  className?: string;
  onClick?: () => void;
  size?: "sm" | "md" | "lg";
};

/**
 * Component Logo chuẩn của PeerMind:
 * - Đã crop sát viền 100%, xóa bỏ toàn bộ khoảng trắng thừa.
 * - Căn giữa chuẩn mực theo chiều dọc với Navbar.
 * - Hỗ trợ onClick để điều hướng quay về trang đầu mượt mà.
 */
export const Logo: React.FC<LogoProps> = ({ className = "", onClick, size = "md" }) => {
  const heightClass = {
    sm: "h-8 sm:h-9",
    md: "h-10 sm:h-11",
    lg: "h-12 sm:h-14",
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex shrink-0 items-center transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus:outline-hidden ${className}`}
      aria-label="PeerMind - Về trang đầu"
      title="PeerMind - Về trang đầu"
    >
      <img
        src={logoCropped}
        alt="PeerMind"
        className={`${heightClass} aspect-[782/269] w-auto shrink-0 object-contain transition-opacity duration-150 group-hover:opacity-90`}
      />
    </button>

  );
};
