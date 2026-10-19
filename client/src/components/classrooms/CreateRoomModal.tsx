import { useState, useEffect } from "react";
import { X, Plus, Copy, Check, LogIn, RefreshCw } from "lucide-react";
import { Field, PasswordInput, ErrorBox } from "./JoinPanel";
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

  // Đặt lại form mỗi khi mở popup
  useEffect(() => {
    if (open) {
      setForm({ name: "", code: randomCode(), password: "" });
      setError("");
      setCreated(null);
      setCopied(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tạo phòng học"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200/90 dark:border-slate-800 shadow-xl transition-all"
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
              {created ? "Phòng học đã sẵn sàng" : "Tạo phòng học mới"}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {created
                ? "Chia sẻ mã phòng và mật khẩu cho bạn bè để bắt đầu học nhóm."
                : "Thiết lập tên phòng, mã số và mật khẩu bảo vệ."}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        {created ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/60 dark:bg-emerald-950/40 p-5 text-center">
              <div className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Đã khởi tạo phòng <strong className="font-semibold">{created.name}</strong>
              </div>
              <div className="mt-3 text-3xl font-mono font-bold tracking-widest text-slate-900 dark:text-slate-50 tabular-nums">
                {created.code}
              </div>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                Gửi mã 6 số này kèm mật khẩu phòng cho bạn bè.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
                    <span className="text-emerald-700 dark:text-emerald-300">Đã sao chép</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
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
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-all cursor-pointer shadow-xs active:translate-y-[1px]"
              >
                <LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />
                Vào phòng ngay
              </button>
            </div>
          </div>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <Field label="Tên phòng học">
              <input
                className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors"
                value={form.name}
                maxLength={50}
                autoFocus
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Nhóm ôn thi Toán 12"
              />
            </Field>

            <Field label="Mã phòng (6 số)" hint="Tự động sinh ngẫu nhiên, bạn có thể tạo mã khác.">
              <div className="flex gap-2">
                <input
                  style={{ letterSpacing: "0.25em" }}
                  className="font-mono tabular-nums text-center font-bold px-3 py-2 text-base outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 flex-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
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
                  className="inline-flex items-center gap-1 shrink-0 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
                  title="Tạo mã ngẫu nhiên mới"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" strokeWidth={1.75} />
                  <span>Đổi mã</span>
                </button>
              </div>
            </Field>

            <Field label="Mật khẩu phòng">
              <PasswordInput
                value={form.password}
                onChange={(v) => setForm((f) => ({ ...f, password: v }))}
                placeholder="Đặt mật khẩu (từ 4 ký tự)"
              />
            </Field>

            <ErrorBox>{error}</ErrorBox>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer shadow-2xs"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-all cursor-pointer shadow-xs active:translate-y-[1px] disabled:opacity-50 disabled:pointer-events-none"
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={1.75} />
                {busy ? "Đang tạo…" : "Tạo phòng"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
