import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '@google/genai';
import { ChatMessage, PersonaProfile, InterviewMode } from '../types';
import { getAIInterviewerNextQuestion } from '../services/geminiService';

interface ChatInterfaceProps {
  chatSession: Chat;
  profile: PersonaProfile;
  mode: InterviewMode;
  guide: string[]; // Discussion guide
  onEndSession: (messages: ChatMessage[]) => void;
  onSwitchToManual: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ 
  chatSession, 
  profile, 
  mode, 
  guide, 
  onEndSession, 
  onSwitchToManual 
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [aiModeratorStatus, setAiModeratorStatus] = useState<'idle' | 'thinking' | 'done'>('idle');
  const [retryTrigger, setRetryTrigger] = useState(0); // Trigger to retry logic if failed
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasStartedRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, aiModeratorStatus]);

  // Initial Greeting
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    const startConversation = async () => {
        setIsTyping(true);
        try {
            const response = await chatSession.sendMessage({ message: "请做一个简短的自我介绍，像我们刚见面一样。" });
            const text = response.text || "你好。";
            setMessages([{ role: 'model', text, timestamp: new Date() }]);
        } catch (err) {
            console.error(err);
        } finally {
            setIsTyping(false);
        }
    };
    startConversation();
  }, [chatSession]);

  // AI Moderator Logic Loop
  useEffect(() => {
    const runAiModeratorLoop = async () => {
      if (mode !== InterviewMode.AUTO) return;
      if (messages.length === 0) return;
      if (isTyping) return; // Waiting for Persona to answer
      
      const lastMsg = messages[messages.length - 1];
      
      // If the last message was from the Model (Persona), it's the AI Moderator's turn
      if (lastMsg.role === 'model') {
        setAiModeratorStatus('thinking');
        
        // Extended artificial delay for pacing and to prevent rate limits (from 1500ms to 3000ms)
        await new Promise(r => setTimeout(r, 3000));

        try {
          const nextQuestion = await getAIInterviewerNextQuestion(messages, guide, profile);
          
          if (nextQuestion) {
            // AI Moderator asks a question
            setMessages(prev => [...prev, { role: 'user', text: nextQuestion, timestamp: new Date(), isAiInterviewer: true }]);
            setAiModeratorStatus('idle');
            
            // Trigger Persona response immediately
            setIsTyping(true);
            const response = await chatSession.sendMessage({ message: nextQuestion });
            const answer = response.text || "...";
            setMessages(prev => [...prev, { role: 'model', text: answer, timestamp: new Date() }]);
            setIsTyping(false);
          } else {
            // Null means AI thinks interview is done
            setAiModeratorStatus('done');
            onSwitchToManual(); // Hand back control to user
          }
        } catch (e: any) {
          console.error("AI Moderator Error", e);
          
          // Logic to recover from rate limits that passed through service layer
          if (e?.status === 429 || e?.message?.includes('429')) {
             console.log("Component level backoff triggered...");
             await new Promise(r => setTimeout(r, 5000));
             setRetryTrigger(prev => prev + 1); // Try loop again
          } else {
             setAiModeratorStatus('idle');
          }
        }
      }
    };

    runAiModeratorLoop();
  }, [messages, mode, guide, profile, chatSession, onSwitchToManual, isTyping, retryTrigger]);


  const handleManualSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isTyping) return;

    // If we were in auto mode (rare race condition), ensure we are manual
    if (mode === InterviewMode.AUTO) onSwitchToManual();

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg, timestamp: new Date(), isAiInterviewer: false }]);
    setIsTyping(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg });
      const text = result.text || "...";
      setMessages(prev => [...prev, { role: 'model', text, timestamp: new Date() }]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, { role: 'model', text: "(网络波动，请重试)", timestamp: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  const Avatar = ({ name, imageUrl, isAi }: { name?: string, imageUrl?: string, isAi?: boolean }) => {
    if (isAi) {
      return (
        <div className="w-8 h-8 rounded-full bg-stone-800 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold border border-stone-600 shadow-sm" title="AI Moderator">
          AI
        </div>
      );
    }
    
    if (imageUrl) {
        return (
            <div className="w-9 h-9 rounded-full bg-stone-100 flex-shrink-0 border-2 border-emerald-200 overflow-hidden shadow-sm">
                <img src={`data:image/png;base64,${imageUrl}`} alt={name} className="w-full h-full object-cover rendering-pixelated" />
            </div>
        );
    }

    return (
        <div className="w-9 h-9 rounded-full bg-emerald-100 flex-shrink-0 flex items-center justify-center text-emerald-800 text-xs font-bold border border-emerald-200 shadow-sm">
            {name ? name.charAt(0) : '?'}
        </div>
    );
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden relative">
      
      {/* Header */}
      <div className={`border-b p-4 flex items-center justify-between shrink-0 z-10 transition-colors duration-500
        ${mode === InterviewMode.AUTO ? 'bg-stone-900 border-stone-800' : 'bg-white border-stone-200'}`}>
        
        <div className="flex items-center gap-3">
          <Avatar name={profile.name} imageUrl={profile.imageUrl} />
          <div>
            <h3 className={`font-bold ${mode === InterviewMode.AUTO ? 'text-white' : 'text-stone-800'}`}>
              {profile.name}
            </h3>
            <div className="flex items-center gap-1.5">
              {mode === InterviewMode.AUTO ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
                  <span className="text-xs text-teal-200 font-medium">AI 自动访谈进行中... (观察模式)</span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs text-stone-500 font-medium">在线 • 您的提问回合</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
           {mode === InterviewMode.AUTO && (
             <button 
               onClick={onSwitchToManual}
               className="bg-stone-700 hover:bg-stone-600 text-white px-3 py-1.5 rounded text-xs font-bold border border-stone-600"
             >
               暂停 / 接管
             </button>
           )}
           <button 
            onClick={() => onEndSession(messages)}
            className="bg-red-50 text-red-700 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            结束
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-stone-50 space-y-6">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isAiMod = msg.isAiInterviewer;
          
          return (
            <div 
              key={idx} 
              className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                 {/* Avatar */}
                 {!isUser && <Avatar name={profile.name} imageUrl={profile.imageUrl} />}
                 {isUser && isAiMod && <Avatar isAi={true} />}
                 
                 {/* Bubble */}
                 <div 
                   className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap relative
                      ${isUser 
                        ? (isAiMod ? 'bg-stone-800 text-stone-100 rounded-br-none' : 'bg-emerald-800 text-white rounded-br-none')
                        : 'bg-white text-stone-800 border border-stone-200 rounded-bl-none'
                      }`}
                 >
                   {/* Label for AI Moderator messages */}
                   {isUser && isAiMod && (
                     <div className="absolute -top-5 right-0 text-[10px] text-stone-400 font-bold tracking-wider uppercase">AI 主持人</div>
                   )}
                   {msg.text}
                 </div>
              </div>
            </div>
          );
        })}

        {/* Typing Indicators */}
        {(isTyping || aiModeratorStatus === 'thinking') && (
          <div className={`flex w-full ${aiModeratorStatus === 'thinking' ? 'justify-end' : 'justify-start'}`}>
             <div className={`flex max-w-[80%] ${aiModeratorStatus === 'thinking' ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                
                {/* Persona Avatar if they are typing */}
                {isTyping && <Avatar name={profile.name} imageUrl={profile.imageUrl} />}
                 {/* AI Mod Avatar if thinking */}
                {aiModeratorStatus === 'thinking' && <Avatar isAi={true} />}

                 <div className={`${aiModeratorStatus === 'thinking' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'} px-4 py-3 rounded-2xl shadow-sm flex items-center gap-1`}>
                    <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${aiModeratorStatus === 'thinking' ? 'bg-stone-400' : 'bg-stone-400'}`} style={{ animationDelay: '0ms' }}></span>
                    <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${aiModeratorStatus === 'thinking' ? 'bg-stone-400' : 'bg-stone-400'}`} style={{ animationDelay: '150ms' }}></span>
                    <span className={`w-1.5 h-1.5 rounded-full animate-bounce ${aiModeratorStatus === 'thinking' ? 'bg-stone-400' : 'bg-stone-400'}`} style={{ animationDelay: '300ms' }}></span>
                 </div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (Only active in Manual Mode) */}
      <div className={`p-4 border-t transition-all duration-300 ${mode === InterviewMode.AUTO ? 'bg-stone-100' : 'bg-white'}`}>
        {mode === InterviewMode.AUTO ? (
           <div className="flex items-center justify-between text-stone-500 text-sm px-2">
             <span className="flex items-center gap-2">
               <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               AI 正在进行访谈...
             </span>
             <button onClick={onSwitchToManual} className="text-emerald-700 font-bold hover:underline">
               切换为手动提问
             </button>
           </div>
        ) : (
          <form onSubmit={handleManualSend} className="flex items-end gap-2 max-w-4xl mx-auto relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`轮到您了，向 ${profile.name.split(' ')[0]} 提问...`}
              className="flex-1 bg-stone-100 text-stone-900 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all outline-none"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="bg-emerald-800 hover:bg-emerald-900 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </form>
        )}
      </div>

      {/* Mode Switch Notification */}
      {aiModeratorStatus === 'done' && mode === InterviewMode.MANUAL && (
         <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-stone-800 text-white text-sm py-2 px-4 rounded-full shadow-lg animate-bounce">
            AI 访谈已结束，现在由您接手提问！
         </div>
      )}
    </div>
  );
};

export default ChatInterface;