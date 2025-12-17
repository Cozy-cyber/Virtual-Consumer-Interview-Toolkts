import React, { useState } from 'react';

interface GuideInputFormProps {
  onGenerate: (objectives: string, questions: string) => void;
  isLoading: boolean;
}

const GuideInputForm: React.FC<GuideInputFormProps> = ({ onGenerate, isLoading }) => {
  const [objectives, setObjectives] = useState('');
  const [questions, setQuestions] = useState('');

  const defaultDimensions = [
    { icon: "🏷️", title: "品牌/产品现状", desc: "使用时长、频率、环境" },
    { icon: "🔄", title: "情境与习惯", desc: "日常路径、干扰与障碍" },
    { icon: "⭐", title: "功能评价", desc: "评分、技术问题、性能瓶颈" },
    { icon: "⚠️", title: "痛点挑战", desc: "常见问题、具体困难" },
    { icon: "💡", title: "改进期望", desc: "新增功能需求、未来建议" },
    { icon: "❤️", title: "情感满意度", desc: "总体体验、NPS推荐意愿" },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-xl border border-stone-100 animate-fade-in-up">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-stone-800">设计全维度访谈提纲</h2>
        <p className="text-stone-500 mt-2">
          我们将自动为您构建包含以下六大核心维度的深度访谈逻辑。您可以补充具体的额外目标。
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left: Logic Framework Display */}
        <div className="w-full md:w-1/3 bg-stone-50 p-5 rounded-xl border border-stone-100">
           <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider mb-4 border-b border-stone-200 pb-2">
             默认研究框架
           </h3>
           <div className="space-y-4">
             {defaultDimensions.map((dim, idx) => (
               <div key={idx} className="flex gap-3">
                 <div className="shrink-0 text-xl">{dim.icon}</div>
                 <div>
                   <div className="text-sm font-bold text-stone-800">{dim.title}</div>
                   <div className="text-xs text-stone-500">{dim.desc}</div>
                 </div>
               </div>
             ))}
           </div>
        </div>

        {/* Right: User Inputs */}
        <div className="w-full md:w-2/3 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              额外研究重点 (可选)
            </label>
            <textarea
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              placeholder="除了左侧的标准维度外，您还特别想了解什么？例如：对价格的敏感度、对竞品的看法..."
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-emerald-600 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-stone-700 mb-2">
              您必问的问题 (可选)
            </label>
            <textarea
              value={questions}
              onChange={(e) => setQuestions(e.target.value)}
              placeholder="例如：如果这个产品消失了，你会怎么做？"
              rows={2}
              className="w-full px-4 py-3 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-emerald-600 transition-colors"
            />
          </div>

          <button
            onClick={() => onGenerate(objectives, questions)}
            disabled={isLoading}
            className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg shadow-lg transition-all
              ${isLoading
                ? 'bg-stone-300 cursor-not-allowed'
                : 'bg-emerald-800 hover:bg-emerald-900 transform hover:-translate-y-0.5'
              }`}
          >
            {isLoading ? '正在构建全维度提纲...' : '生成完整访谈提纲'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideInputForm;