import { useState, useEffect } from "react";
import { X, Plus, Copy, Check, SignIn, ArrowsClockwise, Eye, EyeSlash } from "@phosphor-icons/react";
import { ErrorBox } from "./JoinPanel";
import { randomCode } from "../../services/roomService";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; code: string; password: string }) => Promise<{ name: string; code: string }>;
  onEnterCreatedRoom?: (room: { name: string; code: string }) => void;
}

export function CreateRoomModal({ open, onClose, onCreate, onEnterCreatedRoom }: CreateRoomModalProps) {
  const [form, setForm] = useState({ name: "", code: randomCode(), password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Đặt lại form mỗi khi mở popup
  useEffect(() => {
    if (open) {
      setForm({ name: "", code: randomCode(), password: "" });
      setError("");
      setCreated(null);
      setCopied(false);
      setShowPassword(false);
    }
  }, [open]);

  // Đóng bằng phím Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    setError("");
    if (!form.name.trim()) return setError("Hãy nhập tên phòng.");
    if (form.code.length !== 6) return setError("Mã phòng phải gồm đúng 6 chữ số.");
    if (form.password.length < 4) return setError("Mật khẩu cần từ 4 ký tự.");
    setBusy(true);
    try {
      const room = await onCreate({ ...form, name: form.name.trim() });
      setCreated(room);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : "Có lỗi xảy ra. Hãy thử lại.";
      setError(errMsg);
    } finally {
      setBusy(false);
    }
  };

  const handleCopyCode = () => {
    if (!created) return;
    navigator.clipboard?.writeText(created.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111118]/60 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tạo phòng học"
        className="w-full max-w-md rounded-lg bg-white dark:bg-[#1b1b26] p-7 border-2 border-[#111118] dark:border-[#2a2a3a] shadow-[0_8px_0_0_#111118] dark:shadow-[0_8px_0_0_#000000] transition-all"
      >
        <div className="flex items-start justify-between pb-4 border-b border-[#e1edff] dark:border-[#2a2a3a]">
          <div>
            <h2 className="text-2xl font-normal text-[#111118] dark:text-[#f0f6ff] tracking-[-0.015em]">
              {created ? "Phòng học đã sẵn sàng" : "Tạo phòng học mới"}
            </h2>
            <p className="mt-1 text-sm font-normal text-[#111118]/75 dark:text-[#f0f6ff]/75">
              {created
                ? "Chia sẻ mã phòng và mật khẩu cho bạn bè để cùng học nhóm."
                : "Thiết lập tên phòng, mã số và mật khẩu bảo vệ."}
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

        {created ? (
          <div className="mt-6 space-y-5">
            <div className="rounded-[4px] border border-[#111118] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] p-6 text-center shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000]">
              <div className="text-sm font-normal text-[#111118] dark:text-[#f0f6ff]">
                Đã khởi tạo phòng <span className="underline decoration-[#0b7a75] decoration-2">{created.name}</span>
              </div>
              <div className="mt-3 text-3xl font-mono tracking-[0.3em] text-[#111118] dark:text-[#2dd4bf]">
                {created.code}
              </div>
              <p className="mt-2 text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70">
                Gửi mã 6 số này kèm mật khẩu phòng cho bạn bè.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-sm bg-white dark:bg-[#1b1b26] border border-[#111118] dark:border-[#2a2a3a] text-[#111118] dark:text-[#f0f6ff] text-base font-normal shadow-[0_3px_0_0_#111118] dark:shadow-[0_3px_0_0_#000000] active:translate-y-[1px] transition-transform cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={18} weight="regular" className="text-[#16ab59]" />
                    <span>Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} weight="regular" />
                    <span>Sao chép mã</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  onEnterCreatedRoom?.(created);
                  onClose();
                }}
                className="inline-flex items-center gap-2 h-11 px-6 rounded-pill bg-[#0b7a75] hover:bg-[#08635f] dark:bg-[#2dd4bf] dark:text-[#111118] text-white text-base font-normal border border-[#111118] shadow-[0_3px_0_0_#111118] dark:shadow-[0_3px_0_0_#000000] active:translate-y-[1px] transition-transform cursor-pointer"
              >
                <SignIn size={18} weight="regular" />
                <span>Vào phòng ngay →</span>
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div>
              <label className="block mb-2 text-sm text-[#111118] dark:text-[#f0f6ff]">
                Tên phòng học hoặc môn học:
              </label>
              <input
                className="w-full h-12 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] placeholder:text-[#111118]/40 px-5 text-base outline-none focus:border-[#0b7a75] dark:focus:border-[#2dd4bf] focus:ring-2 focus:ring-[#0b7a75] dark:focus:ring-[#2dd4bf] transition-colors"
                value={form.name}
                maxLength={50}
                autoFocus
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Ôn thi Giải tích 1"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm text-[#111118] dark:text-[#f0f6ff]">
                Mã phòng ngẫu nhiên (6 số):
              </label>
              <div className="flex gap-2">
                <input
                  className="font-mono text-center text-xl tracking-[0.3em] flex-1 h-12 rounded-sm border border-[#e1edff] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] outline-none focus:border-[#0b7a75] dark:focus:border-[#2dd4bf] focus:ring-2 focus:ring-[#0b7a75] dark:focus:ring-[#2dd4bf]"
                  inputMode="numeric"
                  value={form.code}
                  maxLength={6}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))
                  }
                  placeholder="______"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, code: randomCode() }))}
                  className="w-12 h-12 rounded-sm border border-[#111118] dark:border-[#2a2a3a] bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] flex items-center justify-center shadow-[0_2px_0_0_#111118] dark:shadow-[0_2px_0_0_#000000] active:translate-y-[1px] transition-transform cursor-pointer shrink-0"
                  title="Tạo mã ngẫu nhiên mới"
                >
                  <ArrowsClockwise size={20} weight="regular" />
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm text-[#111118] dark:text-[#f0f6ff]">
                Mật khẩu phòng:
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(v) => setForm((f) => ({ ...f, password: v.target.value }))}
                  placeholder="Đặt mật khẩu (từ 4 ký tự)"
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
                <Plus size={18} weight="regular" />
                <span>{busy ? "Đang tạo…" : "Khởi tạo phòng →"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
