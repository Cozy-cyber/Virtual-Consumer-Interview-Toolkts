import React, { useState } from 'react';
import { Chat } from '@google/genai';
import { AppStep, PersonaProfile, ResearchConfig, GroundingSource, ClarifyingQuestion, ChatMessage, InterviewSummary, InterviewMode } from './types';
import SetupForm from './components/SetupForm';
import ClarificationForm from './components/ClarificationForm';
import PersonaPreview from './components/PersonaPreview';
import GuideInputForm from './components/GuideInputForm';
import GuideReview from './components/GuideReview';
import ChatInterface from './components/ChatInterface';
import SummaryView from './components/SummaryView';
import { generatePersonaProfile, createInterviewSession, analyzeRequirements, generateInterviewSummary, generateDiscussionGuide } from './services/geminiService';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  const [config, setConfig] = useState<ResearchConfig | null>(null);
  
  // Data State
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarifyingQuestion[]>([]);
  const [persona, setPersona] = useState<PersonaProfile | null>(null);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [discussionGuide, setDiscussionGuide] = useState<string[]>([]);
  
  const [interviewMode, setInterviewMode] = useState<InterviewMode>(InterviewMode.MANUAL);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [summary, setSummary] = useState<InterviewSummary | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);

  // 1. Initial Research Input
  const handleInitialSubmit = async (inputConfig: ResearchConfig) => {
    setConfig(inputConfig);
    setStep(AppStep.RESEARCHING);
    setError(null);

    try {
      const questions = await analyzeRequirements(inputConfig.industry, inputConfig.targetAudience);
      if (questions && questions.length > 0) {
        setClarificationQuestions(questions);
        setStep(AppStep.CLARIFYING);
      } else {
        // Pass materials if any
        await executePersonaGeneration(
          inputConfig.industry, 
          inputConfig.targetAudience, 
          [], 
          inputConfig.referenceMaterials || []
        );
      }
    } catch (err) {
      console.error(err);
      setError("分析需求时出错，请重试。");
      setStep(AppStep.SETUP);
    }
  };

  // 2. Clarification Input
  const handleClarificationSubmit = async (answers: string[]) => {
    if (!config) return;
    setStep(AppStep.RESEARCHING);
    try {
      await executePersonaGeneration(
        config.industry, 
        config.targetAudience, 
        answers,
        config.referenceMaterials || []
      );
    } catch (err) {
      console.error(err);
      setError("生成画像失败，请重试。");
      setStep(AppStep.SETUP);
    }
  };

  const executePersonaGeneration = async (
    industry: string, 
    audience: string, 
    clarifications: string[],
    materials: any[]
  ) => {
    const { profile, sources: fetchedSources } = await generatePersonaProfile(
      industry,
      audience,
      clarifications,
      materials
    );
    setPersona(profile);
    setSources(fetchedSources);
    setStep(AppStep.PREVIEW);
  };

  // 3. Confirm Profile -> Go to Guide Input
  const handleConfirmProfile = () => {
    setStep(AppStep.GUIDE_INPUT);
  };

  // 4. Generate Guide
  const handleGenerateGuide = async (objectives: string, userQuestions: string) => {
    if (!persona || !config) return;
    setIsLoadingGuide(true);
    try {
      const guide = await generateDiscussionGuide(config.industry, persona, objectives, userQuestions);
      setDiscussionGuide(guide);
      setStep(AppStep.GUIDE_REVIEW);
    } catch (e) {
      setError("生成提纲失败");
    } finally {
      setIsLoadingGuide(false);
    }
  };

  // 5. Confirm Guide -> Select Mode
  const handleConfirmGuide = (finalGuide: string[]) => {
    setDiscussionGuide(finalGuide);
    setStep(AppStep.MODE_SELECTION);
  };

  // 6. Start Interview
  const startInterview = (mode: InterviewMode) => {
    if (!persona || !config) return;
    setInterviewMode(mode);
    try {
      const session = createInterviewSession(persona, config.industry);
      setChatSession(session);
      setStep(AppStep.INTERVIEW);
    } catch (err) {
      console.error(err);
      setError("无法初始化访谈会话。");
    }
  };

  // 7. End Interview
  const handleEndSession = async (messages: ChatMessage[]) => {
    if (!persona || !config) return;
    setChatHistory(messages);
    setStep(AppStep.RESEARCHING); // Re-use loading state for summary gen
    
    try {
      const summaryData = await generateInterviewSummary(persona, config.industry, messages);
      setSummary(summaryData);
      setStep(AppStep.SUMMARY);
    } catch (err) {
      console.error(err);
      setError("生成总结报告失败。");
      setStep(AppStep.INTERVIEW); 
    }
  };

  const handleReset = () => {
    setStep(AppStep.SETUP);
    setConfig(null);
    setPersona(null);
    setChatSession(null);
    setSources([]);
    setClarificationQuestions([]);
    setSummary(null);
    setChatHistory([]);
    setDiscussionGuide([]);
    setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      
      {/* Background decoration: Spherical Pattern */}
      <div className="fixed bottom-[-10%] left-1/2 -translate-x-1/2 w-[100vw] h-[100vw] max-w-[1200px] max-h-[1200px] pointer-events-none -z-0 opacity-10">
        <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="w-full h-full text-[#d6d3d1]">
          <defs>
            <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
             <radialGradient id="fadeGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="white" stopOpacity="1" />
                <stop offset="100%" stopColor="white" stopOpacity="0.8" />
            </radialGradient>
            <mask id="sphereMask">
               <circle cx="100" cy="100" r="100" fill="url(#fadeGradient)" />
            </mask>
          </defs>
          
          {/* Main Sphere Body with lines */}
          <circle cx="100" cy="100" r="99" fill="url(#diagonalHatch)" mask="url(#sphereMask)" />
          
          {/* Outline */}
          <circle cx="100" cy="100" r="99" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5" />
        </svg>
      </div>

      <div className="w-full max-w-5xl z-10 relative">
        {error && (
          <div className="mb-6 bg-red-50/90 backdrop-blur border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2 max-w-lg mx-auto shadow-sm">
            {error}
          </div>
        )}

        {/* LOADING STATE */}
        {step === AppStep.RESEARCHING && (
          <div className="w-full max-w-lg mx-auto bg-white/95 backdrop-blur p-12 rounded-2xl shadow-2xl border border-stone-100 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-25"></div>
                <svg className="animate-spin h-12 w-12 text-emerald-700 relative z-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
            <p className="text-xl font-bold text-stone-800">
              {summary ? "整理访谈洞察..." : "AI 正在构建画像..."}
            </p>
            <p className="text-sm text-stone-500 mt-2">
              深度搜索分析中，可能需要一分钟左右
            </p>
          </div>
        )}

        {step === AppStep.SETUP && (
          <SetupForm onSubmit={handleInitialSubmit} isLoading={false} />
        )}

        {step === AppStep.CLARIFYING && (
          <ClarificationForm 
            questions={clarificationQuestions}
            onSubmit={handleClarificationSubmit}
            isLoading={false}
          />
        )}

        {step === AppStep.PREVIEW && persona && (
          <PersonaPreview 
            profile={persona} 
            sources={sources}
            onConfirmProfile={handleConfirmProfile} 
            onBack={handleReset} 
          />
        )}

        {step === AppStep.GUIDE_INPUT && (
          <GuideInputForm 
            onGenerate={handleGenerateGuide}
            isLoading={isLoadingGuide}
          />
        )}

        {step === AppStep.GUIDE_REVIEW && (
          <GuideReview 
            initialQuestions={discussionGuide}
            onConfirm={handleConfirmGuide}
          />
        )}

        {step === AppStep.MODE_SELECTION && persona && (
          <div className="w-full max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
            {/* Manual Card */}
            <div 
              onClick={() => startInterview(InterviewMode.MANUAL)}
              className="bg-white/95 backdrop-blur p-8 rounded-2xl shadow-xl border border-white/20 hover:border-emerald-500 cursor-pointer transition-all hover:-translate-y-1 group"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-800 mb-4 group-hover:bg-emerald-800 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">我亲自提问</h3>
              <p className="text-stone-500">
                由您扮演访谈者，与 AI 消费者进行一对一对话。您可以完全按照提纲，也可以自由发挥。
              </p>
            </div>

            {/* AI Auto Card */}
            <div 
              onClick={() => startInterview(InterviewMode.AUTO)}
              className="bg-white/95 backdrop-blur p-8 rounded-2xl shadow-xl border border-white/20 hover:border-teal-600 cursor-pointer transition-all hover:-translate-y-1 group"
            >
               <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center text-teal-700 mb-4 group-hover:bg-teal-700 group-hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-stone-800 mb-2">AI 代为访谈 (观察模式)</h3>
              <p className="text-stone-500">
                由 AI 专家作为主持人，依据提纲进行访谈。您作为观察者旁听，随时可以暂停并介入提问。
              </p>
            </div>
          </div>
        )}

        {step === AppStep.INTERVIEW && chatSession && persona && (
          <ChatInterface 
            chatSession={chatSession} 
            profile={persona} 
            mode={interviewMode}
            guide={discussionGuide}
            onEndSession={handleEndSession} 
            onSwitchToManual={() => setInterviewMode(InterviewMode.MANUAL)}
          />
        )}

        {step === AppStep.SUMMARY && summary && persona && config && (
          <SummaryView
            summary={summary}
            profile={persona}
            config={config}
            messages={chatHistory}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
};

export default App;