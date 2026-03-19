import { useState, useMemo } from 'react';
import { Send, User, Bot, Sparkles, MessageSquareQuote, History, Copy, Download, Heart, RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';
import { Persona } from '../types';
import { generateAssistantReply, generatePersonaContent } from '../utils/personaEngine';
import { generateDualImage } from '../services/imageService';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image';
  imageUrl?: string;
  isGenerating?: boolean;
  error?: string;
};

interface AssistantViewProps {
  persona: Persona;
}

export default function AssistantView({ persona }: AssistantViewProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi there! I'm your AI Content Assistant. I'm currently tuned to ${persona.name}'s persona (${persona.tone}). How can I help you grow today?`
    }
  ]);
  const [input, setInput] = useState('');
  const [activeSegment, setActiveSegment] = useState<'chat' | 'replies'>('chat');
  const [replyInput, setReplyInput] = useState('');
  const [generatedReplies, setGeneratedReplies] = useState<string[]>([]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const newUserMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, newUserMessage]);
    const currentInput = input;
    setInput('');

    const isImageRequest = currentInput.toLowerCase().includes('generate') || 
                          currentInput.toLowerCase().includes('image') || 
                          currentInput.toLowerCase().includes('make a picture');
    
    if (isImageRequest) {
      const pendingMessageId = (Date.now() + 1).toString();
      const pendingReply: Message = { 
        id: pendingMessageId, 
        role: 'assistant', 
        content: 'Generating image via OpenAI...',
        isGenerating: true 
      };
      setMessages(prev => [...prev, pendingReply]);

      try {
        const result = await generateDualImage({
          persona,
          isChatContext: true,
          chatPrompt: currentInput
        });

        const imageUrl = result.gemini?.imageUrl || result.openai?.imageUrl;

        setMessages(prev => prev.map(m => m.id === pendingMessageId ? {
          ...m,
          content: `I've generated a new visual based on your request.`,
          type: 'image',
          imageUrl: imageUrl ?? undefined,
          isGenerating: false
        } : m));

      } catch (error: any) {
        setMessages(prev => prev.map(m => m.id === pendingMessageId ? {
          ...m,
          content: `Generation failed: ${error.message}`,
          isGenerating: false,
          error: error.message
        } : m));
      }
    } else {
      setTimeout(() => {
        const reply = generateAssistantReply(persona, currentInput);
        const assistantReply: Message = { 
          id: (Date.now() + 1).toString(), 
          role: 'assistant', 
          content: reply
        };
        setMessages(prev => [...prev, assistantReply]);
      }, 1200);
    }
  };

  const handleGenerateReplies = () => {
    if (!replyInput.trim()) return;
    const mockPost = { day: 0, type: 'Comment', hook: replyInput, angle: '', cta: '' };
    const r1 = generatePersonaContent(persona, mockPost, persona.platform, 'Short Caption');
    const r2 = generatePersonaContent(persona, mockPost, persona.platform, 'Video Script');
    setGeneratedReplies([r1, r2]);
  };

  const STARTER_PROMPTS = useMemo(() => [
    `Give me 5 post ideas for ${persona.name}`,
    `Rewrite this to sound more ${persona.tone.split(',')[0]}`,
    `Generate ${persona.niche} engagement hooks`,
    `Plan a content series for ${persona.platform}`
  ], [persona]);

  return (
    <div className="h-full flex flex-col">
      <header className="p-6 pt-10 border-b border-white/5 bg-[#0A0A0A] sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AI Assistant</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-xs text-indigo-400 font-medium">{persona.name} (AI Mode)</span>
            </div>
          </div>
          <button className="bg-white/5 p-2.5 rounded-2xl hover:bg-white/10 transition-colors">
             <History size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Segmented Control */}
        <div className="flex bg-[#1A1A1A] p-1 rounded-2xl">
          <button 
            onClick={() => setActiveSegment('chat')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
              activeSegment === 'chat' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500"
            )}
          >
            Chat
          </button>
          <button 
            onClick={() => setActiveSegment('replies')}
            className={cn(
              "flex-1 py-2 text-xs font-bold rounded-xl transition-all",
              activeSegment === 'replies' ? "bg-indigo-600 text-white shadow-lg" : "text-gray-500"
            )}
          >
            Replies
          </button>
        </div>
      </header>

      {activeSegment === 'chat' ? (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.map((m) => (
            <div key={m.id} className={cn(
              "flex gap-3",
              m.role === 'user' ? "flex-row-reverse" : "flex-row"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                m.role === 'assistant' ? "bg-indigo-600/20 text-indigo-400" : "bg-white/10 text-gray-400"
              )}>
                {m.role === 'assistant' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className={cn(
                "p-4 rounded-3xl max-w-[80%] text-sm leading-relaxed overflow-hidden",
                m.role === 'assistant' ? (m.error ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-[#1A1A1A] text-gray-200") : "bg-indigo-600 text-white"
              )}>
                {m.isGenerating ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                    <span>{m.content}</span>
                  </div>
                ) : (
                  m.content
                )}
                
                {m.type === 'image' && m.imageUrl && (
                  <div className="mt-4 rounded-2xl overflow-hidden border border-white/5 relative group/img">
                    <img src={m.imageUrl} alt="Generated" className="w-full aspect-square object-cover transition-opacity duration-300" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity backdrop-blur-sm">
                      <div className="flex gap-2">
                        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                          <Download size={18} />
                        </button>
                        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                          <Heart size={18} />
                        </button>
                        <button className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors">
                          <RefreshCw size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {messages.length === 1 && (
            <div className="grid grid-cols-1 gap-2 mt-8">
              <p className="text-[10px] uppercase font-bold text-gray-600 mb-1 ml-1">Quick Actions</p>
              {STARTER_PROMPTS.map((prompt) => (
                <button 
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  className="bg-[#1A1A1A] border border-white/5 text-left p-4 rounded-2xl text-xs text-gray-400 hover:border-indigo-500/30 hover:text-indigo-400 transition-all flex items-center justify-between group"
                >
                  {prompt}
                  <Sparkles size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 p-6 overflow-y-auto space-y-8">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Paste Comment / DM</label>
            <textarea 
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder="Ex: 'You are so pretty! Where did you get that jacket?'"
              className="w-full bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 text-sm min-h-[100px] focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          
          <button 
            onClick={handleGenerateReplies}
            className="w-full bg-indigo-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
          >
             <MessageSquareQuote size={18} />
             Generate Replies
          </button>

          {generatedReplies.length > 0 && (
            <div className="space-y-4">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block mb-2">Suggestions</label>
              {generatedReplies.map((reply, idx) => (
                <div key={idx} className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 relative">
                  <button 
                    onClick={() => navigator.clipboard.writeText(reply)}
                    className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors"
                  >
                    <Copy size={16} />
                  </button>
                  <p className="text-sm text-gray-300 leading-relaxed pr-8 whitespace-pre-wrap">{reply}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Input area for Chat */}
      {activeSegment === 'chat' && (
        <div className="p-4 bg-[#0A0A0A] border-t border-white/5">
          <div className="relative flex items-center gap-2 max-w-2xl mx-auto bg-[#1A1A1A] p-2 rounded-2xl border border-white/10 focus-within:border-indigo-500/50 transition-colors">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Message your assistant..." 
              className="flex-1 bg-transparent border-none outline-none text-sm px-2 py-1.5"
            />
            <button 
              onClick={sendMessage}
              className="bg-indigo-600 p-2 rounded-xl hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
              disabled={!input.trim()}
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
