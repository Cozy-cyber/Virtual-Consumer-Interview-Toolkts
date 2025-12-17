import React, { useState } from 'react';

interface GuideReviewProps {
  initialQuestions: string[];
  onConfirm: (finalQuestions: string[]) => void;
}

const GuideReview: React.FC<GuideReviewProps> = ({ initialQuestions, onConfirm }) => {
  const [questions, setQuestions] = useState<string[]>(initialQuestions);

  const handleEdit = (idx: number, newVal: string) => {
    const next = [...questions];
    next[idx] = newVal;
    setQuestions(next);
  };

  const handleDelete = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    setQuestions([...questions, ""]);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-stone-100 animate-fade-in-up flex flex-col h-[80vh]">
      <div className="shrink-0 mb-4">
        <h2 className="text-2xl font-bold text-stone-800">确认访谈提纲</h2>
        <p className="text-stone-500">
          您可以修改、添加或删除问题。如果是 AI 自动访谈，将参考此列表进行提问。
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-3">
        {questions.map((q, idx) => (
          <div key={idx} className="flex gap-2 items-start group">
            <span className="text-stone-400 font-mono mt-3 text-sm">{idx + 1}.</span>
            <textarea
              value={q}
              onChange={(e) => handleEdit(idx, e.target.value)}
              className="flex-1 px-3 py-2 rounded border border-stone-200 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 text-stone-900 text-sm resize-none"
              rows={2}
            />
            <button 
              onClick={() => handleDelete(idx)}
              className="mt-2 text-stone-300 hover:text-red-500 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ))}
        <button 
          onClick={handleAdd}
          className="w-full py-2 border-2 border-dashed border-stone-200 rounded-lg text-stone-400 hover:border-emerald-300 hover:text-emerald-700 text-sm font-semibold transition-colors"
        >
          + 添加问题
        </button>
      </div>

      <div className="shrink-0 pt-6 mt-4 border-t border-stone-100 flex gap-4">
         <button
          onClick={() => onConfirm(questions.filter(q => q.trim().length > 0))}
          className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 rounded-lg shadow-lg"
        >
          确认提纲
        </button>
      </div>
    </div>
  );
};

export default GuideReview;