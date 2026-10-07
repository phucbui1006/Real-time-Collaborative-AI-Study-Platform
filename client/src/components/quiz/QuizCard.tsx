// client/src/components/quiz/QuizCard.tsx
// Thẻ hiển thị câu hỏi trắc nghiệm và các lựa chọn đáp án

import React from 'react'

export interface QuizQuestion {
  id: string
  questionText: string
  options: string[]
  correctIndex?: number
}

interface QuizCardProps {
  question: QuizQuestion
  selectedOption: number | null
  onSelectOption: (index: number) => void
  disabled?: boolean
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  selectedOption,
  onSelectOption,
  disabled = false
}) => {
  return (
    <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <h3 className="text-xl font-bold text-white mb-6 leading-relaxed">
        {question.questionText}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((opt, idx) => {
          const isSelected = selectedOption === idx
          return (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => onSelectOption(idx)}
              className={`p-4 rounded-lg text-left font-medium transition duration-200 cursor-pointer border ${
                isSelected
                  ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <span className="font-bold mr-2 text-indigo-400">
                {String.fromCharCode(65 + idx)}.
              </span>
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default QuizCard
