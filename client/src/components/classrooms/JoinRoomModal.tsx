import { useState, useEffect } from "react";
import { X, LogIn } from "lucide-react";
import { Field, PasswordInput, ErrorBox } from "./JoinPanel";

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

  // Update form when initialCode changes or modal opens
  useEffect(() => {
    if (open) {
      setForm({ code: initialCode, password: "" });
      setError("");
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tham gia phòng học"
        className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 p-6 border border-slate-200/90 dark:border-slate-800 shadow-xl transition-all"
      >
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50 tracking-tight">
              Tham gia phòng học
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Nhập mã phòng và mật khẩu do chủ phòng chia sẻ.
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

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Field label="Mã phòng (6 số)">
            <input
              style={{ letterSpacing: "0.25em" }}
              className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-mono tabular-nums text-center font-bold px-3 py-2 text-base outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
              inputMode="numeric"
              value={form.code}
              maxLength={6}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.replace(/\D/g, "").slice(0, 6) }))
              }
              placeholder="______"
              autoFocus
            />
          </Field>

          <Field label="Mật khẩu phòng">
            <PasswordInput
              value={form.password}
              onChange={(v) => setForm((f) => ({ ...f, password: v }))}
              placeholder="Nhập mật khẩu"
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
              <LogIn className="h-3.5 w-3.5" strokeWidth={1.75} />
              {busy ? "Đang xử lý…" : "Vào phòng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
