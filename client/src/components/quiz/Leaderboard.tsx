import { LeaderboardRow } from "../../services/examService";

interface LeaderboardProps {
  rows: LeaderboardRow[];
  total: number;
  limit?: number;
}

export function Leaderboard({ rows, total, limit }: LeaderboardProps) {
  const shown = limit ? rows.slice(0, limit).concat(rows.slice(limit).filter((r) => r.me)) : rows;
  return (
    <ul className="space-y-2.5">
      {shown.map((r) => {
        const isTop1 = r.rank === 1;
        const isTop2 = r.rank === 2;
        const isTop3 = r.rank === 3;

        return (
          <li
            key={r.name}
            className={`flex items-center gap-3 rounded-[5000px] px-4 py-2.5 text-sm font-normal border-2 border-[#111118] transition-all ${
              r.me
                ? "bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff] shadow-[0_2px_0_0_#0b7a75]"
                : "bg-white dark:bg-[#1b1b26] text-[#111118] dark:text-[#f0f6ff] shadow-[0_2px_0_0_#111118]"
            }`}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-mono font-normal shrink-0 tabular-nums border border-[#111118] shadow-[0_1px_0_0_#111118] ${
                isTop1
                  ? "bg-[#ffda00] text-[#111118]"
                  : isTop2
                  ? "bg-[#91d8ec] text-[#111118]"
                  : isTop3
                  ? "bg-[#ffbac4] text-[#111118]"
                  : "bg-[#e1edff] dark:bg-[#242436] text-[#111118] dark:text-[#f0f6ff]"
              }`}
            >
              {r.rank}
            </span>
            <span className="flex-1 truncate font-normal text-[#111118] dark:text-[#f0f6ff]">
              {r.name} {r.me && <span className="text-xs text-[#0b7a75] dark:text-[#2dd4bf]">(Bạn)</span>}
            </span>
            <span className="text-xs text-[#111118]/70 dark:text-[#f0f6ff]/70 font-mono tabular-nums">
              {r.answered}/{total} câu
            </span>
            <span className="w-14 text-right font-mono text-base font-normal text-[#111118] dark:text-[#f0f6ff] tabular-nums">
              {r.score.toFixed(1)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
