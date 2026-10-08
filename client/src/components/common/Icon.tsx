// components/common/Icon.tsx — Icon component dùng chung
import { ReactNode } from "react";

export type IconProps = {
  children: ReactNode;
  className?: string;
};

export function Icon({ children, className = "h-6 w-6" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}
