'use client';

import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Preprocesses markdown text to ensure tables, math formulas, and special characters
 * do not break during parsing and rendering.
 */
export function preprocessMarkdown(text: string): string {
  if (!text) return '';

  let processed = text;

  // 1. Normalize LaTeX display math \[ ... \] to $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => {
    return `\n\n$$\n${math.trim()}\n$$\n\n`;
  });

  // 2. Normalize LaTeX inline math \( ... \) to $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => {
    return `$${math.trim()}$`;
  });

  // 3. Ensure tables have a blank line before them if preceded by plain text
  // GFM requires an empty line before table headers starting with '|'
  const lines = processed.split('\n');
  const normalizedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const prevLine = i > 0 ? lines[i - 1] : '';

    const isCurrentTable = currentLine.trim().startsWith('|');
    const isPrevTable = prevLine.trim().startsWith('|');
    const isPrevEmpty = prevLine.trim().length === 0;

    if (isCurrentTable && !isPrevTable && !isPrevEmpty) {
      normalizedLines.push(''); // Insert blank line before table
    }

    normalizedLines.push(currentLine);
  }

  processed = normalizedLines.join('\n');

  // 4. Ensure display math $$ ... $$ has proper linebreaks around it
  processed = processed.replace(/([^\n])\n?(\$\$[\s\S]*?\$\$)\n?([^\n])/g, '$1\n\n$2\n\n$3');

  return processed;
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const processedContent = useMemo(() => preprocessMarkdown(content), [content]);

  return (
    <div className={`markdown-content text-xs leading-relaxed text-zinc-200 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          [
            rehypeKatex,
            {
              throwOnError: false,
              errorColor: '#ef4444',
              strict: false,
            },
          ],
        ]}
        components={{
          table: ({ children, ...props }) => (
            <div className="my-3.5 w-full overflow-x-auto rounded-md border border-zinc-800 bg-[#0b0d13]">
              <table className="w-full text-left border-collapse text-xs font-mono" {...props}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead
              className="bg-zinc-800/80 border-b border-zinc-700/80 text-zinc-200 uppercase tracking-wider text-[11px] font-semibold"
              {...props}
            >
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="divide-y divide-zinc-800/60 font-sans" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr className="hover:bg-zinc-800/30 transition-colors" {...props}>
              {children}
            </tr>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-3 py-2 text-zinc-200 border-r border-zinc-800/60 last:border-r-0 whitespace-nowrap"
              {...props}
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-3 py-2 text-zinc-300 border-r border-zinc-800/60 last:border-r-0"
              {...props}
            >
              {children}
            </td>
          ),
          p: ({ children, ...props }) => (
            <p className="mb-3 last:mb-0 leading-relaxed text-zinc-300" {...props}>
              {children}
            </p>
          ),
          h1: ({ children, ...props }) => (
            <h1
              className="text-lg font-bold text-zinc-100 mt-5 mb-2.5 first:mt-0 tracking-tight"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="text-base font-semibold text-zinc-100 mt-4 mb-2 first:mt-0 tracking-tight"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="text-sm font-semibold text-zinc-200 mt-3 mb-1.5 first:mt-0"
              {...props}
            >
              {children}
            </h3>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-outside pl-5 mb-3 space-y-1 text-zinc-300" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-outside pl-5 mb-3 space-y-1 text-zinc-300" {...props}>
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed pl-0.5" {...props}>
              {children}
            </li>
          ),
          code: ({ inline, className: codeClass, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[11px] border border-zinc-700/60"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <div className="my-3 overflow-x-auto rounded-md border border-zinc-800 bg-[#07080c] p-3 font-mono text-xs text-zinc-300">
                <code className={codeClass} {...props}>
                  {children}
                </code>
              </div>
            );
          },
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l-2 border-indigo-500/80 pl-3.5 my-3 italic text-zinc-400 bg-zinc-900/40 py-1 rounded-r"
              {...props}
            >
              {children}
            </blockquote>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-zinc-100" {...props}>
              {children}
            </strong>
          ),
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
