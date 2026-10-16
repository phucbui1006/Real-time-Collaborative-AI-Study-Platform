import React, { useEffect, useState } from "react";
import minionsImg from "../../assets/minions-transparent.png";

/**
 * ClassroomHeroAnimation
 * Auto-looping 3-Phase Storyboard Animation (7.5s cycle: 2.5s per phase):
 * - Pha 1 (0s - 2.5s): Đang đếm ngón tay tính toán
 *   + Chalkboard: "1 + 1 = ?" (dấu ? nhấp nháy animate-bounce), gợi ý "Gợi ý: Hãy đếm kỹ trên ngón tay nhé! ✏️"
 *   + Stage: Ký hiệu toán học (+, ÷, ?) và giọt mồ hôi bay lơ lửng quanh đầu Bob
 *   + Stage: Thanh tiến độ đếm ngược ở mép trên sân khấu chạy rút ngắn 100% về 0%
 * - Pha 2 (2.5s - 5.0s): Giơ bảng trả lời: 1 + 1 = 5
 *   + Chalkboard: "1 + 1 = 5" (số 5 màu cam rung lắc), gợi ý "Học sinh vừa bấm chuông chốt đáp án!"
 *   + Stage: Bảng vàng "ĐÁP ÁN: 5" bật lên từ dưới
 *   + Stage: Sau 400ms, thẻ đỏ "X - SAI BÉT RỒI!" bung ra với hiệu ứng rung lắc ngang (animate-wiggle)
 * - Pha 3 (5.0s - 7.5s): Trả lời sai • Thầy gõ đầu BONK!
 *   + Chalkboard: Số 5 bị gạch đỏ, hiện số 2 xanh bên cạnh (1 + 1 = 2), gợi ý "Ối! Tính nhầm một chút rồi!"
 *   + Stage: Cuộn giấy trắng xoay gõ xuống (rotate-[-25deg] -> rotate-[15deg] origin-bottom-right)
 *   + Stage: Huy hiệu "💥 BONK!" bung ra (scale-110) + 3 ngôi sao vàng quay tròn (animate-spin) quanh đầu Bob
 * - Bottom Bar: Chấm tròn đổi màu theo pha (emerald -> amber -> rose) + 3 vạch tiến trình (Pha 1/3, 2/3, 3/3)
 *   có thanh fill chạy mượt 2.5s và cho phép click thủ công để chuyển pha.
 */
