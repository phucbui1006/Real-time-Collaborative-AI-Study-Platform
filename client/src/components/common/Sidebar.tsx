// components/common/Sidebar.tsx — Sidebar thêm tài liệu
import { ChangeEvent, useState } from "react";
import { Icon } from "./Icon";

export function Sidebar() {
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).map((file) => file.name);
    setUploadedFiles((current) => [...files, ...current]);
    event.target.value = "";
  };

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-28 rounded-[1.75rem] bg-[#17204d] p-5 text-white shadow-[0_20px_45px_rgba(23,32,77,0.15)]">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-400 text-[#17204d]">
            <Icon className="h-5 w-5">
              <path d="M12 3v12M8 7l4-4 4 4" />
              <path d="M5 13v6h14v-6" />
            </Icon>
          </span>
          <div>
            <p className="text-sm font-bold">Thêm tài liệu</p>
            <p className="text-[0.68rem] text-slate-400">Kho cá nhân của bạn</p>
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border border-dashed border-white/25 bg-white/5 px-4 py-7 text-center transition hover:border-sky-400 hover:bg-white/10">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-sky-300">
            <Icon className="h-5 w-5">
              <path d="M12 5v14M5 12h14" />
            </Icon>
          </span>
          <strong className="mt-3 text-sm">Chọn file để tải lên</strong>
          <span className="mt-1 text-[0.68rem] leading-5 text-slate-400">PDF, DOCX, PPTX hoặc hình ảnh</span>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,image/*"
            onChange={handleFileUpload}
            className="sr-only"
          />
        </label>

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold">File vừa thêm</p>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[0.65rem] text-slate-300">
              {uploadedFiles.length}
            </span>
          </div>
          {uploadedFiles.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {uploadedFiles.slice(0, 4).map((file, index) => (
                <li key={`${file}-${index}`} className="flex items-center gap-2 rounded-xl bg-white/8 p-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-400/20 text-violet-200">
                    <Icon className="h-4 w-4">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16h16V8Z" />
                      <path d="M14 2v6h6M8 13h8M8 17h5" />
                    </Icon>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[0.7rem] font-medium text-slate-200">{file}</span>
                  <button
                    onClick={() => setUploadedFiles((files) => files.filter((_, fileIndex) => fileIndex !== index))}
                    className="text-slate-500 transition hover:text-white cursor-pointer"
                    aria-label={`Xóa ${file}`}
                  >
                    <Icon className="h-3.5 w-3.5">
                      <path d="m6 6 12 18M18 6 6 18" />
                    </Icon>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 rounded-xl bg-white/5 px-3 py-4 text-center text-[0.68rem] leading-5 text-slate-500">
              Chưa có file mới.
              <br />
              Tài liệu tải lên sẽ hiện ở đây.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
