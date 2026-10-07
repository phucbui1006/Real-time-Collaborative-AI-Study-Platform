// client/src/components/quiz/LeaderboardTable.tsx
// Bảng xếp hạng điểm số người chơi

import React from 'react'

export interface LeaderboardEntry {
  rank: number
  userName: string
  score: number
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[]
}

export const LeaderboardTable: React.FC<LeaderboardTableProps> = ({ entries }) => {
  return (
    <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <h3 className="text-lg font-bold text-white mb-4 text-center">🏆 Bảng Xếp Hạng</h3>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.rank}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
          >
            <div className="flex items-center space-x-3">
              <span className="font-bold text-indigo-400 w-6 text-center">#{entry.rank}</span>
              <span className="text-white font-medium">{entry.userName}</span>
            </div>
            <span className="font-bold text-amber-400">{entry.score} điểm</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LeaderboardTable
