'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaperSection {
  title: string;
  pageNumber: number;
}

interface DocumentReaderProps {
  paperTitle: string;
  authors: string[];
  pageCount: number;
  sections: PaperSection[];
  rawMarkdown?: string;
  activePage: number;
  onPageChange: (newPage: number) => void;
}

export function DocumentReader({
  paperTitle,
  authors,
  pageCount,
  sections,
  rawMarkdown,
  activePage,
  onPageChange,
}: DocumentReaderProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [highlightFlash, setHighlightFlash] = useState(false);

  useEffect(() => {
    setHighlightFlash(true);
    const timer = setTimeout(() => setHighlightFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [activePage]);

  const handlePrevPage = () => {
    if (activePage > 1) onPageChange(activePage - 1);
  };

  const handleNextPage = () => {
    if (activePage < pageCount) onPageChange(activePage + 1);
  };

  const handleZoomIn = () => {
    if (zoomLevel < 150) setZoomLevel((z) => z + 10);
  };

  const handleZoomOut = () => {
    if (zoomLevel > 70) setZoomLevel((z) => z - 10);
  };

  // Find sections on current page
  const currentPageSections = sections.filter((s) => s.pageNumber === activePage);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090a0f] text-zinc-100 overflow-hidden">
      {/* Header & Page Navigation Toolbar */}
      <header className="h-11 border-b border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-400 bg-[#0d0f14]/60 shrink-0">
        <div className="flex items-center gap-2 truncate">
          <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="font-mono text-zinc-400">READER</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-200 font-medium truncate max-w-xs">{paperTitle}</span>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-3">
          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 rounded px-1.5 py-0.5">
            <button
              onClick={handleZoomOut}
              disabled={zoomLevel <= 70}
              className="p-1 hover:text-zinc-100 disabled:opacity-30 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono px-1 text-zinc-400 min-w-[36px] text-center">
              {zoomLevel}%
            </span>
            <button
              onClick={handleZoomIn}
              disabled={zoomLevel >= 150}
              className="p-1 hover:text-zinc-100 disabled:opacity-30 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Page controls */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-zinc-800"
              onClick={handlePrevPage}
              disabled={activePage <= 1}
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>

            <span className="text-[11px] font-mono px-1.5 text-zinc-300">
              Page <span className="font-semibold text-zinc-100">{activePage}</span> of {pageCount}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 border-zinc-800"
              onClick={handleNextPage}
              disabled={activePage >= pageCount}
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Document View Canvas */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-zinc-950/40">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className={`max-w-2xl w-full bg-zinc-900/50 border rounded-lg p-8 shadow-2xl text-zinc-300 space-y-6 leading-relaxed text-sm transition-all duration-300 ${
            highlightFlash
              ? 'border-indigo-500/80 ring-2 ring-indigo-500/30'
              : 'border-zinc-800/90'
          }`}
        >
          {/* Header page marker */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-xs">
            <span className="font-mono text-[11px] text-zinc-400">
              DOCUMENT VIEW · PAGE {activePage}
            </span>
            {currentPageSections.length > 0 && (
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-300">
                <Layers className="w-3 h-3 text-zinc-400" />
                <span>{currentPageSections.map((s) => s.title).join(', ')}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">{paperTitle}</h1>
            <p className="text-xs text-zinc-400 font-mono">{authors.join(', ')}</p>
          </div>

          {/* Render Sections mapped to this page */}
          <div className="space-y-4 pt-2">
            {currentPageSections.length > 0 ? (
              currentPageSections.map((sec, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-md bg-zinc-900/80 border border-zinc-800/80 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-200 tracking-tight">
                      {sec.title}
                    </h2>
                    <span className="text-[10px] font-mono text-zinc-400">Page {sec.pageNumber}</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre-wrap">
                    {rawMarkdown || 'Section content extracted and indexed in Qdrant.'}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-md bg-zinc-900/80 border border-zinc-800/80 space-y-2 text-xs font-mono text-zinc-400">
                <span>Page {activePage} content preview</span>
                <p className="text-zinc-400">
                  {rawMarkdown?.slice(0, 300) || 'Academic manuscript content for this page.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
