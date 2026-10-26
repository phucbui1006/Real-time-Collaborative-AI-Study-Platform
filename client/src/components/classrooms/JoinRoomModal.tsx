import { useState, useEffect } from "react";
import { X, SignIn, Eye, EyeSlash } from "@phosphor-icons/react";
import { ErrorBox } from "./JoinPanel";

interface JoinRoomModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { code: string; password: string }) => Promise<void>;
  initialCode?: string;
}

export function JoinRoomModal({ open, onClose, onSubmit, initialCode = "" }: JoinRoomModalProps) {
  const [form, setForm] = useState({ code: initialCode, password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Update form when initialCode changes or modal opens
  useEffect(() => {
    if (open) {
      setForm({ code: initialCode, password: "" });
      setError("");
      setShowPassword(false);
    }
  }, [open, initialCode]);

  // Close modal on Escape key
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    setError("");
    if (form.code.length !== 6) return setError("Mã phòng phải gồm đúng 6 chữ số.");
    if (!form.password) return setError("Hãy nhập mật khẩu phòng.");
    setBusy(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Có lỗi xảy ra. Hãy thử lại.";
      setError(errMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111118]/60 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tham gia phòng học"
        className="w-full max-w-md rounded-lg bg-white dark:bg-[#1b1b26] p-7 border-2 border-[#111118] dark:border-[#2a2a3a] shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000] transition-all"
      >
        <div className="flex items-start justify-between pb-4 border-b border-[#e1edff] dark:border-[#2a2a3a]">
          <div>
            <h2 className="text-2xl font-normal text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">
              Tham gia phòng học
            </h2>
            <p className="mt-1 text-sm font-normal text-[#111118]/75 dark:text-[#f0f6ff]/75">
              Nhập mã phòng 6 số và mật khẩu do bạn bè chia sẻ.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-sm bg-[#e1edff] dark:bg-[#242436] border border-[#e1edff] dark:border-[#2a2a3a] text-[#111118] dark:text-[#f0f6ff] flex items-center justify-center shadow-[0_2px_0_0_#111118] hover:bg-[#d5e5ff] active:translate-y-[1px] transition-transform cursor-pointer shrink-0"
          >
            <X size={18} weight="regular" />
          </button>
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <div>
            <label className="block mb-2 text-sm text-[#111118] dark:text-[#f0f6ff]">
              Mã phòng (6 số):
            </label>
            <input
              className="w-full h-12 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] placeholder:text-[#111118]/40 font-mono text-center text-xl tracking-[0.3em] outline-none focus:border-[#0b7a75] dark:focus:border-[#2dd4bf] focus:ring-2 focus:ring-[#0b7a75] dark:focus:ring-[#2dd4bf] transition-colors"
              inputMode="numeric"
              value={form.code}
              maxLength={6}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))
              }
              placeholder="482 913"
              autoFocus
            />
          </div>

          <div>
            <label className="block mb-2 text-sm text-[#111118] dark:text-[#f0f6ff]">
              Mật khẩu phòng:
            </label>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Nhập mật khẩu phòng"
                className="w-full h-12 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] placeholder:text-[#111118]/40 px-5 pr-12 text-base outline-none focus:border-[#0b7a75] dark:focus:border-[#2dd4bf] focus:ring-2 focus:ring-[#0b7a75] dark:focus:ring-[#2dd4bf] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-[#111118]/60 dark:text-[#f0f6ff]/60 hover:text-[#111118] dark:hover:text-white"
                title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              >
                {showPassword ? <EyeSlash size={20} weight="regular" /> : <Eye size={20} weight="regular" />}
              </button>
            </div>
          </div>

          <ErrorBox>{error}</ErrorBox>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-sm bg-[#000000] dark:bg-[#2a2a3a] text-white dark:text-[#f0f6ff] text-base font-normal border border-[#111118] dark:border-[#2dd4bf] shadow-[0_3px_0_0_#0b7a75] dark:shadow-[0_3px_0_0_#2dd4bf] active:translate-y-[1px] transition-transform cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 h-11 px-6 rounded-pill bg-[#0b7a75] hover:bg-[#08635f] dark:bg-[#2dd4bf] dark:text-[#111118] text-white text-base font-normal border border-[#111118] shadow-[0_3px_0_0_#111118] dark:shadow-[0_3px_0_0_#000000] active:translate-y-[1px] transition-transform cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              <SignIn size={18} weight="regular" />
              <span>{busy ? "Đang kết nối…" : "Vào phòng ngay →"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
