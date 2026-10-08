import { useState, useEffect } from "react";
import { Field, PasswordInput, ErrorBox, inputStyle } from "./JoinPanel";
import { randomCode } from "../../services/roomService";

interface CreateRoomModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; code: string; password: string }) => Promise<{ name: string; code: string }>;
}

export function CreateRoomModal({ open, onClose, onCreate }: CreateRoomModalProps) {
  const [form, setForm] = useState({ name: "", code: randomCode(), password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ name: string; code: string } | null>(null);

  // Đặt lại form mỗi khi mở popup
  useEffect(() => {
    if (open) {
      setForm({ name: "", code: randomCode(), password: "" });
      setError("");
      setCreated(null);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.6)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tạo phòng học"
        className="w-full rounded-3xl p-6 shadow-2xl"
        style={{ maxWidth: 420, background: "#141a3d", color: "#fff" }}
      >
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">{created ? "Phòng đã sẵn sàng" : "Tạo phòng học"}</h2>
          <button onClick={onClose} aria-label="Đóng" className="text-xl leading-none text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {created ? (
          <div className="mt-4 rounded-2xl p-4 text-center" style={{ background: "rgba(16,185,129,0.15)" }}>
            <div className="text-sm text-emerald-300">Đã tạo phòng "{created.name}"</div>
            <div className="mt-2 text-3xl font-bold tracking-widest">{created.code}</div>
            <div className="mt-1 text-xs text-slate-400">
              Gửi mã phòng và mật khẩu cho bạn bè để họ tham gia.
            </div>
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => navigator.clipboard?.writeText(created.code)}
                className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100"
              >
                Sao chép mã phòng
              </button>
              <button
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-semibold text-white"
                style={{ background: "#7c3aed" }}
              >
                Xong
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
                style={inputStyle}
                value={form.name}
                maxLength={50}
                autoFocus
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="VD: Nhóm ôn thi Toán 12"
              />
            </Field>

            <Field label="Mã phòng (6 số)" hint="Tự tạo ngẫu nhiên, bạn có thể đổi.">
              <div className="flex gap-2">
                <input
                  style={{ ...inputStyle, letterSpacing: "0.3em", fontWeight: 700, fontSize: 18 }}
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
                  className="shrink-0 rounded-xl px-3 text-xs font-semibold hover:bg-white/20"
                  style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
                >
                  Tạo mã
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

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ background: "#7c3aed" }}
            >
              {busy ? "Đang tạo…" : "Tạo phòng"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
