import React, { useState, useRef } from 'react';
import { ResearchConfig, ReferenceMaterial } from '../types';

interface SetupFormProps {
  onSubmit: (config: ResearchConfig) => void;
  isLoading: boolean;
  loadingText?: string;
}

const SetupForm: React.FC<SetupFormProps> = ({ onSubmit, isLoading, loadingText }) => {
  const [industry, setIndustry] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [materials, setMaterials] = useState<ReferenceMaterial[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (industry.trim() && targetAudience.trim()) {
      onSubmit({ industry, targetAudience, referenceMaterials: materials });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = (event.target?.result as string).split(',')[1];
      const newFile: ReferenceMaterial = {
        id: Date.now().toString(),
        type: 'file',
        name: file.name,
        mimeType: file.type,
        content: base64String
      };
      setMaterials([...materials, newFile]);
    };
    reader.readAsDataURL(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddLink = () => {
    const url = prompt("请输入 URL 或粘贴文本内容:");
    if (url) {
        const newMat: ReferenceMaterial = {
            id: Date.now().toString(),
            type: 'text',
            name: url.startsWith('http') ? '链接资源' : '文本片段',
            content: url
        };
        setMaterials([...materials, newMat]);
    }
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-white p-8 rounded-2xl shadow-xl border border-stone-100 animate-fade-in-up">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-stone-800 mb-2">虚拟消费者访谈</h1>
        <p className="text-stone-500">
          定义您的目标，或上传已有资料，我们将基于数据构建 AI 消费者画像。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="industry" className="block text-sm font-semibold text-stone-700 mb-2">
            行业 / 产品类别
          </label>
          <input
            id="industry"
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="例如：电动汽车、精品咖啡"
            className="w-full px-4 py-3 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors disabled:bg-stone-50 disabled:text-stone-400"
            disabled={isLoading}
            required
          />
        </div>

        <div>
          <label htmlFor="audience" className="block text-sm font-semibold text-stone-700 mb-2">
            目标受众描述
          </label>
          <textarea
            id="audience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="例如：生活在一线城市、关注可持续发展的预算敏感型大学生。"
            rows={3}
            className="w-full px-4 py-3 rounded-lg border border-stone-300 text-stone-900 placeholder-stone-400 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors disabled:bg-stone-50 disabled:text-stone-400 resize-none"
            disabled={isLoading}
            required
          />
        </div>

        {/* Reference Data Section */}
        <div className="pt-4 border-t border-stone-100">
            <label className="block text-sm font-semibold text-stone-700 mb-3">
                参考资料 / 知识库 (可选)
            </label>
            <div className="flex gap-3 mb-4">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="flex-1 py-2 px-4 border border-stone-300 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 hover:border-emerald-300 transition-colors flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    上传文件 (PDF/图片)
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,image/png,image/jpeg,image/webp" 
                    onChange={handleFileUpload}
                />
                
                <button
                    type="button"
                    onClick={handleAddLink}
                    disabled={isLoading}
                    className="flex-1 py-2 px-4 border border-stone-300 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-50 hover:border-emerald-300 transition-colors flex items-center justify-center gap-2"
                >
                     <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                    </svg>
                    添加链接/文本
                </button>
            </div>

            {/* File List */}
            {materials.length > 0 && (
                <div className="space-y-2 mb-4">
                    {materials.map((m) => (
                        <div key={m.id} className="flex items-center justify-between bg-stone-50 px-3 py-2 rounded text-xs text-stone-600 border border-stone-200">
                            <div className="flex items-center gap-2 truncate max-w-[80%]">
                                <span className="font-bold uppercase text-[10px] bg-stone-200 px-1 rounded text-stone-500">
                                    {m.type === 'file' ? m.mimeType?.split('/')[1] || 'FILE' : 'TEXT'}
                                </span>
                                <span className="truncate">{m.name.length > 30 ? m.name.substring(0,30) + '...' : m.name}</span>
                                {m.type === 'text' && <span className="text-stone-400 italic mx-1">- {m.content.substring(0, 15)}...</span>}
                            </div>
                            <button onClick={() => removeMaterial(m.id)} className="text-stone-400 hover:text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        <button
          type="submit"
          disabled={isLoading || !industry || !targetAudience}
          className={`w-full py-3.5 px-6 rounded-lg text-white font-semibold text-lg shadow-lg transition-all transform hover:-translate-y-0.5
            ${isLoading 
              ? 'bg-stone-400 cursor-wait' 
              : 'bg-emerald-800 hover:bg-emerald-900 shadow-emerald-200'
            }`}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {loadingText || '处理中...'}
            </span>
          ) : (
            '生成画像'
          )}
        </button>
      </form>
    </div>
  );
};

export default SetupForm;