'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Layers,
  Upload,
  MessageSquare,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';

export interface TourStep {
  title: string;
  description: string;
  badge: string;
  targetId: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Interactive Document Reader',
    description:
      'View the complete manuscript with full LaTeX formulas ($LaTeX$) and structured benchmark tables. Use page controls and zoom buttons to inspect evidence in detail.',
    badge: 'Step 1 of 5',
    targetId: 'tour-document-reader',
    icon: <BookOpen className="w-4 h-4 text-zinc-300" />,
  },
  {
    title: 'Structural Section Index',
    description:
      'Quickly navigate the paper by logical sections (Abstract, Architecture, Methodology, Results). Clicking any section smoothly jumps the viewer to that page.',
    badge: 'Step 2 of 5',
    targetId: 'tour-sections',
    icon: <Layers className="w-4 h-4 text-zinc-300" />,
  },
  {
    title: 'Asynchronous PDF Ingestion',
    description:
      'Upload any academic PDF manuscript. The background extraction pipeline transcribes layouts, equations, and tables into searchable evidence chunks.',
    badge: 'Step 3 of 5',
    targetId: 'tour-ingestion',
    icon: <Upload className="w-4 h-4 text-zinc-300" />,
  },
  {
    title: 'Curated Collections Workspace',
    description:
      'Group related papers into literature review Collections. Queries run partitioned retrieval across all manuscripts to prevent single-paper context starvation.',
    badge: 'Step 4 of 5',
    targetId: 'tour-collections',
    icon: <Layers className="w-4 h-4 text-zinc-300" />,
  },
  {
    title: 'Grounded Q&A & Interactive Citations',
    description:
      'Ask technical questions or compare metrics. Every response provides clickable Citation Badges [Section · p. X] that jump the reader to the exact supporting excerpt.',
    badge: 'Step 5 of 5',
    targetId: 'tour-discussion',
    icon: <MessageSquare className="w-4 h-4 text-zinc-300" />,
  },
];

interface TutorialTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TutorialTour({ isOpen, onClose }: TutorialTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleComplete = () => {
    localStorage.setItem('research_qna_tutorial_seen', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-center sm:items-center p-4">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-[1px] pointer-events-auto transition-opacity"
        onClick={handleComplete}
      />

      {/* Tutorial Tooltip Card */}
      <div className="relative pointer-events-auto w-full max-w-md bg-[#111318] border border-zinc-700/80 rounded-lg shadow-2xl p-5 text-zinc-100 z-10 transition-all animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-zinc-800 border border-zinc-700/60">
              {step.icon}
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                {step.badge}
              </span>
              <h3 className="text-sm font-semibold text-zinc-100">{step.title}</h3>
            </div>
          </div>
          <button
            onClick={handleComplete}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
            title="Close Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-3.5 text-xs leading-relaxed text-zinc-300">
          {step.description}
        </div>

        {/* Progress indicators & Navigation Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'w-5 bg-zinc-200'
                    : 'w-1.5 bg-zinc-700 hover:bg-zinc-500'
                }`}
                title={`Go to step ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleComplete}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded transition-colors"
            >
              Skip
            </button>

            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="text-[11px] font-mono px-2.5 py-1 rounded border border-zinc-700 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" />
                Back
              </button>
            )}

            <button
              onClick={handleNext}
              className="text-[11px] font-mono px-3 py-1 rounded bg-zinc-200 hover:bg-white text-zinc-950 font-semibold transition-colors flex items-center gap-1"
            >
              {isLast ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  Got it
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
