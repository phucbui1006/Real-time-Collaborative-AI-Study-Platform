import React from "react";
import { Timer } from "lucide-react";

interface IdleWarningModalProps {
  open: boolean;
  remainingSeconds: number;
  onContinue: () => void;
  onLogout: () => void;
}

export const IdleWarningModal: React.FC<IdleWarningModalProps> = ({
  open,
  remainingSeconds,
  onContinue,
  onLogout,
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111118]/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-warning-title"
    >
      <div className="relative w-full max-w-md rounded-[24px] border-2 border-[#111118] dark:border-[#2a2a3a] bg-white dark:bg-[#1b1b26] p-7 shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000] transition-colors duration-150 text-center">
        {/* Biểu tượng đồng hồ đếm ngược SuperHi */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#ffda00] text-[#111118] border-2 border-[#111118] shadow-[0_3px_0_0_#111118] mb-4">
          <Timer className="h-7 w-7" strokeWidth={1.75} />
        </div>

        <h2
          id="idle-warning-title"
          className="text-2xl font-normal tracking-[-0.015em] text-[#111118] dark:text-[#f0f6ff]"
        >
          Sắp hết phiên hoạt động
        </h2>

        <p className="mt-2 text-sm font-normal text-[#111118]/75 dark:text-[#f0f6ff]/75 leading-relaxed">
          Bạn đã không có hoạt động trong 14 phút. Để bảo mật tài khoản, hệ thống sẽ tự động đăng xuất sau:
        </p>

        {/* Khối hiển thị số giây đếm ngược chuẩn font-mono */}
        <div className="my-5 flex items-center justify-center">
          <div className="font-mono text-5xl font-normal text-[#0b7a75] dark:text-[#2dd4bf] px-8 py-3 rounded-[20px] bg-[#e1edff] dark:bg-[#242436] border-2 border-[#111118] shadow-[0_4px_0_0_#111118] tabular-nums">
            {remainingSeconds}s
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onContinue}
            className="primary-button w-full justify-center cursor-pointer text-base py-3"
          >
            Tiếp tục phiên học →
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="secondary-button w-full justify-center cursor-pointer text-sm py-2.5"
          >
            Đăng xuất ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdleWarningModal;
