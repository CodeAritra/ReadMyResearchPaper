'use client';

import React from 'react';
import { Attribution } from '@research-qna/types';
import { BookOpen, ExternalLink, Globe, FileCode } from 'lucide-react';

interface CitationBadgeProps {
  attribution: Attribution;
  onNavigate: (paperId: string, pageNumber: number, sectionTitle?: string) => void;
}

export function CitationBadge({ attribution, onNavigate }: CitationBadgeProps) {
  const sourceType = attribution.sourceType || 'uploaded_paper';

  const displayTitle = attribution.paperTitle
    ? attribution.paperTitle.length > 22
      ? attribution.paperTitle.slice(0, 20) + '...'
      : attribution.paperTitle
    : null;

  return (
    <button
      onClick={() => onNavigate(attribution.paperId, attribution.pageNumber, attribution.sectionTitle)}
      title={`Jump to ${attribution.paperTitle} · Page ${attribution.pageNumber} (${attribution.sectionTitle})`}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 my-1 mr-1.5 rounded text-[11px] font-mono bg-zinc-800/90 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 transition-all hover:border-zinc-500 hover:text-white group cursor-pointer shadow-sm"
    >
      {sourceType === 'arxiv' ? (
        <span className="text-[9px] font-semibold uppercase px-1 py-0.2 bg-zinc-700 text-zinc-300 rounded">
          arXiv
        </span>
      ) : sourceType === 'web' ? (
        <Globe className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200" />
      ) : (
        <BookOpen className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200" />
      )}

      {displayTitle && (
        <span className="text-zinc-400 group-hover:text-zinc-300">
          {displayTitle} ·
        </span>
      )}
      <span className="font-semibold text-zinc-300 group-hover:text-white">
        {attribution.sectionTitle}
      </span>
      <span className="text-zinc-400 group-hover:text-zinc-300">
        · p. {attribution.pageNumber}
      </span>
      <ExternalLink className="w-2.5 h-2.5 text-zinc-400 group-hover:text-zinc-300 opacity-60" />
    </button>
  );
}
