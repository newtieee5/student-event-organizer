import { useState } from 'react';
import { X, Send, Bot, User as UserIcon, Loader } from 'lucide-react';
import { User, StudentEvent } from '../types';
import { initGemini, askAI } from '../services/gemini';

interface AIChatbotProps {
  user: User;
  events: StudentEvent[];
}

export function AIChatbot({ user, events }: AIChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Ideally, this key should be in an environment variable or fetched from a secure backend.
  const [apiKey, setApiKey] = useState('AIzaSyCcJBVFj9lFB-_SkfHrVyqGNxZu2VQ6GMU');
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([
    { role: 'ai', text: `Hi ${user.name}! I'm your AI assistant. I can help with your schedule, budget, or study tips. Ask me anything!` },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!apiKey) {
      alert("Please enter a Google Gemini API Key first.");
      return;
    }

    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsLoading(true);

    // Initialize Gemini
    initGemini(apiKey);

    // Context for AI
    const context = `
      You are a helpful student assistant AI.
      The user is ${user.name} (${user.role}).
      Today is ${new Date().toDateString()}.
      Current Events: ${JSON.stringify(events.map(e => ({ title: e.title, date: e.date, time: e.time, budget: e.totalBudget, spent: e.totalSpent })))}
      
      User Question: "${userMessage}"
      
      Provide a short, helpful answer. If asked about schedule/budget, use the provided context.
    `;

    try {
      const response = await askAI(context);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: "Sorry, I encountered an error. Please check your API key." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 flex items-center gap-2"
        >
          <Bot size={24} />
          <span className="font-bold">Ask AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
             <div className="flex items-center gap-2">
               <Bot size={20} />
               <h3 className="font-bold">Student AI Assistant</h3>
             </div>
             <button onClick={() => setIsOpen(false)} className="hover:bg-blue-700 p-1 rounded"><X size={20} /></button>
          </div>

          {/* API Key Input (if missing) */}
          {!apiKey && (
            <div className="p-4 bg-yellow-50 text-sm text-yellow-800 border-b border-yellow-100">
               <p className="mb-2">To activate AI features, please enter your free Google Gemini API Key:</p>
               <input 
                 type="password" 
                 placeholder="Paste API Key here..." 
                 className="w-full p-2 border border-gray-300 rounded mb-2"
                 onChange={(e) => setApiKey(e.target.value)}
               />
               <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">Get a free key</a>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
             {messages.map((msg, idx) => (
               <div key={idx} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'ai' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                    {msg.role === 'ai' ? <Bot size={16} /> : <UserIcon size={16} />}
                  </div>
                  <div className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.role === 'ai' ? 'bg-white border border-gray-200 text-gray-800' : 'bg-blue-600 text-white'}`}>
                     {msg.text}
                  </div>
               </div>
             ))}
             {isLoading && (
               <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Loader className="animate-spin text-blue-600" size={16} />
                  </div>
                  <div className="bg-white border border-gray-200 p-3 rounded-lg text-sm text-gray-500 italic">Thinking...</div>
               </div>
             )}
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t border-gray-200">
             <div className="flex gap-2">
               <input 
                 type="text" 
                 className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                 placeholder="Type a message..."
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                 disabled={!apiKey || isLoading}
               />
               <button 
                 onClick={handleSend}
                 disabled={!apiKey || isLoading}
                 className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
               >
                 <Send size={18} />
               </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
}