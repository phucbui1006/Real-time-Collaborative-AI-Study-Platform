import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  className = "",
  itemLabel = "mục",
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Tính toán các trang hiển thị (hỗ trợ hiển thị dấu ...)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-[#111118]/10 dark:border-white/10 ${className}`}
    >
      <div className="text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-normal">
        Hiển thị <span className="font-semibold text-[#111118] dark:text-white">{startItem}</span> -{" "}
        <span className="font-semibold text-[#111118] dark:text-white">{endItem}</span> trên{" "}
        <span className="font-semibold text-[#111118] dark:text-white">{totalItems}</span> {itemLabel}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-sm border-2 border-[#111118]/30 dark:border-white/20 bg-white dark:bg-[#1b1b26] text-[#111118] dark:text-[#f0f6ff] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/10 active:translate-y-[1px] transition-all cursor-pointer select-none"
          title="Trang trước"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Trước</span>
        </button>

        <div className="flex items-center gap-1">
          {getPageNumbers().map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 text-xs text-[#111118]/50 dark:text-white/50 select-none"
                >
                  ...
                </span>
              );
            }
            const pageNum = p as number;
            const isActive = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[28px] h-7 px-1.5 text-xs rounded-sm font-medium transition-all select-none cursor-pointer flex items-center justify-center ${
                  isActive
                    ? "bg-[#0b7a75] text-white border-2 border-[#111118] dark:border-[#2dd4bf] shadow-[0_2px_0_0_#111118]"
                    : "border-2 border-[#111118]/20 dark:border-white/10 bg-white dark:bg-[#1b1b26] text-[#111118] dark:text-[#f0f6ff] hover:bg-slate-100 dark:hover:bg-white/10 hover:border-[#111118]/40"
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-sm border-2 border-[#111118]/30 dark:border-white/20 bg-white dark:bg-[#1b1b26] text-[#111118] dark:text-[#f0f6ff] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/10 active:translate-y-[1px] transition-all cursor-pointer select-none"
          title="Trang sau"
        >
          <span className="hidden sm:inline">Sau</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
export default Pagination;
