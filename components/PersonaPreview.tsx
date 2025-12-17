import React from 'react';
import { PersonaProfile, GroundingSource } from '../types';

interface PersonaPreviewProps {
  profile: PersonaProfile;
  sources: GroundingSource[];
  onConfirmProfile: () => void;
  onBack: () => void;
}

const ScoreBar: React.FC<{ label: string; score: number }> = ({ label, score }) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs font-semibold text-stone-600 mb-1">
      <span>{label}</span>
      <span>{score}/5</span>
    </div>
    <div className="w-full bg-stone-200 rounded-full h-2">
      <div 
        className="bg-emerald-600 h-2 rounded-full transition-all duration-1000" 
        style={{ width: `${(score / 5) * 100}%` }}
      ></div>
    </div>
  </div>
);

const PersonaPreview: React.FC<PersonaPreviewProps> = ({ profile, sources, onConfirmProfile, onBack }) => {
  return (
    <div className="max-w-5xl mx-auto h-[85vh] flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="bg-emerald-800 p-6 text-white shrink-0 flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold">目标画像已生成</h2>
           <p className="text-emerald-100 text-sm">基于全网实时搜索数据构建</p>
        </div>
        <button 
          onClick={onBack}
          className="text-sm bg-emerald-900 hover:bg-emerald-950 px-3 py-1 rounded transition-colors"
        >
          重置
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Left: Visuals & Scores */}
        <div className="w-full md:w-1/3 bg-stone-50 p-6 border-r border-stone-100 overflow-y-auto">
          {/* Pixel Art Image */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-2 mb-6 flex justify-center items-center aspect-square overflow-hidden">
             {profile.imageUrl ? (
               <img 
                 src={`data:image/png;base64,${profile.imageUrl}`} 
                 alt={profile.name} 
                 className="w-full h-full object-contain rendering-pixelated"
               />
             ) : (
               <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400 text-sm">
                 无画像图片
               </div>
             )}
          </div>

          {/* Scores */}
          <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4 mb-6">
            <h3 className="text-sm font-bold text-stone-700 mb-3 border-b border-stone-100 pb-2">数据完成度评分</h3>
            {profile.scores && (
              <>
                <ScoreBar label="人口统计学" score={profile.scores.demographics} />
                <ScoreBar label="心理特征" score={profile.scores.psychographics} />
                <ScoreBar label="行为特征" score={profile.scores.behaviors} />
                <ScoreBar label="需求与痛点" score={profile.scores.needs} />
                <p className="text-[10px] text-stone-400 mt-2 text-center">* 数据经由网络公开资料补充，基础分为3分</p>
              </>
            )}
          </div>

          {/* Sources */}
           {sources.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
              <h4 className="text-xs font-bold text-stone-600 mb-2">主要数据来源:</h4>
              <ul className="list-disc list-inside text-[10px] text-stone-500 space-y-1">
                {sources.slice(0, 5).map((source, idx) => (
                  <li key={idx}>
                    <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline truncate inline-block max-w-[180px] align-bottom">
                      {source.title || source.uri}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right: Markdown Content */}
        <div className="w-full md:w-2/3 p-8 overflow-y-auto bg-white">
           <div className="prose prose-stone max-w-none text-stone-800 whitespace-pre-wrap font-medium leading-relaxed prose-headings:text-emerald-800 prose-headings:font-bold prose-h1:text-3xl prose-h2:text-xl prose-h2:border-b prose-h2:pb-2 prose-h2:mt-6">
            {profile.rawMarkdown}
          </div>
        </div>
      </div>

      {/* Footer / Action */}
      <div className="p-6 bg-white border-t border-stone-200 shrink-0 flex justify-end">
        <button
          onClick={onConfirmProfile}
          className="bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 px-8 rounded-lg shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <span>下一步：设计访谈提纲</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PersonaPreview;