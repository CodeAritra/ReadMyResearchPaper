'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Send,
  FileText,
  ChevronRight,
  Terminal,
  Layers,
  FolderPlus,
  Library,
  PlusCircle,
  Check,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  GripVertical,
} from 'lucide-react';
import { UploadPaperDialog } from '@/components/UploadPaperDialog';
import { DocumentReader } from '@/components/DocumentReader';
import { CitationBadge } from '@/components/CitationBadge';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';
import { TutorialTour, runInteractiveTour } from '@/components/TutorialTour';
import { Attribution, Collection } from '@research-qna/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  attributions?: Attribution[];
  toolUsed?: 'search_uploaded_papers' | 'search_arxiv' | 'search_web';
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

const INITIAL_ATTENTION_PAPER: ActivePaper = {
  id: 'paper-attention',
  title: 'Attention Is All You Need',
  authors: [
    'Ashish Vaswani',
    'Noam Shazeer',
    'Niki Parmar',
    'Jakob Uszkoreit',
    'Llion Jones',
    'Aidan N. Gomez',
    'Łukasz Kaiser',
    'Illia Polosukhin',
  ],
  pageCount: 11,
  sections: [
    { title: 'Abstract', pageNumber: 1 },
    { title: '1 Introduction', pageNumber: 1 },
    { title: '2 Background', pageNumber: 2 },
    { title: '3 Model Architecture', pageNumber: 2 },
    { title: '3.1 Encoder and Decoder Stacks', pageNumber: 2 },
    { title: '3.2 Attention', pageNumber: 3 },
    { title: '3.2.1 Scaled Dot-Product Attention', pageNumber: 3 },
    { title: '3.2.2 Multi-Head Attention', pageNumber: 4 },
    { title: '3.2.3 Applications of Attention', pageNumber: 5 },
    { title: '3.3 Position-wise Feed-Forward Networks', pageNumber: 5 },
    { title: '3.5 Positional Encoding', pageNumber: 6 },
    { title: '4 Why Self-Attention', pageNumber: 6 },
    { title: '5 Training & Hyperparameters', pageNumber: 7 },
    { title: '6 Results', pageNumber: 8 },
    { title: '7 Conclusion', pageNumber: 10 },
  ],
  rawMarkdown: `# Attention Is All You Need

Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin

## Abstract
[PAGE 1]
The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely. Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU. On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.8 after training for 3.5 days on eight GPUs.

## 3.2.1 Scaled Dot-Product Attention
[PAGE 3]
We call our particular attention "Scaled Dot-Product Attention". The input consists of queries and keys of dimension $d_k$, and values of dimension $d_v$. We compute the dot products of the query with all keys, divide each by $\\sqrt{d_k}$, and apply a softmax function to obtain the weights on the values:

$$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$

## 3.2.2 Multi-Head Attention
[PAGE 4]
Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions:

$$\\text{MultiHead}(Q, K, V) = \\text{Concat}(\\text{head}_1, \\dots, \\text{head}_h)W^O$$
$$\\text{where} \\quad \\text{head}_i = \\text{Attention}(QW_i^Q, KW_i^K, VW_i^V)$$

## 6 Results
[PAGE 8]
On the WMT 2014 English-to-German translation task, the big transformer model achieves a state-of-the-art BLEU score of 28.4. On WMT 2014 English-to-French, our model establishes a new score of 41.8.`,
};

