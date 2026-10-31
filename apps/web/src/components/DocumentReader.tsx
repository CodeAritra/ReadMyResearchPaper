'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  PanelLeftOpen,
  PanelRightOpen,
  ExternalLink,
  RotateCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PaperSection {
  title: string;
  pageNumber: number;
}

export interface ParsedSection {
  title: string;
  pageNumber: number;
  content: string;
}

interface DocumentReaderProps {
  paperId?: string;
  paperTitle: string;
  authors: string[];
  pageCount: number;
  sections?: PaperSection[];
  rawMarkdown?: string;
  activePage: number;
  onPageChange: (newPage: number) => void;
  selectedSectionTitle?: string;
  onSelectSection?: (sectionTitle: string, pageNumber: number) => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  isAiBoxCollapsed?: boolean;
  onToggleAiBox?: () => void;
}

export function DocumentReader({
  paperId = 'paper-attention',
  paperTitle,
  pageCount,
  activePage,
  onPageChange,
  isSidebarCollapsed = false,
  onToggleSidebar,
  isAiBoxCollapsed = false,
  onToggleAiBox,
}: DocumentReaderProps) {
  const [iframeKey, setIframeKey] = useState(0);
  const [isPdfLoading, setIsPdfLoading] = useState(true);

  const basePdfUrl = `http://localhost:3001/api/papers/${paperId}/pdf`;
  const pdfViewerUrl = `${basePdfUrl}#page=${activePage}&view=FitH`;

  useEffect(() => {
    setIsPdfLoading(true);
    setIframeKey((prev) => prev + 1);
  }, [paperId]);

  const handlePrevPage = () => {
    if (activePage > 1) {
      onPageChange(activePage - 1);
    }
  };

  const handleNextPage = () => {
    if (activePage < pageCount) {
      onPageChange(activePage + 1);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090a0f] text-zinc-100 overflow-hidden">
      {/* Header & PDF Navigation Toolbar */}
      <header className="h-11 border-b border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-400 bg-[#0d0f14]/90 shrink-0">
        {/* Left: Paper Title & Sidebar Toggle */}
        <div className="flex items-center gap-2 truncate max-w-[45%]">
          {isSidebarCollapsed && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1 -ml-1 mr-1 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
              title="Expand Sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          )}
          <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="font-mono text-zinc-400 shrink-0">DOCUMENT</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-200 font-medium truncate" title={paperTitle}>
            {paperTitle}
          </span>
        </div>

        {/* Center: Page Navigation Controls */}
        <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 rounded px-1.5 py-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            onClick={handlePrevPage}
            disabled={activePage <= 1}
            title="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>

          <span className="text-[11px] font-mono text-zinc-300 px-1 min-w-[70px] text-center">
            p. {activePage} / {Math.max(1, pageCount)}
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-400 hover:text-zinc-100 disabled:opacity-30"
            onClick={handleNextPage}
            disabled={activePage >= pageCount}
            title="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Right: Actions & Discussion Toggle */}
        <div className="flex items-center gap-2">
          <a
            href={basePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded text-[11px] font-mono transition-colors shadow-sm"
            title="Open uploaded PDF in new tab"
          >
            <ExternalLink className="w-3 h-3 text-zinc-400" />
            <span>Open PDF</span>
          </a>

          {/* Collapsed AI Box Restore Trigger */}
          {isAiBoxCollapsed && onToggleAiBox && (
            <button
              onClick={onToggleAiBox}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-800/90 hover:bg-zinc-700/80 text-zinc-200 hover:text-white border border-zinc-700/60 rounded text-[11px] font-mono transition-colors shadow-sm ml-1"
              title="Expand Discussion Pane"
            >
              <PanelRightOpen className="w-3.5 h-3.5 text-zinc-300" />
              <span>Discussion</span>
            </button>
          )}
        </div>
      </header>

      {/* Direct PDF View Canvas */}
      <div className="flex-1 w-full h-full relative bg-[#090a0f] overflow-hidden">
        {isPdfLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#090a0f]/80 text-xs font-mono text-zinc-400 gap-2">
            <RotateCw className="w-5 h-5 animate-spin text-zinc-400" />
            <span>Loading PDF manuscript...</span>
          </div>
        )}
        <iframe
          key={`${paperId}-${iframeKey}`}
          src={pdfViewerUrl}
          className="w-full h-full border-0 bg-[#0d0f14]"
          title={paperTitle}
          onLoad={() => setIsPdfLoading(false)}
        />
      </div>
    </div>
  );
}
