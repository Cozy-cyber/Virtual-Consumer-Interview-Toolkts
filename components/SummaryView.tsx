import React, { useRef } from 'react';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { InterviewSummary, PersonaProfile, ChatMessage, ResearchConfig } from '../types';

interface SummaryViewProps {
  summary: InterviewSummary;
  profile: PersonaProfile;
  config: ResearchConfig;
  messages: ChatMessage[];
  onReset: () => void;
}

const SummaryView: React.FC<SummaryViewProps> = ({ summary, profile, config, messages, onReset }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    // Show the hidden div temporarily for capture (it's absolute positioned off-screen usually)
    // but html2canvas needs it rendered.
    // We assume it's mounted in the DOM.
    
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2, // Higher resolution
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Subsequent pages if content overflows
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${profile.name}_访谈报告.pdf`);
    } catch (err) {
      console.error("PDF Generation failed", err);
      alert("生成 PDF 失败，请重试或截图保存。");
    }
  };

  const ScoreBadge = ({ score, label }: { score: number, label: string }) => (
    <div className="flex flex-col items-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg mb-1 shadow-md
        ${score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-yellow-500' : 'bg-red-400'}`}>
        {score}
      </div>
      <span className="text-[10px] text-stone-500 font-medium">{label}</span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-8 text-white flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-bold mb-2">访谈洞察报告</h2>
           <p className="opacity-90">受访者: {profile.name} | 行业: {config.industry}</p>
        </div>
        {profile.imageUrl && (
            <div className="w-16 h-16 rounded-full border-2 border-white/50 overflow-hidden bg-white/20 backdrop-blur">
                <img src={`data:image/png;base64,${profile.imageUrl}`} className="w-full h-full object-cover rendering-pixelated" />
            </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row">
        
        {/* Left Column: Summary & Visuals */}
        <div className="w-full lg:w-2/3 p-8 space-y-8 bg-stone-50 border-r border-stone-200">
             {/* Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <h3 className="text-emerald-700 font-bold mb-3 flex items-center gap-2">
                💡 关键洞察
                </h3>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{summary.keyInsights}</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <h3 className="text-red-600 font-bold mb-3 flex items-center gap-2">
                🔥 主要痛点
                </h3>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{summary.painPoints}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <h3 className="text-emerald-600 font-bold mb-3 flex items-center gap-2">
                🎯 核心需求
                </h3>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{summary.wantsNeeds}</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-200">
                <h3 className="text-teal-700 font-bold mb-3 flex items-center gap-2">
                ⚖️ 总体评价
                </h3>
                <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-wrap">{summary.verdict}</p>
            </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-stone-200">
            <button
                onClick={handleDownloadPDF}
                className="flex-1 bg-stone-800 hover:bg-stone-900 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                下载 PDF (含逐字稿)
            </button>
            
            <button
                onClick={onReset}
                className="flex-1 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 font-bold py-3 px-6 rounded-lg transition-colors"
            >
                开始新的研究
            </button>
            </div>
        </div>

        {/* Right Column: Persona Details & Scores */}
        <div className="w-full lg:w-1/3 p-6 bg-white">
            <h3 className="text-lg font-bold text-stone-800 mb-4 pb-2 border-b border-stone-100">消费者画像档案</h3>
            
            {/* Visual */}
            <div className="flex gap-4 mb-6">
                <div className="w-24 h-24 shrink-0 bg-stone-100 rounded-lg border border-stone-200 flex items-center justify-center overflow-hidden">
                    {profile.imageUrl ? (
                        <img src={`data:image/png;base64,${profile.imageUrl}`} className="w-full h-full object-cover rendering-pixelated" />
                    ) : (
                        <span className="text-xs text-stone-400">无图</span>
                    )}
                </div>
                {profile.scores && (
                    <div className="flex-1 grid grid-cols-2 gap-2 justify-items-center content-center">
                        <ScoreBadge score={profile.scores.demographics} label="人口" />
                        <ScoreBadge score={profile.scores.psychographics} label="心理" />
                        <ScoreBadge score={profile.scores.behaviors} label="行为" />
                        <ScoreBadge score={profile.scores.needs} label="需求" />
                    </div>
                )}
            </div>

            {/* Markdown Details Summary */}
            <div className="prose prose-sm prose-stone max-w-none text-xs text-stone-600 bg-stone-50 p-4 rounded-lg border border-stone-100 max-h-[500px] overflow-y-auto">
                 {/* Re-render markdown but smaller/cleaner for sidebar */}
                 <div className="whitespace-pre-wrap leading-relaxed">
                     {profile.rawMarkdown}
                 </div>
            </div>
        </div>
      </div>

      {/* Hidden PDF Generation Container */}
      <div 
        ref={printRef} 
        className="fixed top-0 left-[-9999px] w-[800px] bg-white p-12 text-stone-900"
      >
        <div className="border-b-2 border-emerald-800 pb-4 mb-8">
           <h1 className="text-3xl font-bold text-stone-900 mb-2">消费者访谈洞察报告</h1>
           <div className="text-stone-500 flex justify-between text-sm">
             <span>生成时间: {new Date().toLocaleDateString()}</span>
             <span>PersonaLink AI Research</span>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <span className="block text-xs font-bold text-stone-400 uppercase tracking-wide">行业 / 产品</span>
            <div className="text-lg font-medium">{config.industry}</div>
          </div>
          <div>
             <span className="block text-xs font-bold text-stone-400 uppercase tracking-wide">目标受众</span>
             <div className="text-lg font-medium">{config.targetAudience}</div>
          </div>
          <div>
             <span className="block text-xs font-bold text-stone-400 uppercase tracking-wide">受访者</span>
             <div className="text-lg font-medium">{profile.name}</div>
          </div>
          <div>
            {profile.scores && (
              <div className="flex gap-2 mt-2">
                 <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">人口: {profile.scores.demographics}</span>
                 <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded">需求: {profile.scores.needs}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section 1: Summary */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-emerald-900 bg-emerald-50 p-2 rounded mb-4">1. 总结摘要</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-stone-800 mb-1">关键洞察</h3>
              <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{summary.keyInsights}</p>
            </div>
            <div>
              <h3 className="font-bold text-stone-800 mb-1">痛点</h3>
              <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{summary.painPoints}</p>
            </div>
             <div>
              <h3 className="font-bold text-stone-800 mb-1">需求</h3>
              <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{summary.wantsNeeds}</p>
            </div>
             <div>
              <h3 className="font-bold text-stone-800 mb-1">总体评价</h3>
              <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{summary.verdict}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Transcript */}
        <div>
          <h2 className="text-xl font-bold text-emerald-900 bg-emerald-50 p-2 rounded mb-4">2. 访谈逐字稿</h2>
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className="flex gap-4">
                 <div className="w-20 shrink-0 font-bold text-right text-xs text-stone-500 pt-1">
                    {msg.role === 'user' ? '采访者' : profile.name}
                 </div>
                 <div className={`flex-1 p-3 rounded-lg text-sm leading-relaxed
                   ${msg.role === 'user' ? 'bg-stone-100' : 'bg-white border border-stone-100'}`}>
                    {msg.text}
                 </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default SummaryView;