export const ClassroomHeroAnimation: React.FC = () => {
  const [phase, setPhase] = useState<1 | 2 | 3>(1);
  const [showWrongCard, setShowWrongCard] = useState(false);

  // Tự động chuyển pha sau mỗi 2500ms (Tổng 7.5s cho 3 pha)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase((prev) => (prev === 3 ? 1 : ((prev + 1) as 1 | 2 | 3)));
    }, 2500);

    return () => clearTimeout(timer);
  }, [phase]);

  // Sau 400ms ở Pha 2, bung thẻ đỏ "X - SAI BÉT RỒI!"
  useEffect(() => {
    if (phase === 2) {
      setShowWrongCard(false);
      const wrongTimer = setTimeout(() => {
        setShowWrongCard(true);
      }, 400);
      return () => clearTimeout(wrongTimer);
    } else {
      setShowWrongCard(false);
    }
  }, [phase]);

  return (
    <div className="relative mx-auto w-full max-w-lg select-none lg:max-w-none">
      {/* Khung viền kính hiện đại bo góc chuẩn phong cách Glassmorphism */}
      <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-b from-sky-100/90 via-indigo-50/80 to-purple-100/90 p-4 shadow-2xl backdrop-blur-md sm:p-5">
        
        {/* Ánh nắng lớp học chiếu nghiêng (Pixar lighting) */}
        <div className="pointer-events-none absolute -top-12 -left-12 h-64 w-64 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-purple-300/30 blur-3xl" />

        {/* 1. KHUNG BẢNG ĐEN PHÍA TRÊN (Chalkboard v1.0) */}
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
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-emerald-900/80 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-300 border border-emerald-700/60">
                Pha {phase}/3
              </span>
              <span className="text-[11px] font-medium text-emerald-400/80 hidden sm:inline">Chalkboard v1.0</span>
            </div>
          </div>

          {/* Phép tính toán học biến đổi theo 3 Pha */}
          <div className="mt-2.5 flex items-center justify-center gap-2 text-center">
            <div className="font-mono text-2xl font-black tracking-widest text-amber-100 sm:text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] flex items-center">
              <span>1 + 1 =&nbsp;</span>
              
              {/* Pha 1: Dấu ? màu vàng nhấp nháy phóng to nhẹ (animate-bounce) */}
              {phase === 1 && (
                <span className="inline-block text-amber-300 underline decoration-wavy decoration-amber-400 animate-bounce">
                  ?
                </span>
              )}

              {/* Pha 2: Đổi thành số 5 màu cam rung lắc nhẹ */}
              {phase === 2 && (
                <span className="inline-block text-amber-400 drop-shadow-sm animate-[shake_0.4s_ease-in-out_infinite]">
                  5
                </span>
              )}

              {/* Pha 3: Số 5 bị gạch ngang màu đỏ và hiện số 2 màu xanh lá bên cạnh */}
              {phase === 3 && (
                <span className="inline-flex items-center">
                  <span className="relative text-rose-400 line-through decoration-rose-500 decoration-4">
                    5
                  </span>
                  <span className="ml-2.5 text-emerald-400 animate-pulse drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]">
                    2
                  </span>
                  <span className="ml-1 text-base text-emerald-300 font-bold">✓</span>
                </span>
              )}
            </div>
          </div>

          {/* Dòng chữ phấn gợi ý theo từng pha */}
          <div className="mt-1.5 text-center text-xs text-emerald-200/90 italic transition-all duration-300 min-h-[1.25rem]">
            {phase === 1 && "Gợi ý: Hãy đếm kỹ trên ngón tay nhé! ✏️"}
            {phase === 2 && "Học sinh vừa bấm chuông chốt đáp án!"}
            {phase === 3 && "Ối! Tính nhầm một chút rồi!"}
          </div>
        </div>

        {/* 2. KHUNG SÂN KHẤU NHÂN VẬT Ở GIỮA (Stage Container) */}
        <div
          className={`relative h-64 sm:h-72 w-full overflow-hidden rounded-2xl bg-gradient-to-b from-sky-50 to-amber-50/60 border border-slate-200/70 transition-transform duration-200 ${
            phase === 3 ? "animate-[shake_0.4s_ease-in-out]" : ""
          }`}
        >
          {/* Thanh tiến độ thời gian mỏng ở mép trên sân khấu chạy rút ngắn từ 100% về 0% (Pha 1) */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-200/40 z-20 overflow-hidden">
            {phase === 1 && (
              <div
                key="timer-phase-1"
                className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 animate-timer-drain shadow-xs"
              />
            )}
          </div>

          {/* Sàn gỗ lớp học */}
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-amber-200/50 via-amber-100/40 to-transparent border-t border-amber-200/40" />

          {/* Pha 1: 3 ký hiệu toán học nổi (+, ÷, ?) & giọt mồ hôi bay lơ lửng quanh đầu Học sinh Bob với animate-bounce lệch nhịp */}
          <div
            className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ${
              phase === 1 ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="absolute left-[28%] top-[16%] animate-bounce text-xl font-bold text-indigo-500 drop-shadow">
              +
            </span>
            <span className="absolute left-[38%] top-[10%] animate-bounce text-2xl font-black text-sky-500 drop-shadow [animation-delay:100ms]">
              &divide;
            </span>
            <span className="absolute left-[20%] top-[8%] animate-bounce text-2xl font-black text-amber-500 drop-shadow [animation-delay:200ms]">
              ?
            </span>

            {/* Giọt mồ hôi toát ra khi vắt óc suy nghĩ 💧 💦 */}
            <span className="absolute left-[34%] top-[30%] animate-ping text-xl">
              💧
            </span>
            <span className="absolute left-[16%] top-[34%] animate-bounce text-base [animation-delay:150ms]">
              💦
            </span>
          </div>

          {/* Pha 2 & 3: Bảng vàng "ĐÁP ÁN: 5" bật lên từ dưới (scale-100 translate-y-0 opacity-100, ở Pha 1 thì scale-50 translate-y-4 opacity-0) */}
          <div
            className={`absolute left-[18%] sm:left-[20%] top-[4%] z-20 transition-all duration-500 ease-out transform ${
              phase >= 2
                ? "scale-100 translate-y-0 opacity-100"
                : "scale-50 translate-y-4 opacity-0 pointer-events-none"
            }`}
          >
            <div className="relative flex flex-col items-center">
              {/* Tấm bảng gỗ số 5 */}
              <div className="relative rounded-2xl border-4 border-amber-800 bg-amber-400 px-5 py-2.5 text-center shadow-2xl ring-4 ring-amber-200/80">
                <span className="block text-[10px] font-black uppercase tracking-wider text-amber-900">
                  ĐÁP ÁN: 5
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

          {/* Pha 2: Sau 400ms, thẻ đỏ "X - SAI BÉT RỒI!" bung ra với hiệu ứng rung lắc ngang (animate-wiggle) */}
          <div
            className={`pointer-events-none absolute left-[12%] sm:left-[14%] top-[14%] sm:top-[16%] z-30 transition-all duration-300 ease-out transform ${
              phase === 2 && showWrongCard
                ? "scale-100 rotate-[-6deg] opacity-100 animate-wiggle"
                : phase === 3
                ? "scale-90 rotate-[-4deg] opacity-80"
                : "scale-0 rotate-12 opacity-0"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <div className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-3xl bg-rose-600 text-5xl sm:text-6xl font-black text-white shadow-2xl ring-8 ring-rose-200/90">
                &times;
              </div>
              <span className="absolute -bottom-6 whitespace-nowrap rounded-full bg-rose-700 px-3 py-1 text-xs font-black text-white shadow-xl uppercase tracking-wider ring-2 ring-white">
                X - SAI BÉT RỒI!
              </span>
            </div>
          </div>

          {/* Pha 3: Cuộn giấy trắng thực hiện chuyển động xoay gõ xuống (rotate-[-25deg] -> rotate-[15deg] tại tâm origin-bottom-right) + Huy hiệu "💥 BONK!" bung ra (scale-110) */}
          <div
            className={`pointer-events-none absolute left-[26%] sm:left-[28%] top-[16%] sm:top-[18%] z-40 origin-bottom-right transition-all duration-300 ease-out transform ${
              phase === 3
                ? "scale-100 opacity-100 animate-bonk"
                : "-translate-y-12 rotate-[-25deg] scale-75 opacity-0"
            }`}
          >
            <div className="relative flex items-center">
              {/* Cuộn giấy tròn */}
              <div className="h-8 w-28 rounded-full border-2 border-slate-300 bg-gradient-to-r from-slate-100 via-white to-slate-200 shadow-xl" />
              
              {/* Huy hiệu vàng 💥 BONK! bung ra (scale-110) */}
              <div className="absolute -top-7 left-3 rounded-xl bg-gradient-to-r from-amber-300 to-yellow-400 px-3 py-1 text-xs font-black text-red-600 shadow-lg ring-2 ring-red-500 uppercase tracking-wider rotate-12 scale-110 drop-shadow-md animate-bounce">
                💥 BONK!
              </div>
            </div>
          </div>

          {/* Pha 3: Hiệu ứng 3 ngôi sao vàng quay tròn (animate-spin) phía trên đầu nhân vật học sinh */}
          <div
            className={`pointer-events-none absolute inset-0 z-35 transition-all duration-300 ${
              phase === 3 ? "scale-100 opacity-100" : "scale-50 opacity-0"
            }`}
          >
            <span className="absolute left-[20%] top-[12%] inline-block animate-spin text-xl text-amber-400 drop-shadow-md [animation-duration:2.5s]">
              ⭐
            </span>
            <span className="absolute left-[30%] top-[8%] inline-block animate-spin text-2xl text-yellow-300 drop-shadow-md [animation-duration:1.8s]">
              💫
            </span>
            <span className="absolute left-[38%] top-[14%] inline-block animate-spin text-lg text-amber-500 drop-shadow-md [animation-duration:2s]">
              ✨
            </span>
          </div>

          {/* Hai chú Minion (Đã tách nền trong suốt) */}
          <div className="absolute inset-x-0 bottom-1 flex items-end justify-center px-4">
            <img
              src={minionsImg}
              alt="Thầy trò Minion lớp học thông minh"
              className={`h-48 sm:h-56 w-auto object-contain transition-transform duration-200 ${
                phase === 3 ? "translate-y-1.5" : "translate-y-0"
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

        {/* 3. THANH TRẠNG THÁI & TIẾN TRÌNH DƯỚI CÙNG (Bottom Status Bar) */}
        <div className="mt-3 flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/95 p-3 shadow-xs backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-2.5">
          {/* Chấm tròn đổi màu theo pha & Mô tả trạng thái động */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
              <span
                className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                  phase === 1
                    ? "bg-emerald-400"
                    : phase === 2
                    ? "bg-amber-400"
                    : "bg-rose-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                  phase === 1
                    ? "bg-emerald-500 ring-2 ring-emerald-200"
                    : phase === 2
                    ? "bg-amber-500 ring-2 ring-amber-200"
                    : "bg-rose-500 ring-2 ring-rose-200"
                }`}
              />
            </span>

            <div className="min-w-0 flex-1 truncate text-xs font-semibold">
              {phase === 1 && (
                <span className="text-emerald-700">
                  Đang đếm ngón tay tính toán...
                </span>
              )}
              {phase === 2 && (
                <span className="text-amber-800">
                  Giơ bảng trả lời: 1 + 1 = 5
                </span>
              )}
              {phase === 3 && (
                <span className="text-rose-700">
                  Trả lời sai • Thầy gõ đầu BONK!
                </span>
              )}
            </div>
          </div>

          {/* 3 Vạch tiến trình tương tác (Pha 1/3, 2/3, 3/3) có thanh fill chạy mượt trong 2.5s */}
          <div
            className="flex items-center gap-1.5 shrink-0 self-end sm:self-center"
            role="tablist"
            aria-label="Chọn pha Storyboard"
          >
            {([1, 2, 3] as const).map((p) => {
              const isActive = phase === p;
              const isPast = phase > p;
              return (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  className={`group flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-mono transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-100 font-bold text-slate-900 shadow-2xs ring-1 ring-slate-300"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                  title={`Chuyển sang Pha ${p}/3`}
                  aria-label={`Chuyển sang Pha ${p}/3`}
                  aria-selected={isActive}
                  role="tab"
                >
                  <span className="text-[10px] font-bold">Pha {p}/3</span>
                  {/* Thanh fill tiến trình 2.5s */}
                  <div className="h-1.5 w-7 sm:w-9 overflow-hidden rounded-full bg-slate-200">
                    <div
                      key={`${p}-${isActive ? "active" : isPast ? "done" : "idle"}`}
                      className={`h-full rounded-full ${
                        isPast
                          ? "w-full bg-indigo-600"
                          : isActive
                          ? "bg-indigo-600 animate-progress-fill"
                          : "w-0 bg-transparent"
                      }`}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
