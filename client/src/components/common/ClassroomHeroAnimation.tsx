import React, { useEffect, useState } from "react";
import minionsImg from "../../assets/minions-transparent.png";

/**
 * ClassroomHeroAnimation
 * Tái hiện kịch bản 3D Pixar lớp học hài hước:
 * - Thầy giáo chỉ vào bảng "1 + 1 = ?"
 * - Học sinh toát mồ hôi suy nghĩ với ký hiệu toán học bay lơ lửng
 * - Học sinh tự tin giơ bảng số "5"
 * - Dấu "X" đỏ khổng lồ xuất hiện
 * - Cuộn giấy gõ nhẹ "BONK!" lên đầu học sinh
 * - Chu kỳ lặp lại ~5.5s (đã bỏ đoạn 6s-8s theo yêu cầu)
 */
export const ClassroomHeroAnimation: React.FC = () => {
  // Phase timing:
  // 0: Suy nghĩ, toát mồ hôi (0s - 2.0s)
  // 1: Tự tin giơ biển số "5" (2.0s - 3.4s)
  // 2: Dấu X đỏ + BONK! gõ đầu (3.4s - 5.2s)
  const [phase, setPhase] = useState<0 | 1 | 2>(0);

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>;
    let t2: ReturnType<typeof setTimeout>;
    let t3: ReturnType<typeof setTimeout>;


    const runLoop = () => {
      setPhase(0);
      t1 = setTimeout(() => {
        setPhase(1);
      }, 2000);

      t2 = setTimeout(() => {
        setPhase(2);
      }, 3400);

      t3 = setTimeout(() => {
        runLoop();
      }, 5400);
    };

    runLoop();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-lg select-none lg:max-w-none">
      {/* Khung viền kính hiện đại bo góc chuẩn phong cách Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-b from-sky-100/90 via-indigo-50/80 to-purple-100/90 p-4 shadow-2xl backdrop-blur-md sm:p-5">
        
        {/* Ánh nắng lớp học chiếu nghiêng (Pixar lighting) */}
        <div className="pointer-events-none absolute -top-12 -left-12 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-purple-300/30 blur-3xl" />

        {/* Bảng đen lớp học (Chalkboard) */}
        <div className="relative mb-3 overflow-hidden rounded-2xl border-4 border-amber-900/60 bg-emerald-950 p-3.5 text-white shadow-inner sm:p-4">
          {/* Vân gỗ bảng */}
          <div className="absolute inset-0 bg-[radial-gradient(#15803d_1px,transparent_1px)] opacity-20 [background-size:12px_12px]" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold tracking-wider text-emerald-300 uppercase">
                Lớp học Toán PeerMind
              </span>
            </div>
            <span className="text-[11px] font-medium text-emerald-400/80">Chalkboard v1.0</span>
          </div>

          <div className="mt-2.5 flex items-center justify-center gap-4 text-center">
            <div className="font-mono text-2xl font-black tracking-widest text-amber-100 sm:text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
              1 + 1 = <span className="text-amber-300 underline decoration-wavy decoration-amber-400">?</span>
            </div>
          </div>

          {/* Dòng chữ phấn gợi ý nhỏ */}
          <div className="mt-1 text-center text-xs text-emerald-200/70 italic">
            Gợi ý: Hãy đếm kỹ trên ngón tay nhé! ✏️
          </div>
        </div>

        {/* Sân khấu lớp học và hai nhân vật Minions */}
        <div className={`relative h-64 sm:h-72 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-50 to-amber-50/60 border border-slate-200/60 transition-transform duration-200 ${
          phase === 2 ? "translate-y-1 animate-[shake_0.4s_ease-in-out]" : ""
        }`}>
          {/* Sàn gỗ lớp học */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-amber-200/50 via-amber-100/40 to-transparent border-t border-amber-200/40" />

          {/* Ký hiệu toán học bay lơ lửng khi học sinh đang vắt óc tính toán (Phase 0) */}
          <div className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
            phase === 0 ? "opacity-100" : "opacity-0"
          }`}>
            <span className="absolute left-[28%] top-[18%] animate-bounce text-lg font-bold text-indigo-500 drop-shadow">
              +
            </span>
            <span className="absolute left-[18%] top-[28%] animate-pulse text-base font-bold text-violet-500 drop-shadow">
              &times;
            </span>
            <span className="absolute left-[38%] top-[12%] animate-bounce text-xl font-black text-sky-500 drop-shadow [animation-delay:150ms]">
              &divide;
            </span>
            <span className="absolute left-[12%] top-[15%] animate-pulse text-lg font-black text-rose-500 drop-shadow [animation-delay:300ms]">
              &minus;
            </span>
            <span className="absolute left-[24%] top-[8%] animate-bounce text-xl font-black text-amber-500 drop-shadow [animation-delay:200ms]">
              ?
            </span>

            {/* Giọt mồ hôi toát ra 💦 */}
            <span className="absolute left-[35%] top-[34%] animate-ping text-xl">
              💧
            </span>
            <span className="absolute left-[16%] top-[38%] animate-bounce text-sm [animation-delay:100ms]">
              💦
            </span>
          </div>

          {/* Biển đáp án "5" giơ lên tự tin (Phase 1 & 2) */}
          <div
            className={`absolute left-[20%] top-[4%] z-20 transition-all duration-300 transform ${
              phase >= 1
                ? "scale-100 translate-y-0 opacity-100"
                : "scale-50 translate-y-6 opacity-0 pointer-events-none"
            }`}
          >
            <div className="relative flex flex-col items-center">
              {/* Tấm bảng gỗ số 5 */}
              <div className="relative rounded-2xl border-4 border-amber-800 bg-amber-400 px-5 py-2.5 text-center shadow-2xl ring-4 ring-amber-200/80">
                <span className="block text-[10px] font-black uppercase tracking-wider text-amber-900">
                  Đáp án em chọn
                </span>
                <span className="font-mono text-4xl sm:text-5xl font-black text-amber-950 drop-shadow-sm">
                  5
                </span>
                {/* Góc hào quang tự tin */}
                <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-300 text-xs shadow-md">
                  ✨
                </span>
              </div>
              {/* Cán cầm bảng */}
              <div className="h-9 w-2 rounded-b bg-amber-800 shadow" />
            </div>
          </div>

          {/* Dấu X đỏ khổng lồ chớp nháy khi phát hiện sai (Phase 2) */}
          <div
            className={`pointer-events-none absolute left-[14%] top-[16%] z-30 transition-all duration-200 transform ${
              phase === 2
                ? "scale-100 rotate-[-8deg] opacity-100"
                : "scale-0 rotate-12 opacity-0"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-rose-600 text-5xl sm:text-6xl font-black text-white shadow-2xl ring-8 ring-rose-200/80 animate-pulse">
                &times;
              </div>
              <span className="absolute -bottom-6 whitespace-nowrap rounded-full bg-rose-700 px-3 py-1 text-xs font-black text-white shadow-lg uppercase tracking-wider">
                Sai bét rồi!
              </span>
            </div>
          </div>

          {/* Cuộn giấy khổng lồ gõ đầu: BONK! (Phase 2) */}
          <div
            className={`pointer-events-none absolute left-[28%] top-[18%] z-40 transition-all duration-150 transform ${
              phase === 2
                ? "translate-y-2 rotate-[-25deg] scale-100 opacity-100"
                : "-translate-y-12 rotate-[40deg] scale-75 opacity-0"
            }`}
          >
            {/* Cuộn giấy tròn */}
            <div className="relative flex items-center">
              <div className="h-8 w-28 rounded-full border-2 border-slate-300 bg-gradient-to-r from-slate-100 via-white to-slate-200 shadow-xl" />
              {/* Hiệu ứng tia nổ truyện tranh: BONK! */}
              <div className="absolute -top-7 left-4 animate-bounce rounded-xl bg-amber-300 px-2.5 py-1 text-xs font-black text-red-600 shadow-md ring-2 ring-red-500 uppercase tracking-wider rotate-12">
                💥 BONK!
              </div>
            </div>
          </div>

          {/* Hai chú Minion (Đã tách nền trong suốt) */}
          <div className="absolute inset-x-0 bottom-1 flex items-end justify-center px-4">
            <img
              src={minionsImg}
              alt="Thầy trò Minion lớp học thông minh"
              className={`h-48 sm:h-56 w-auto object-contain transition-transform duration-200 ${
                phase === 2 ? "translate-y-1" : "translate-y-0"
              }`}
            />
          </div>

          {/* Thẻ phụ chú thích nhân vật */}
          <div className="absolute bottom-2 left-3 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs backdrop-blur-xs">
            👨‍🎓 Học sinh: Bob
          </div>
          <div className="absolute bottom-2 right-3 rounded-full bg-white/85 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 shadow-xs backdrop-blur-xs">
            👨‍🏫 Thầy giáo: Kevin
          </div>
        </div>

        {/* Thanh trạng thái diễn biến kịch bản ở đáy khung */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-white/70 px-3.5 py-2 text-xs font-medium text-slate-600 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                phase === 0
                  ? "bg-amber-400 animate-ping"
                  : phase === 1
                  ? "bg-sky-500 animate-bounce"
                  : "bg-rose-500 animate-pulse"
              }`}
            />
            <span className="font-semibold text-slate-800">
              {phase === 0 && "Học sinh đang vắt óc tính toán..."}
              {phase === 1 && "Học sinh tự tin chốt đáp án: 5!"}
              {phase === 2 && "Dấu X đỏ xuất hiện & Thầy gõ đầu BONK!"}
            </span>
          </div>
          <span className="rounded-md bg-purple-100 px-2 py-0.5 text-[11px] font-bold text-purple-700">
            {phase === 0 && "Pha 1/3"}
            {phase === 1 && "Pha 2/3"}
            {phase === 2 && "Pha 3/3"}
          </span>
        </div>

      </div>
    </div>
  );
};
