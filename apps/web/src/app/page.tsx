'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Send, FileText, ChevronRight, Sparkles, Terminal } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function WorkbenchPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Welcome to the Research Paper Q&A Workbench. Ready to analyze uploaded literature and verify citations with strict source attribution.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userQuery = input.trim();
    const userMessage: Message = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userQuery,
    };

    const assistantMessageId = `ast-${Date.now()}`;
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userQuery }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.replace(/^data:\s*/, '');
          if (payload === '[DONE]') break;

          try {
            const parsed = JSON.parse(payload);
            if (parsed.token) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: msg.content + parsed.token }
                    : msg
                )
              );
            }
          } catch {
            // Raw text fallback
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + payload }
                  : msg
              )
            );
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content:
                  msg.content ||
                  'Error connecting to Express RAG server at http://localhost:3001. Ensure the server is running.',
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f] text-zinc-100 antialiased font-sans">
      {/* Sidebar: Navigation & Collections */}
      <aside className="w-64 border-r border-zinc-800 bg-[#0d0f14] flex flex-col justify-between p-4 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-2 px-2 py-1">
            <BookOpen className="w-5 h-5 text-zinc-300" />
            <span className="font-semibold tracking-tight text-sm text-zinc-100">
              Paper Workbench
            </span>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-2 mb-2">
              Collections
            </div>
            <div className="space-y-1">
              <button className="w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs bg-zinc-800/60 text-zinc-200 border border-zinc-700/50">
                <span className="truncate">Attention & Transformers</span>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800 px-1.5 py-0.5 rounded">
                  1 paper
                </span>
              </button>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-2 mb-2">
              Current Paper
            </div>
            <div className="p-2.5 rounded border border-zinc-800/80 bg-zinc-900/50 text-xs text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium truncate">
                <FileText className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span className="truncate">Attention Is All You Need</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">Vaswani et al. · 2017</div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Express + Qdrant</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </aside>

      {/* Main 2-Pane Workbench */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Document Canvas */}
        <section className="flex-1 border-r border-zinc-800 bg-[#090a0f] flex flex-col">
          <header className="h-11 border-b border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-400 bg-[#0d0f14]/50">
            <div className="flex items-center gap-2">
              <span className="font-mono text-zinc-400">READER</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              <span className="text-zinc-200 font-medium">Attention Is All You Need (p. 1)</span>
            </div>
            <div className="font-mono text-[11px] text-zinc-400">Page 1 of 11</div>
          </header>

          <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center bg-zinc-950/40">
            <div className="max-w-2xl w-full bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-8 shadow-2xl text-zinc-300 space-y-6 leading-relaxed text-sm">
              <div className="border-b border-zinc-800 pb-4">
                <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                  Attention Is All You Need
                </h1>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N.
                  Gomez, Łukasz Kaiser, Illia Polosukhin
                </p>
              </div>

              <div>
                <h2 className="text-xs uppercase font-mono tracking-wider text-zinc-400 mb-2">
                  Abstract
                </h2>
                <p className="text-xs text-zinc-300 text-justify leading-normal">
                  The dominant sequence transduction models are based on complex recurrent or
                  convolutional neural networks that include an encoder and a decoder. The best
                  performing models also connect the encoder and decoder through an attention
                  mechanism. We propose a new simple network architecture, the Transformer, based
                  solely on attention mechanisms, dispensing with recurrence and convolutions
                  entirely.
                </p>
              </div>

              <div className="p-3 bg-zinc-900/90 rounded border border-zinc-800 text-xs font-mono text-zinc-400">
                <span className="text-zinc-400 block mb-1">[Preview Document Canvas]</span>
                Full interactive PDF rendering canvas with bounding boxes is activated in Ticket 04.
              </div>
            </div>
          </div>
        </section>

        {/* Right Pane: Discussion & Grounded Q&A */}
        <section className="w-[480px] bg-[#0d0f14] flex flex-col shrink-0">
          <header className="h-11 border-b border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-medium text-zinc-200">Discussion</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Grounded Mode</span>
          </header>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col text-xs leading-relaxed ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-md px-3.5 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 font-medium'
                      : 'bg-zinc-900/80 text-zinc-300 border border-zinc-800/80'
                  }`}
                >
                  <div className="text-[10px] font-mono text-zinc-400 mb-1">
                    {msg.role === 'user' ? 'YOU' : 'ASSISTANT'}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Box */}
          <form
            onSubmit={handleSubmit}
            className="p-3 border-t border-zinc-800 bg-[#0d0f14] flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this paper..."
              disabled={isStreaming}
              className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="px-3 py-2 bg-zinc-200 hover:bg-white text-zinc-900 font-medium text-xs rounded transition-colors disabled:opacity-30 disabled:hover:bg-zinc-200 flex items-center justify-center shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
