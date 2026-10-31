'use client';

import React, { useEffect, useCallback } from 'react';
import { driver, DriveStep } from 'driver.js';
import 'driver.js/dist/driver.css';

export const TOUR_STORAGE_KEY = 'research_qna_tutorial_seen';

export function runInteractiveTour() {
  const steps: DriveStep[] = [
    {
      element: '#tour-ingestion',
      popover: {
        title: '1. Upload Research Papers',
        description:
          'Click here to upload multi-page PDF manuscripts. The asynchronous engine extracts LaTeX equations and benchmark tables without blocking your workspace.',
        side: 'right',
        align: 'center',
      },
    },
    {
      element: '#tour-collections',
      popover: {
        title: '2. Curated Collections',
        description:
          'Create workspaces to group related papers. The retrieval engine queries each paper independently to guarantee balanced comparative literature synthesis.',
        side: 'right',
        align: 'center',
      },
    },
    {
      element: '#tour-sections',
      popover: {
        title: '3. Structural Sections',
        description:
          'Click any section heading (e.g. Methodology, Results) to smoothly jump the document reader directly to that page.',
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '#tour-document-reader',
      popover: {
        title: '4. Interactive Document Reader',
        description:
          'Read the paper with rendered mathematical proofs and tables. Use page navigation and zoom buttons at the top of the canvas.',
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '#tour-discussion',
      popover: {
        title: '5. Grounded Discussion & Citations',
        description:
          'Review generated responses. Every factual claim cites exact pages with clickable Citation Badges [Section · p. X] that navigate the reader to the evidence.',
        side: 'left',
        align: 'start',
      },
    },
    {
      element: '#tour-input-box',
      popover: {
        title: '6. Ask Questions or Query External Sources',
        description:
          'Type queries about your papers or request external literature (e.g. "Search arXiv for transformer preprints").',
        side: 'top',
        align: 'center',
      },
    },
  ];

  const driverObj = driver({
    showProgress: true,
    animate: true,
    popoverClass: 'academic-tour-theme',
    prevBtnText: '← Back',
    nextBtnText: 'Next →',
    doneBtnText: 'Finish Tour ✓',
    steps,
    onDestroyStarted: () => {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
      driverObj.destroy();
    },
  });

  driverObj.drive();
}

interface TutorialTourProps {
  autoStart?: boolean;
}

export function TutorialTour({ autoStart = true }: TutorialTourProps) {
  const checkAndRunTour = useCallback(() => {
    const hasSeenTour = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!hasSeenTour) {
      // Delay slightly so DOM nodes are completely painted
      const timer = setTimeout(() => {
        runInteractiveTour();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      checkAndRunTour();
    }
  }, [autoStart, checkAndRunTour]);

  return null;
}