export default function WorkbenchPage() {
  const [activePaper, setActivePaper] = useState<ActivePaper>(INITIAL_ATTENTION_PAPER);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedSectionTitle, setSelectedSectionTitle] = useState<string | undefined>('Abstract');

  // Collapsible & Draggable Panes State
  const [sidebarWidth, setSidebarWidth] = useState(260);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);

  const [aiBoxWidth, setAiBoxWidth] = useState(460);
  const [isAiBoxCollapsed, setIsAiBoxCollapsed] = useState(false);
  const [isDraggingAiBox, setIsDraggingAiBox] = useState(false);

  useEffect(() => {
    let animationFrameId: number | null = null;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingSidebar && !isDraggingAiBox) return;

      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        if (isDraggingSidebar) {
          const newWidth = Math.min(Math.max(180, e.clientX), 480);
          setSidebarWidth(newWidth);
        }
        if (isDraggingAiBox) {
          const newWidth = Math.min(Math.max(300, window.innerWidth - e.clientX), 750);
          setAiBoxWidth(newWidth);
        }
      });
    };

    const handleMouseUp = () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      setIsDraggingSidebar(false);
      setIsDraggingAiBox(false);
    };

    if (isDraggingSidebar || isDraggingAiBox) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    } else {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDraggingSidebar, isDraggingAiBox]);

  const [activePage, setActivePage] = useState(1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Welcome to the Research Paper Q&A Workbench. The complete manuscript "Attention Is All You Need" (Vaswani et al., 11 pages) is loaded and indexed. You can ask deep technical questions, explore sections, or upload additional papers.',
      attributions: [
        {
          paperId: 'paper-attention',
          paperTitle: 'Attention Is All You Need',
          sectionTitle: '3.2.1 Scaled Dot-Product Attention',
          pageNumber: 3,
          sourceType: 'uploaded_paper',
        },
      ],
      toolUsed: 'search_uploaded_papers',
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load seeded paper on mount
  useEffect(() => {
    // Fetch live seeded paper with complete markdown from Express API
    fetch('http://localhost:3001/api/papers/paper-attention')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.title) {
          setActivePaper(data);
        }
      })
      .catch(() => {});

    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/collections');
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch {
      // Offline fallback
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;

    try {
      const res = await fetch('http://localhost:3001/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCollectionName.trim(),
          paperIds: [activePaper.id],
        }),
      });

      if (res.ok) {
        const created: Collection = await res.json();
        setCollections((prev) => [...prev, created]);
        setActiveCollectionId(created.id);
        setNewCollectionName('');
        setIsCreatingCollection(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `sys-${Date.now()}`,
            role: 'assistant',
            content: `Created Collection "${created.name}". Queries will now perform partitioned cross-paper retrieval across all papers in this collection.`,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to create collection', err);
    }
  };

  const handleAddActivePaperToCollection = async (collectionId: string) => {
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;
    if (col.paperIds.includes(activePaper.id)) return;

    const updatedPaperIds = [...col.paperIds, activePaper.id];
    try {
      const res = await fetch(`http://localhost:3001/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paperIds: updatedPaperIds }),
      });
      if (res.ok) {
        const updated: Collection = await res.json();
        setCollections((prev) =>
          prev.map((c) => (c.id === collectionId ? updated : c))
        );
      }
    } catch (err) {
      console.error('Failed to add paper to collection', err);
    }
  };

  const handlePaperUploaded = async (paperId: string) => {
    try {
      const res = await fetch(`http://localhost:3001/api/papers/${paperId}`);
      if (res.ok) {
        const paper = await res.json();
        setActivePaper(paper);
        setActivePage(1);

        if (activeCollectionId) {
          await handleAddActivePaperToCollection(activeCollectionId);
        }

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

  // Cross-paper interactive citation navigation
  const handleNavigateCitation = async (
    paperId: string,
    pageNumber: number,
    sectionTitle?: string
  ) => {
    if (paperId && paperId !== activePaper.id && !paperId.startsWith('arxiv') && !paperId.startsWith('web')) {
      try {
        const res = await fetch(`http://localhost:3001/api/papers/${paperId}`);
        if (res.ok) {
          const paper = await res.json();
          setActivePaper(paper);
        }
      } catch (err) {
        console.error('Failed to load referenced paper', err);
      }
    }
    setActivePage(pageNumber);
    if (sectionTitle) {
      setSelectedSectionTitle(sectionTitle);
    }
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
          ...(activeCollectionId
            ? { collectionId: activeCollectionId }
            : { paperId: activePaper.id }),
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
            if (parsed.tool) {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, toolUsed: parsed.tool }
                    : msg
                )
              );
            }
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

  const activeCollection = collections.find((c) => c.id === activeCollectionId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090a0f] text-zinc-100 antialiased font-sans">
      {/* Interactive Driver.js Tutorial Tour */}
      <TutorialTour autoStart />

      {/* Full-screen invisible overlay during dragging to prevent event capture lag */}
      {(isDraggingSidebar || isDraggingAiBox) && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none pointer-events-auto bg-transparent" />
      )}

      {/* Sidebar: Navigation & Collections */}
      <aside
        style={{ width: isSidebarCollapsed ? 0 : sidebarWidth }}
        className={`bg-[#0d0f14] flex flex-col justify-between shrink-0 overflow-hidden relative ${
          isDraggingSidebar ? 'transition-none' : 'transition-[width] duration-150'
        } ${isSidebarCollapsed ? 'border-r-0 p-0' : 'p-4 border-r border-zinc-800'}`}
      >
        <div className="space-y-5 overflow-y-auto pr-1 min-w-[220px]">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-zinc-300" />
              <span className="font-semibold tracking-tight text-sm text-zinc-100">
                Paper Workbench
              </span>
            </div>
            <button
              onClick={() => setIsSidebarCollapsed(true)}
              className="p-1 -mr-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors"
              title="Collapse Sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Ingestion Dialog Button */}
          <div id="tour-ingestion" className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-2">
              Ingestion
            </div>
            <UploadPaperDialog onPaperUploaded={handlePaperUploaded} />
          </div>

          {/* Collections Workspace */}
          <div id="tour-collections" className="space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Library className="w-3.5 h-3.5 text-zinc-400" />
                Collections
              </span>
              <button
                onClick={() => setIsCreatingCollection(!isCreatingCollection)}
                className="text-[10px] text-zinc-400 hover:text-zinc-200 p-0.5"
                title="Create Collection"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {isCreatingCollection && (
              <form onSubmit={handleCreateCollection} className="space-y-1.5 px-2">
                <input
                  type="text"
                  placeholder="Collection name..."
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 font-mono"
                  autoFocus
                />
                <div className="flex gap-1 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreatingCollection(false)}
                    className="text-[10px] px-2 py-0.5 text-zinc-400 hover:text-zinc-200 font-mono"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-[10px] px-2 py-0.5 bg-zinc-200 text-zinc-900 rounded font-mono font-medium hover:bg-white"
                  >
                    Create
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-1">
              <button
                onClick={() => setActiveCollectionId(null)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors font-mono text-left ${
                  activeCollectionId === null
                    ? 'bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                }`}
              >
                <span className="truncate">Single Paper Mode</span>
                {activeCollectionId === null && <Check className="w-3 h-3 text-zinc-400" />}
              </button>

              {collections.map((col) => (
                <button
                  key={col.id}
                  onClick={() => setActiveCollectionId(col.id)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors font-mono text-left ${
                    activeCollectionId === col.id
                      ? 'bg-zinc-800 text-zinc-100 font-medium border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                  }`}
                >
                  <span className="truncate max-w-[130px]">{col.name}</span>
                  <span className="text-[10px] text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                    {col.paperIds.length} {col.paperIds.length === 1 ? 'paper' : 'papers'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Paper Details */}
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
                {activePaper.authors.slice(0, 3).join(', ')}{activePaper.authors.length > 3 ? ' et al.' : ''} · {activePaper.pageCount} pages
              </div>

              {activeCollection && !activeCollection.paperIds.includes(activePaper.id) && (
                <button
                  onClick={() => handleAddActivePaperToCollection(activeCollection.id)}
                  className="mt-1 w-full text-[10px] text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700/80 py-1 px-2 rounded font-mono flex items-center justify-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" />
                  Add to active collection
                </button>
              )}
            </div>
          </div>

          {/* Structural Sections */}
          <div id="tour-sections">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 px-2 mb-2 flex items-center justify-between">
              <span>Sections</span>
              <span className="text-[10px] font-mono bg-zinc-800 px-1.5 py-0.5 rounded">
                {activePaper.sections.length}
              </span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
              {activePaper.sections.map((sec, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedSectionTitle(sec.title);
                    setActivePage(sec.pageNumber);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] transition-colors font-mono text-left ${
                    selectedSectionTitle === sec.title
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

        {/* Sidebar Footer */}
        <div className="border-t border-zinc-800/80 pt-3 space-y-2 shrink-0">
          <button
            onClick={() => runInteractiveTour()}
            className="w-full flex items-center justify-between px-2 py-1.5 rounded text-[11px] font-mono text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
              Quick Walkthrough
            </span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tutorial</span>
          </button>

          <div className="text-[11px] text-zinc-400 font-mono flex items-center justify-between">
            <span>{activeCollection ? 'Partitioned Retrieval' : 'Single Paper Grounding'}</span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          </div>
        </div>
      </aside>

      {/* Sidebar Draggable Resize Handle */}
      {!isSidebarCollapsed && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingSidebar(true);
          }}
          className={`w-1 cursor-col-resize hover:bg-zinc-600 transition-colors shrink-0 relative group z-20 ${
            isDraggingSidebar ? 'bg-indigo-500' : 'bg-transparent'
          }`}
          title="Drag to resize sidebar"
        >
          <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
        </div>
      )}

      {/* Main 2-Pane Workbench */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Interactive Document Canvas */}
        <section id="tour-document-reader" className="flex-1 bg-[#090a0f] flex flex-col overflow-hidden">
          <DocumentReader
            paperTitle={activePaper.title}
            authors={activePaper.authors}
            pageCount={activePaper.pageCount}
            sections={activePaper.sections}
            rawMarkdown={activePaper.rawMarkdown}
            activePage={activePage}
            onPageChange={setActivePage}
            selectedSectionTitle={selectedSectionTitle}
            onSelectSection={(title, page) => {
              setSelectedSectionTitle(title);
              setActivePage(page);
            }}
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isAiBoxCollapsed={isAiBoxCollapsed}
            onToggleAiBox={() => setIsAiBoxCollapsed(!isAiBoxCollapsed)}
          />
        </section>

        {/* AI Box Draggable Resize Handle */}
        {!isAiBoxCollapsed && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDraggingAiBox(true);
            }}
            className={`w-1 cursor-col-resize hover:bg-zinc-600 transition-colors shrink-0 relative group z-20 border-l border-zinc-800 ${
              isDraggingAiBox ? 'bg-indigo-500' : 'bg-transparent'
            }`}
            title="Drag to resize discussion pane"
          >
            <div className="absolute inset-y-0 -left-1 -right-1 cursor-col-resize" />
          </div>
        )}

        {/* Right Pane: Discussion & Grounded Q&A */}
        <section
          id="tour-discussion"
          style={{ width: isAiBoxCollapsed ? 0 : aiBoxWidth }}
          className={`bg-[#0d0f14] flex flex-col shrink-0 overflow-hidden ${
            isDraggingAiBox ? 'transition-none' : 'transition-[width] duration-150'
          } ${isAiBoxCollapsed ? 'border-l-0' : 'border-l border-zinc-800'}`}
        >
          <div className="min-w-[300px] flex flex-col h-full">
            <header className="h-11 border-b border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-400 shrink-0">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-medium text-zinc-200">
                  {activeCollection ? `Collection: ${activeCollection.name}` : 'Discussion'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">
                  {activeCollection ? 'Cross-Paper Synthesis' : 'Strict Attribution'}
                </span>
                <button
                  onClick={() => setIsAiBoxCollapsed(true)}
                  className="p-1 -mr-1 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 rounded transition-colors"
                  title="Collapse Discussion Pane"
                >
                  <PanelRightClose className="w-3.5 h-3.5" />
                </button>
              </div>
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
                      {msg.toolUsed && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                          {msg.toolUsed === 'search_arxiv'
                            ? 'arXiv Preprints'
                            : msg.toolUsed === 'search_web'
                            ? 'Web Literature'
                            : 'Uploaded Papers'}
                        </span>
                      )}
                    </div>

                    {msg.role === 'user' ? (
                      <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}

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
              id="tour-input-box"
              onSubmit={handleSubmit}
              className="p-3 border-t border-zinc-800 bg-[#0d0f14] flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  activeCollection
                    ? `Compare papers in "${activeCollection.name}"...`
                    : 'Ask a question about this paper...'
                }
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
          </div>
        </section>
      </div>
    </div>
  );
}
