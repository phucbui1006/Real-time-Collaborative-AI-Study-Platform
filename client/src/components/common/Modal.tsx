// client/src/components/common/Modal.tsx
import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }[maxWidth]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`w-full ${maxWidthClass} bg-white dark:bg-[#1b1b26] border-2 border-[#111118] dark:border-[#2a2a3a] rounded-lg shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000] overflow-hidden transition-all duration-150`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e1edff] dark:border-[#2a2a3a]">
          <h3 className="text-lg font-normal text-[#111118] dark:text-[#f0f6ff] tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#111118] dark:border-[#2a2a3a] text-[#111118] dark:text-[#f0f6ff] hover:bg-[#d0e2ff] dark:hover:bg-[#2e2e42] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#0b7a75] focus-visible:outline-none"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-6 text-slate-700 dark:text-slate-300">{children}</div>
      </div>
    </div>
  )
}

export default Modal
