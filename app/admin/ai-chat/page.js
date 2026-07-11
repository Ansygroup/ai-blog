'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Loader2, Sparkles, User, Cpu } from 'lucide-react';

export default function AiChatPage() {
  const [messages, setMessages] = useState([
    { role: 'ai', text: "Hi! I'm your AI assistant. Ask me anything about your blog — stats, recommendations, content ideas, or what to improve." },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/admin/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'ai', text: data.reply || data.error || 'No response' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: 'Failed to get response. Try again.' }]);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          <div>
            <h1 className="text-2xl font-heading font-bold text-slate-900 dark:text-dark-text">AI Chat</h1>
            <p className="text-sm text-slate-500 dark:text-dark-muted">Ask questions about your blog and get AI-powered insights</p>
          </div>
        </div>
      </div>

      <div className="flex-1 rounded-xl border border-slate-200 dark:border-dark-border bg-white dark:bg-dark-card flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'ai' ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400' : 'bg-slate-100 dark:bg-dark-border text-slate-600 dark:text-dark-muted'
              }`}>
                {msg.role === 'ai' ? <Cpu className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'ai'
                  ? 'bg-slate-50 dark:bg-dark-border text-slate-700 dark:text-dark-text'
                  : 'bg-brand-600 text-white'
              }`}>
                {msg.role === 'ai' && (
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3 h-3 text-brand-500" />
                    <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400 uppercase">AI</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.text}</div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-brand-600 dark:text-brand-400" />
              </div>
              <div className="bg-slate-50 dark:bg-dark-border rounded-xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-slate-200 dark:border-dark-border p-4">
          <div className="flex gap-3">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about your blog (e.g., 'What should I write about?')..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-dark-border bg-white dark:bg-dark-card text-sm focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-dark-border text-white font-medium transition flex items-center gap-2 text-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
