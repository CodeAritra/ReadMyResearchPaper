'use client';

import React, { useState, useRef, useEffect } from 'react';
import { BookOpen, Send, FileText, ChevronRight, Terminal, Layers } from 'lucide-react';
import { UploadPaperDialog } from '@/components/UploadPaperDialog';
import { DocumentReader } from '@/components/DocumentReader';
import { CitationBadge } from '@/components/CitationBadge';
import { Attribution } from '@research-qna/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attributions?: Attribution[];
}

interface PaperSection {
  title: string;
  pageNumber: number;
}

interface ActivePaper {
  id: string;
  title: string;
  authors: string[];
  pageCount: number;
  sections: PaperSection[];
  rawMarkdown?: string;
}

export default function WorkbenchPage() {
  const [activePaper, setActivePaper] = useState<ActivePaper>({
    id: 'paper-sample-1',
    title: 'Attention Is All You Need',
    authors: ['Vaswani et al.'],
    pageCount: 11,
    sections: [
      { title: 'Abstract', pageNumber: 1 },
      { title: 'Introduction', pageNumber: 1 },
      { title: 'Model Architecture', pageNumber: 2 },
      { title: 'Methodology', pageNumber: 3 },
      { title: 'Attention Mechanism', pageNumber: 4 },
      { title: 'Results', pageNumber: 7 },
    ],
    rawMarkdown: `The Transformer computes self-attention using queries, keys, and values:
$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
Multi-Head Attention allows the model to jointly attend to information at different representation subspaces.`,
  });

  const [activePage, setActivePage] = useState(1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Welcome to the Research Paper Q&A Workbench. Ready to analyze uploaded literature and verify citations with strict source attribution.',
      attributions: [
        {
          paperId: 'paper-sample-1',
          paperTitle: 'Attention Is All You Need',
          sectionTitle: 'Methodology',
          pageNumber: 3,
        },
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePaperUploaded = async (paperId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/papers/${paperId}`);
      if (res.ok) {
        const paper = await res.json();
        setActivePaper(paper);
        setActivePage(1);
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: 'assistant',
            content: `Ingested "${paper.title}" (${paper.pageCount} pages, ${paper.sections.length} structural sections). You can now ask questions with verifiable citations.`,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load newly uploaded paper metadata', err);
    }
  };

  const handleNavigateCitation = (_paperId: string, pageNumber: number) => {
    setActivePage(pageNumber);
  };

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
      attributions: [],
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setInput('');
    setIsStreaming(true);

    try {
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userQuery,
          paperId: activePaper.id,
        }),
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
            if (parsed.attributions) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, attributions: parsed.attributions }
                    : msg
                )
              );
            }
          } catch {
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
    } catch {
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

          <div className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-2">
              Ingestion
            </div>
            <UploadPaperDialog onPaperUploaded={handlePaperUploaded} />
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-2 mb-2">
              Active Paper
            </div>
            <div className="p-2.5 rounded border border-zinc-800/80 bg-zinc-900/50 text-xs text-zinc-400 space-y-1">
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium truncate">
                <FileText className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                <span className="truncate">{activePaper.title}</span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">
                {activePaper.authors.join(', ')} · {activePaper.pageCount} pages
              </div>
            </div>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-2 mb-2 flex items-center justify-between">
              <span>Sections</span>
              <span className="text-[10px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                {activePaper.sections.length}
              </span>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {activePaper.sections.map((sec, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePage(sec.pageNumber)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] transition-colors font-mono text-left ${
                    activePage === sec.pageNumber
                      ? 'bg-zinc-800 text-zinc-100 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="truncate max-w-[150px]">{sec.title}</span>
                  <span className="text-[10px] text-zinc-400">p. {sec.pageNumber}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 pt-3 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
          <span>Grounding & Citations</span>
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </aside>

      {/* Main 2-Pane Workbench */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Interactive Document Canvas */}
        <section className="flex-1 border-r border-zinc-800 bg-[#090a0f] flex flex-col overflow-hidden">
          <DocumentReader
            paperTitle={activePaper.title}
            authors={activePaper.authors}
            pageCount={activePaper.pageCount}
            sections={activePaper.sections}
            rawMarkdown={activePaper.rawMarkdown}
            activePage={activePage}
            onPageChange={setActivePage}
          />
        </section>

        {/* Right Pane: Discussion & Grounded Q&A */}
        <section className="w-[480px] bg-[#0d0f14] flex flex-col shrink-0">
          <header className="h-11 border-b border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-medium text-zinc-200">Discussion</span>
            </div>
            <span className="text-[11px] font-mono text-zinc-400">Strict Attribution</span>
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
                  className={`max-w-[92%] rounded-md px-3.5 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/60 font-medium'
                      : 'bg-zinc-900/80 text-zinc-300 border border-zinc-800/80'
                  }`}
                >
                  <div className="text-[10px] font-mono text-zinc-400 mb-1 flex items-center justify-between">
                    <span>{msg.role === 'user' ? 'YOU' : 'RESEARCH ASSISTANT'}</span>
                  </div>

                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                  {/* Render Citation Anchors */}
                  {msg.attributions && msg.attributions.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-800/80">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                        Sources & Attributions
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {msg.attributions.map((attr, idx) => (
                          <CitationBadge
                            key={idx}
                            attribution={attr}
                            onNavigate={handleNavigateCitation}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
