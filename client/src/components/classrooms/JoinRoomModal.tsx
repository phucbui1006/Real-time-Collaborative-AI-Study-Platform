import { useState, useEffect } from "react";
import { Field, PasswordInput, ErrorBox, inputStyle } from "./JoinPanel";

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tham gia phòng học"
        className="w-full rounded-3xl p-6 shadow-2xl transition-all"
        style={{ maxWidth: 420, background: "#141a3d", color: "#fff" }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Tham gia phòng học</h2>
            <p className="mt-1 text-xs text-slate-400">
              Nhập mã phòng và mật khẩu do người tạo phòng gửi cho bạn.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="text-xl leading-none text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            ✕
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
              style={{ ...inputStyle, letterSpacing: "0.3em", fontWeight: 700, fontSize: 18 }}
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

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50 cursor-pointer"
            style={{ background: "#7c3aed" }}
          >
            {busy ? "Đang xử lý…" : "Vào phòng"}
          </button>
        </form>
      </div>
    </div>
  );
}
