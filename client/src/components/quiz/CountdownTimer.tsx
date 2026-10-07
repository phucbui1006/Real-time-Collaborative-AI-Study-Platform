// client/src/components/quiz/CountdownTimer.tsx
// Đồng hồ đếm ngược cho mỗi câu hỏi Quiz

import React, { useEffect, useState } from 'react'

interface CountdownTimerProps {
  seconds: number
  onTimeUp?: () => void
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ seconds, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(seconds)

  useEffect(() => {
    setTimeLeft(seconds)
  }, [seconds])

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp?.()
      return
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, onTimeUp])

  const percentage = (timeLeft / seconds) * 100

  return (
    <div className="w-full max-w-2xl space-y-2">
      <div className="flex justify-between items-center text-sm font-semibold">
        <span className="text-slate-400">Thời gian còn lại</span>
        <span className={timeLeft <= 5 ? 'text-rose-400 animate-bounce' : 'text-indigo-400'}>
          {timeLeft}s
        </span>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-1000 ${
            timeLeft <= 5 ? 'bg-rose-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

export default CountdownTimer
