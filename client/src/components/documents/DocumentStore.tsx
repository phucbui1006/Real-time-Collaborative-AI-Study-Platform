// components/documents/DocumentStore.tsx — Kho tài liệu (Cột 6/10)
import { useRef, useState } from "react";
import { DocumentItem } from "../../services/aiService";

type DocumentStoreProps = {
  docs: DocumentItem[];
  selectedId: number;
  onSelect: (id: number) => void;
  onUpload: (files: File[]) => void;
};

export function DocumentStore({ docs, selectedId, onSelect, onUpload }: DocumentStoreProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | File[] | null) => {
    if (files && files.length > 0) onUpload(Array.from(files));
  };

  return (
    <section className="lg:col-span-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-teal-700 uppercase">XIN CHÀO, MINH ANH</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Kho tài liệu</h1>
          <p className="mt-1 text-sm text-slate-500">Chọn một tài liệu để hỏi AI ở khung bên phải.</p>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 hover:bg-violet-700 transition cursor-pointer shrink-0"
        >
          + Tải tài liệu lên
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Thống kê */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          { v: "24", l: "Tài liệu đã lưu", c: "text-sky-600" },
          { v: "12h", l: "Thời gian học", c: "text-violet-700" },
          { v: "68%", l: "Tiến độ trung bình", c: "text-emerald-600" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl bg-white p-4 shadow-xs ring-1 ring-slate-100">
            <div className={`text-2xl font-bold ${s.c}`}>{s.v}</div>
            <div className="mt-1 text-sm text-slate-700">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Vùng kéo thả */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`mt-5 cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center text-sm transition ${
          dragging ? "border-violet-500 bg-violet-50" : "border-slate-300 bg-white/60 hover:bg-white"
        }`}
      >
        <span className="font-semibold text-slate-700 block">Kéo thả hoặc chọn file để tải lên</span>
        <span className="mt-1 block text-xs text-slate-400">PDF, DOCX, PPTX hoặc ảnh chụp</span>
      </div>

      {/* Danh sách tài liệu */}
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-xs ring-1 ring-slate-100">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Tài liệu của bạn</h2>
          <button className="text-sm font-medium text-violet-700 hover:underline cursor-pointer">Xem tất cả</button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {docs.map((d) => {
            const active = d.id === selectedId;
            return (
              <button
                key={d.id}
                onClick={() => onSelect(d.id)}
                aria-pressed={active}
                className={`rounded-2xl p-4 text-left ring-1 transition cursor-pointer ${
                  active ? "bg-violet-50/80 ring-2 ring-violet-500 shadow-xs" : "bg-white ring-slate-200 hover:ring-slate-300"
                }`}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white shadow-xs"
                  style={{ background: d.color }}
                >
                  {d.icon}
                </div>
                <div className="mt-3 text-[11px] font-medium text-slate-400">{d.subject}</div>
                <div className="mt-0.5 font-semibold text-slate-900 leading-snug">{d.title}</div>
                <div className="mt-4 flex justify-between text-xs text-slate-500">
                  <span>Tiến độ</span>
                  <span className="font-semibold text-slate-700">{d.progress}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${d.progress}%`, background: d.color }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
