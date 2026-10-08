// pages/ClassroomsPage.tsx — Trang phòng học
import { Icon } from "../components/common/Icon";

export default function ClassroomsPage() {
  const rooms = [
    { title: "Nhóm ôn thi Toán 12", members: 18, next: "19:30 hôm nay", color: "bg-sky-100 text-sky-700" },
    { title: "English Speaking Club", members: 24, next: "20:00 thứ 5", color: "bg-violet-100 text-violet-700" },
    { title: "Lập trình Web cơ bản", members: 12, next: "09:00 thứ 7", color: "bg-emerald-100 text-emerald-700" },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_0.42fr]">
      <section className="rounded-3xl bg-white p-6 shadow-xs ring-1 ring-slate-100">
        <h2 className="text-xl font-bold text-slate-900">Phòng học đang tham gia</h2>
        <div className="mt-5 space-y-4">
          {rooms.map((room, index) => (
            <article
              key={room.title}
              className="flex flex-col gap-4 rounded-2xl border border-slate-100 p-5 sm:flex-row sm:items-center hover:border-violet-200 hover:shadow-xs transition"
            >
              <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-extrabold ${room.color}`}>
                0{index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900">{room.title}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {room.members} thành viên · Buổi tiếp theo: {room.next}
                </p>
              </div>
              <button className="rounded-full bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-violet-600 hover:text-white cursor-pointer justify-center">
                Vào phòng
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] bg-violet-600 p-6 text-white shadow-lg shadow-violet-200">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/15">
          <Icon className="h-6 w-6">
            <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z" />
          </Icon>
        </span>
        <p className="mt-8 text-sm text-violet-200">Sắp diễn ra</p>
        <h3 className="mt-1 text-xl font-bold">Ôn tập Đại số</h3>
        <p className="mt-2 text-sm text-violet-100">Hôm nay, 19:30</p>
        <button className="mt-8 w-full rounded-full bg-white px-5 py-3 text-sm font-bold text-violet-700 transition hover:bg-violet-50 cursor-pointer">
          Đặt lời nhắc
        </button>
      </section>
    </div>
  );
}
