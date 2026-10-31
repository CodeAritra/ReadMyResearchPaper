'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FileText,
  Layers,
  PanelLeftOpen,
  PanelRightOpen,
  LayoutList,
  ScrollText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/MarkdownRenderer';

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
  paperTitle: string;
  authors: string[];
  pageCount: number;
  sections: PaperSection[];
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

export function parseDocumentSections(
  rawMarkdown?: string,
  fallbackSections?: PaperSection[]
): ParsedSection[] {
  if (!rawMarkdown) {
    return (fallbackSections || []).map((s) => ({
      title: s.title,
      pageNumber: s.pageNumber,
      content: 'Section content extracted and indexed in Qdrant.',
    }));
  }

  const lines = rawMarkdown.split('\n');
  const parsed: ParsedSection[] = [];
  let currentTitle = 'Document Overview';
  let currentPage = 1;
  let currentLines: string[] = [];

  const flush = () => {
    const text = currentLines.join('\n').trim();
    if (text.length > 0 || parsed.length === 0) {
      parsed.push({
        title: currentTitle,
        pageNumber: currentPage,
        content: text || 'No section text available.',
      });
    }
    currentLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Page indicator
    const pageMatch = trimmed.match(/\[PAGE\s+(\d+)\]/i);
    if (pageMatch) {
      currentPage = parseInt(pageMatch[1], 10);
      continue;
    }

    // Heading indicator (# or ## or ###)
    if (trimmed.startsWith('#')) {
      const heading = trimmed.replace(/^#+\s*/, '').trim();
      flush();
      currentTitle = heading;
      continue;
    }

    currentLines.push(line);
  }

  flush();

  return parsed.length > 0
    ? parsed
    : [
        {
          title: 'Full Document',
          pageNumber: 1,
          content: rawMarkdown.trim(),
        },
      ];
}

export function DocumentReader({
  paperTitle,
  authors,
  pageCount,
  sections,
  rawMarkdown,
  activePage,
  onPageChange,
  selectedSectionTitle,
  onSelectSection,
  isSidebarCollapsed = false,
  onToggleSidebar,
  isAiBoxCollapsed = false,
  onToggleAiBox,
}: DocumentReaderProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [highlightFlash, setHighlightFlash] = useState(false);
  const [viewMode, setViewMode] = useState<'section' | 'full'>('section');
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const fullDocumentContainerRef = useRef<HTMLDivElement>(null);

  // Parse markdown into distinct logical sections
  const parsedSections = useMemo(
    () => parseDocumentSections(rawMarkdown, sections),
    [rawMarkdown, sections]
  );

  // Sync active section when activePage or selectedSectionTitle changes
  useEffect(() => {
    if (selectedSectionTitle) {
      const foundIdx = parsedSections.findIndex(
        (s) =>
          s.title.toLowerCase().includes(selectedSectionTitle.toLowerCase()) ||
          selectedSectionTitle.toLowerCase().includes(s.title.toLowerCase())
      );
      if (foundIdx !== -1) {
        setActiveSectionIndex(foundIdx);
        return;
      }
    }

    // Match by pageNumber
    const foundIdxByPage = parsedSections.findIndex((s) => s.pageNumber === activePage);
    if (foundIdxByPage !== -1) {
      setActiveSectionIndex(foundIdxByPage);
    }
  }, [activePage, selectedSectionTitle, parsedSections]);

  useEffect(() => {
    setHighlightFlash(true);
    const timer = setTimeout(() => setHighlightFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [activeSectionIndex, activePage, viewMode]);

  const handlePrevSection = () => {
    if (activeSectionIndex > 0) {
      const newIdx = activeSectionIndex - 1;
      setActiveSectionIndex(newIdx);
      const targetSec = parsedSections[newIdx];
      onPageChange(targetSec.pageNumber);
      onSelectSection?.(targetSec.title, targetSec.pageNumber);
    }
  };

  const handleNextSection = () => {
    if (activeSectionIndex < parsedSections.length - 1) {
      const newIdx = activeSectionIndex + 1;
      setActiveSectionIndex(newIdx);
      const targetSec = parsedSections[newIdx];
      onPageChange(targetSec.pageNumber);
      onSelectSection?.(targetSec.title, targetSec.pageNumber);
    }
  };

  const handleSelectSectionByIndex = (index: number) => {
    setActiveSectionIndex(index);
    const targetSec = parsedSections[index];
    onPageChange(targetSec.pageNumber);
    onSelectSection?.(targetSec.title, targetSec.pageNumber);

    if (viewMode === 'full') {
      const element = document.getElementById(`section-anchor-${index}`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleZoomIn = () => {
    if (zoomLevel < 150) setZoomLevel((z) => z + 10);
  };

  const handleZoomOut = () => {
    if (zoomLevel > 70) setZoomLevel((z) => z - 10);
  };

  const currentSection = parsedSections[activeSectionIndex] || parsedSections[0];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090a0f] text-zinc-100 overflow-hidden">
      {/* Header & Section Navigation Toolbar */}
      <header className="h-11 border-b border-zinc-800 px-4 flex items-center justify-between text-xs text-zinc-400 bg-[#0d0f14]/80 shrink-0">
        {/* Left: Reader Title & Sidebar Toggle */}
        <div className="flex items-center gap-2 truncate">
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
          <span className="font-mono text-zinc-400">DOCUMENT</span>
          <span className="text-zinc-600">/</span>
          <span className="text-zinc-200 font-medium truncate max-w-xs">{paperTitle}</span>
        </div>

        {/* Center: View Mode Toggle (Section Wise vs Whole Document) */}
        <div className="flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded p-0.5">
          <button
            onClick={() => setViewMode('section')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
              viewMode === 'section'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="View section-by-section"
          >
            <LayoutList className="w-3 h-3" />
            <span>Section View</span>
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
              viewMode === 'full'
                ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
            title="View the whole continuous document"
          >
            <ScrollText className="w-3 h-3" />
            <span>Whole Document</span>
          </button>
        </div>

        {/* Right: Section Navigation & Zoom Controls */}
        <div className="flex items-center gap-3">
          {/* Section Stepper (When in Section View) */}
          {viewMode === 'section' && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-zinc-800 bg-zinc-900"
                onClick={handlePrevSection}
                disabled={activeSectionIndex <= 0}
                title="Previous Section"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>

              {/* Section dropdown picker */}
              <select
                value={activeSectionIndex}
                onChange={(e) => handleSelectSectionByIndex(parseInt(e.target.value, 10))}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-zinc-700 max-w-[170px] truncate"
                title="Choose section"
              >
                {parsedSections.map((sec, idx) => (
                  <option key={idx} value={idx}>
                    {idx + 1}. {sec.title} (p. {sec.pageNumber})
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 border-zinc-800 bg-zinc-900"
                onClick={handleNextSection}
                disabled={activeSectionIndex >= parsedSections.length - 1}
                title="Next Section"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>

              <span className="text-[10px] font-mono text-zinc-500 pl-0.5">
                p. {currentSection.pageNumber}
              </span>
            </div>
          )}

          {/* Quick Section Jump (When in Whole Document View) */}
          {viewMode === 'full' && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-zinc-500">Jump to:</span>
              <select
                onChange={(e) => handleSelectSectionByIndex(parseInt(e.target.value, 10))}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-200 font-mono focus:outline-none focus:border-zinc-700 max-w-[170px] truncate"
                title="Jump to section"
              >
                {parsedSections.map((sec, idx) => (
                  <option key={idx} value={idx}>
                    § {sec.title} (p. {sec.pageNumber})
                  </option>
                ))}
              </select>
            </div>
          )}

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

      {/* Document View Canvas */}
      <div
        ref={fullDocumentContainerRef}
        className="flex-1 overflow-y-auto p-6 flex flex-col items-center bg-zinc-950/40"
      >
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className={`max-w-2xl w-full bg-zinc-900/50 border rounded-lg p-8 shadow-2xl text-zinc-300 space-y-6 leading-relaxed text-sm transition-all duration-300 ${
            highlightFlash
              ? 'border-indigo-500/80 ring-2 ring-indigo-500/30'
              : 'border-zinc-800/90'
          }`}
        >
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3 text-xs">
            <span className="font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
              {viewMode === 'section'
                ? `SECTION ${activeSectionIndex + 1} OF ${parsedSections.length} · PAGE ${currentSection.pageNumber}`
                : `COMPLETE MANUSCRIPT · ${parsedSections.length} SECTIONS · ${pageCount} PAGES`}
            </span>
            <span className="font-mono text-[11px] text-zinc-400">
              {viewMode === 'section' ? 'Section View' : 'Continuous View'}
            </span>
          </div>

          {/* Paper Title & Authors */}
          <div className="space-y-3 pb-3 border-b border-zinc-800/60">
            <h1 className="text-xl font-bold tracking-tight text-zinc-100">{paperTitle}</h1>
            <p className="text-xs text-zinc-400 font-mono">{authors.join(', ')}</p>
          </div>

          {/* MODE 1: SECTION-BY-SECTION VIEW */}
          {viewMode === 'section' && (
            <div className="space-y-6">
              {/* Focused Section Card */}
              <div className="p-6 rounded-md bg-zinc-900/80 border border-zinc-800/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                      Section {activeSectionIndex + 1}
                    </span>
                    <h2 className="text-base font-semibold text-zinc-100 tracking-tight">
                      {currentSection.title}
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400">
                    Page {currentSection.pageNumber}
                  </span>
                </div>

                {/* Section Content with Markdown, Tables & Math Formulas */}
                <div className="pt-1">
                  <MarkdownRenderer content={currentSection.content} />
                </div>
              </div>

              {/* Bottom Quick Navigation between sections */}
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevSection}
                  disabled={activeSectionIndex <= 0}
                  className="text-xs font-mono border-zinc-800"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Previous Section
                </Button>

                <span className="text-xs font-mono text-zinc-500">
                  {activeSectionIndex + 1} / {parsedSections.length}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextSection}
                  disabled={activeSectionIndex >= parsedSections.length - 1}
                  className="text-xs font-mono border-zinc-800"
                >
                  Next Section
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* MODE 2: WHOLE CONTINUOUS DOCUMENT VIEW */}
          {viewMode === 'full' && (
            <div className="space-y-8">
              {parsedSections.map((sec, idx) => (
                <div
                  key={idx}
                  id={`section-anchor-${idx}`}
                  className="p-6 rounded-md bg-zinc-900/60 border border-zinc-800/80 space-y-3 scroll-mt-6"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                        § {idx + 1}
                      </span>
                      <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                        {sec.title}
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">
                      Page {sec.pageNumber}
                    </span>
                  </div>

                  {/* Continuous Section Content with Markdown, Tables & Math Formulas */}
                  <div className="pt-1">
                    <MarkdownRenderer content={sec.content} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
