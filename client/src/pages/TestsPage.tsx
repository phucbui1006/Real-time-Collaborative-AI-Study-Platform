// pages/TestsPage.tsx — Trang bài kiểm tra
import { Icon } from "../components/common/Icon";

export default function TestsPage() {
  const tests = [
    { title: "Kiểm tra Đại số giữa kỳ", subject: "Toán học", questions: 30, minutes: 45, status: "Làm bài", ready: true },
    { title: "English Grammar — Unit 6", subject: "Tiếng Anh", questions: 25, minutes: 30, status: "Làm bài", ready: true },
    { title: "Dao động điều hòa", subject: "Vật lý", questions: 20, minutes: 25, status: "Đã đạt 8.5", ready: false },
  ];

  return (
    <>
      <div className="rounded-[1.75rem] bg-[#17204d] p-6 text-white sm:flex sm:items-center sm:justify-between sm:p-8 shadow-xl shadow-[#17204d]/10">
        <div>
          <p className="text-sm font-semibold text-sky-400">Thử thách tuần này</p>
          <h2 className="mt-2 text-2xl font-bold">Hoàn thành 3 bài kiểm tra</h2>
          <p className="mt-2 text-sm text-slate-400">Bạn đã hoàn thành 2/3. Chỉ còn một bước nữa!</p>
        </div>
        <div className="mt-5 flex h-20 w-20 items-center justify-center rounded-full border-8 border-violet-400 sm:mt-0">
          <strong>67%</strong>
        </div>
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-xs ring-1 ring-slate-100 mt-6">
        <h2 className="text-xl font-bold text-slate-900">Bài kiểm tra dành cho bạn</h2>
        <div className="mt-5 divide-y divide-slate-100">
          {tests.map((test) => (
            <article key={test.title} className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Icon className="h-6 w-6">
                  <path d="M9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </Icon>
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold text-violet-600 uppercase tracking-wider">{test.subject}</p>
                <h3 className="mt-1 font-bold text-slate-900">{test.title}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {test.questions} câu hỏi · {test.minutes} phút
                </p>
              </div>
              <button
                className={
                  test.ready
                    ? "rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200 transition hover:bg-violet-700 cursor-pointer"
                    : "rounded-full bg-emerald-50 px-5 py-2.5 text-sm font-bold text-emerald-700"
                }
              >
                {test.status}
              </button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
