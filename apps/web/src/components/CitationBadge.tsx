'use client';

import React from 'react';
import { Attribution } from '@research-qna/types';
import { BookOpen, ExternalLink } from 'lucide-react';

interface CitationBadgeProps {
  attribution: Attribution;
  onNavigate: (paperId: string, pageNumber: number) => void;
}

export function CitationBadge({ attribution, onNavigate }: CitationBadgeProps) {
  return (
    <button
      onClick={() => onNavigate(attribution.paperId, attribution.pageNumber)}
      title={`Jump to ${attribution.paperTitle} · Page ${attribution.pageNumber} (${attribution.sectionTitle})`}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 my-1 mr-1.5 rounded text-[11px] font-mono bg-zinc-800/90 hover:bg-zinc-700/80 text-zinc-200 border border-zinc-700/60 transition-all hover:border-zinc-500 hover:text-white group cursor-pointer shadow-sm"
    >
      <BookOpen className="w-3 h-3 text-zinc-400 group-hover:text-zinc-200" />
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
