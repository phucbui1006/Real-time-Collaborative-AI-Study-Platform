import { LeaderboardRow } from "../../services/examService";

interface LeaderboardProps {
  rows: LeaderboardRow[];
  total: number;
  limit?: number;
}

export function Leaderboard({ rows, total, limit }: LeaderboardProps) {
  const shown = limit ? rows.slice(0, limit).concat(rows.slice(limit).filter((r) => r.me)) : rows;
  return (
    <ul className="space-y-2">
      {shown.map((r) => {
        const isTop1 = r.rank === 1;
        const isTop2 = r.rank === 2;
        const isTop3 = r.rank === 3;

        return (
          <li
            key={r.name}
            className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-xs transition-colors border ${
              r.me
                ? "bg-indigo-50/70 border-indigo-200 text-slate-900"
                : "bg-white border-slate-200/80 hover:bg-slate-50/70 text-slate-700"
            }`}
          >
            <span
              className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-mono font-bold shrink-0 tabular-nums ${
                isTop1
                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                  : isTop2
                  ? "bg-slate-200 text-slate-700 border border-slate-300"
                  : isTop3
                  ? "bg-amber-50 text-amber-900 border border-amber-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
              {r.rank}
            </span>
            <span className="flex-1 truncate font-medium text-slate-900">
              {r.name} {r.me && <span className="text-[10px] text-indigo-600 font-semibold">(Bạn)</span>}
            </span>
            <span className="text-[11px] text-slate-500 font-mono tabular-nums">
              {r.answered}/{total} câu
            </span>
            <span className="w-12 text-right font-mono font-bold text-slate-900 tabular-nums">
              {r.score.toFixed(1)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
