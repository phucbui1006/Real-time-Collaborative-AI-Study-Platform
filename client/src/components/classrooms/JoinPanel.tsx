import React, { useState } from "react";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-200">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-300">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.15)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  padding: "10px 14px",
  fontSize: 14,
  outline: "none",
};

export function PasswordInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        style={{ ...inputStyle, paddingRight: 64 }}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-indigo-300 hover:text-indigo-200"
      >
        {show ? "Ẩn" : "Hiện"}
      </button>
    </div>
  );
}

export function ErrorBox({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-sm"
      style={{ background: "rgba(244,63,94,0.15)", color: "#fda4af" }}
    >
      {children}
    </div>
  );
}

interface JoinPanelProps {
  form: { code: string; password: string };
  setForm: React.Dispatch<React.SetStateAction<{ code: string; password: string }>>;
  onSubmit: () => void;
  busy: boolean;
  error: string;
}

export function JoinPanel({ form, setForm, onSubmit, busy, error }: JoinPanelProps) {
  return (
    <aside className="col-span-12 lg:col-span-4 min-w-0">
      <div
        className="sticky top-6 overflow-hidden rounded-3xl p-6 shadow-xl"
        style={{ background: "#141a3d", color: "#fff" }}
      >
        <h2 className="text-lg font-semibold">Tham gia phòng học</h2>
        <p className="mt-1 text-sm text-slate-400">
          Nhập mã phòng và mật khẩu do người tạo phòng gửi cho bạn.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
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
            className="w-full rounded-full py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
            style={{ background: "#7c3aed" }}
          >
            {busy ? "Đang xử lý…" : "Vào phòng"}
          </button>
        </form>
      </div>
    </aside>
  );
}
