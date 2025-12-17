import React, { useState } from 'react';
import { ClarifyingQuestion } from '../types';

interface ClarificationFormProps {
  questions: ClarifyingQuestion[];
  onSubmit: (answers: string[]) => void;
  isLoading: boolean;
}

const ClarificationForm: React.FC<ClarificationFormProps> = ({ questions, onSubmit, isLoading }) => {
  const [answers, setAnswers] = useState<string[]>(new Array(questions.length).fill(''));

  const handleOptionSelect = (qIndex: number, option: string) => {
    const newAnswers = [...answers];
    newAnswers[qIndex] = option;
    setAnswers(newAnswers);
  };

  const isComplete = answers.every(a => a.length > 0);

  return (
    <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-stone-100">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800">完善画像细节</h2>
        <p className="text-stone-500 mt-2">
          为了生成更精准的消费者，我们需要稍微了解更多细节。
        </p>
      </div>

      <div className="space-y-8">
        {questions.map((q, idx) => (
          <div key={idx} className="animate-fade-in-up">
            <h3 className="font-semibold text-lg text-stone-900 mb-3">{idx + 1}. {q.question}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {q.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleOptionSelect(idx, option)}
                  className={`px-4 py-3 rounded-lg text-left text-sm font-medium transition-all border
                    ${answers[idx] === option 
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-1 ring-emerald-600' 
                      : 'bg-white border-stone-200 text-stone-600 hover:border-emerald-300 hover:bg-stone-50'
                    }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 pt-6 border-t border-stone-100">
        <button
          onClick={() => isComplete && onSubmit(answers)}
          disabled={!isComplete || isLoading}
          className={`w-full py-3.5 px-6 rounded-lg text-white font-semibold text-lg shadow-lg transition-all
            ${!isComplete || isLoading
              ? 'bg-stone-300 cursor-not-allowed'
              : 'bg-emerald-800 hover:bg-emerald-900 transform hover:-translate-y-0.5'
            }`}
        >
          {isLoading ? '生成最终画像...' : '确认并生成'}
        </button>
      </div>
    </div>
  );
};

export default ClarificationForm;