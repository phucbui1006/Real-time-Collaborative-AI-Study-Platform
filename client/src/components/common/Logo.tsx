import React from "react";

type LogoProps = {
  className?: string;
  onClick?: () => void;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  variant?: "full" | "icon" | "monochrome";
};

/**
 * Component Logo chuẩn của Permind theo phong cách SuperHi:
 * 
 * 1. Ý nghĩa biểu tượng:
 * - Chữ "P" hình học tối giản: Khởi nguồn của "Per" (Bạn đồng hành) & "Platform" (Nền tảng học tập).
 * - Chấm tròn vàng (#ffda00): Tượng trưng cho "Người bạn cùng học" (Peer) luôn song hành cùng tâm trí học tập (Mind).
 * - Khối chứa xanh ngọc (#0b7a75 / dark: #2dd4bf): Màu hành động duy nhất, thể hiện năng lượng tri thức và tập trung.
 * 
 * 2. Wordmark "Permind":
 * - "Per": Màu đen mực #111118 (dark: #f0f6ff), thể hiện sự vững chãi, tin cậy.
 * - "mind": Màu xanh ngọc thương hiệu #0b7a75 (dark: #2dd4bf), thể hiện trí tuệ và công nghệ AI.
 * - Chấm vàng cuối từ: Dấu chấm nhận diện thương hiệu đồng điệu với biểu tượng.
 * 
 * 3. Quy tắc sử dụng:
 * - Bản đầy đủ (variant="full"): Dùng cho Header, Landing Page, Auth modal.
 * - Bản biểu tượng (variant="icon"): Dùng cho Favicon, Avatar, không gian hẹp (<120px).
 * - Vùng trống an toàn: Tối thiểu 1/2 chiều cao biểu tượng xung quanh logo.
 * - Dark mode: Viền sáng (#f0f6ff) tương phản cao trên nền #111118, bóng đặc #2dd4bf.
 */
export const Logo: React.FC<LogoProps> = ({
  className = "",
  onClick,
  size = "md",
  showText = true,
  variant = "full",
}) => {
  const iconSizeClass = {
    xs: "h-7 w-7",
    sm: "h-8 w-8",
    md: "h-9 w-9",
    lg: "h-11 w-11",
    xl: "h-14 w-14",
  }[size];

  const svgSizeClass = {
    xs: "w-4 h-4",
    sm: "w-4.5 h-4.5",
    md: "w-5 h-5",
    lg: "w-6 h-6",
    xl: "w-8 h-8",
  }[size];

  const textSizeClass = {
    xs: "text-base",
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  }[size];

  const dotSizeClass = {
    xs: "w-1.5 h-1.5 ml-1",
    sm: "w-1.5 h-1.5 ml-1",
    md: "w-2 h-2 ml-1.5",
    lg: "w-2.5 h-2.5 ml-1.5",
    xl: "w-3 h-3 ml-2",
  }[size];

  const shouldRenderText = variant !== "icon" && showText;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex shrink-0 items-center gap-2.5 transition-transform duration-120 active:translate-y-[1px] cursor-pointer focus:outline-hidden ${className}`}
      aria-label="Permind — Học tập cùng bạn bè & AI"
      title="Permind — Học tập cùng bạn bè & AI"
    >
      {/* Biểu tượng P + Chấm vàng bạn đồng hành */}
      <div
        className={`${iconSizeClass} rounded-full bg-[#0b7a75] dark:bg-[#2dd4bf] border-2 border-[#111118] dark:border-[#f0f6ff] shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#2dd4bf] flex items-center justify-center shrink-0 transition-all`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className={svgSizeClass}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vòm chữ P hình học phẳng */}
          <path
            d="M6 4h7a5 5 0 0 1 5 5 5 5 0 0 1-5 5H6V4z"
            className="fill-white dark:fill-[#111118]"
          />
          {/* Lỗ khoét trong vòm P */}
          <circle
            cx="13"
            cy="9"
            r="2"
            className="fill-[#0b7a75] dark:fill-[#2dd4bf]"
          />
          {/* Thân đứng chữ P */}
          <rect
            x="6"
            y="12"
            width="3.5"
            height="8"
            rx="0.5"
            className="fill-white dark:fill-[#111118]"
          />
          {/* Chấm vàng bạn đồng hành (Peer Companion Dot) */}
          <circle
            cx="18.5"
            cy="18.5"
            r="2.5"
            className="fill-[#ffda00] stroke-[#111118] dark:stroke-[#111118]"
            strokeWidth="0.75"
          />
        </svg>
      </div>

      {/* Wordmark bản sắc riêng */}
      {shouldRenderText && (
        <span
          className={`${textSizeClass} font-normal tracking-[-0.025em] leading-none select-none inline-flex items-baseline`}
        >
          <span className="text-[#111118] dark:text-[#f0f6ff] transition-colors">Per</span>
          <span className="text-[#0b7a75] dark:text-[#2dd4bf] transition-colors">mind</span>
          <span
            className={`inline-block rounded-full bg-[#ffda00] border border-[#111118] dark:border-[#f0f6ff] shadow-[0_1px_0_0_#111118] dark:shadow-[0_1px_0_0_#000000] transition-transform group-hover:scale-125 ${dotSizeClass}`}
            title="Peer — Người bạn cùng học đồng hành"
          />
        </span>
      )}
    </button>
  );
};

export default Logo;
