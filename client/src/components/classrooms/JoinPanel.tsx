import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        {label}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-rose-600 dark:text-rose-400">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

export const inputClassName = "w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-3 py-2 text-sm outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-colors";

export const inputStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: 14,
  outline: "none",
  transition: "border-color 0.15s ease",
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
    <div className="relative flex items-center">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClassName} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer transition-colors"
        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
      >
        {show ? (
          <EyeOff className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Eye className="h-4 w-4" strokeWidth={1.75} />
        )}
      </button>
    </div>
  );
}

export function ErrorBox({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-md border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400">
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
