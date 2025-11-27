import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, ShoppingBag, ExternalLink, Loader2 } from 'lucide-react';
import { Message, Sender } from '../types';
import ReactMarkdown from 'react-markdown'; // Assuming standard availability or handle text simply

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (text: string, mode: 'chat' | 'refine') => void;
  isTyping: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isTyping }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (mode: 'chat' | 'refine') => {
    if (!input.trim()) return;
    onSendMessage(input, mode);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend('chat'); // Default to chat on Enter
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t border-slate-700 md:border-l md:border-t-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="text-indigo-400" size={18} />
          Design Assistant
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Ask questions or type instructions to edit the image.
        </p>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 mt-10">
            <p>Try saying:</p>
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              <span className="bg-slate-800 px-3 py-1 rounded-full text-xs">"Make the walls sage green"</span>
              <span className="bg-slate-800 px-3 py-1 rounded-full text-xs">"Find a rug like this"</span>
              <span className="bg-slate-800 px-3 py-1 rounded-full text-xs">"Add a modern lamp"</span>
            </div>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === Sender.User ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.sender === Sender.User
                  ? 'bg-indigo-600 text-white rounded-br-none'
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
              }`}
            >
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.text}
              </div>
              
              {/* Grounding Links (Shopping) */}
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-600/50">
                  <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                    <ShoppingBag size={12} /> Sources & Shopping
                  </p>
                  <div className="flex flex-col gap-1">
                    {msg.groundingUrls.slice(0, 3).map((url, idx) => (
                      <a 
                        key={idx} 
                        href={url.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-300 hover:text-indigo-200 hover:underline flex items-center gap-1 truncate"
                      >
                         <ExternalLink size={10} /> {url.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
           <div className="flex justify-start">
             <div className="bg-slate-800 rounded-2xl rounded-bl-none px-4 py-3 border border-slate-700 flex items-center gap-2">
                <Loader2 className="animate-spin text-slate-400" size={16} />
                <span className="text-xs text-slate-400">Thinking...</span>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question or describe a change..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 resize-none h-20 mb-3"
        />
        <div className="flex justify-between items-center gap-2">
           <div className="text-xs text-slate-500">
              Gemini 3 Pro & 2.5 Flash
           </div>
           <div className="flex gap-2">
             <button
                onClick={() => handleSend('refine')}
                disabled={!input.trim() || isTyping}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Edit the image visually"
             >
                <Sparkles size={14} />
                Refine Look
             </button>
             <button
                onClick={() => handleSend('chat')}
                disabled={!input.trim() || isTyping}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-indigo-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Ask question"
             >
                <MessageSquare size={14} />
                Ask
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};
