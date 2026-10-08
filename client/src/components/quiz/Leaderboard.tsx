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
      {shown.map((r) => (
        <li
          key={r.name}
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all"
          style={{
            background: r.me ? "#ede9fe" : "#f8fafc",
            border: r.me ? "1px solid #c4b5fd" : "1px solid #e2e8f0",
          }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white shadow-xs"
            style={{
              background:
                r.rank === 1
                  ? "#f59e0b"
                  : r.rank === 2
                  ? "#94a3b8"
                  : r.rank === 3
                  ? "#b45309"
                  : "#cbd5e1",
            }}
          >
            {r.rank}
          </span>
          <span className="flex-1 truncate font-medium text-slate-900">{r.name}</span>
          <span className="text-xs text-slate-500">
            {r.answered}/{total} câu
          </span>
          <span className="w-10 text-right font-bold text-slate-900">{r.score.toFixed(1)}</span>
        </li>
      ))}
    </ul>
  );
}
