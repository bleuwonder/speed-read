"use client";

import { useMemo, useRef, useEffect } from "react";

interface ContextPanelProps {
  words: string[];
  paragraphBreaks: number[];
  wordIndex: number;
}

function getParagraphForWord(wordIndex: number, paragraphBreaks: number[]): number {
  let paraIdx = 0;
  for (let i = 1; i < paragraphBreaks.length; i++) {
    if (paragraphBreaks[i] > wordIndex) break;
    paraIdx = i;
  }
  return paraIdx;
}

export default function ContextPanel({ words, paragraphBreaks, wordIndex }: ContextPanelProps) {
  const activeWordRef = useRef<HTMLSpanElement>(null);

  const currentParaIdx = useMemo(
    () => getParagraphForWord(wordIndex, paragraphBreaks),
    [wordIndex, paragraphBreaks]
  );

  // Build paragraphs to display: current + next
  const visibleParagraphs = useMemo(() => {
    const result: { paraIdx: number; startWord: number; endWord: number; isCurrent: boolean }[] = [];

    // Show one paragraph before current for context (if exists)
    if (currentParaIdx > 0) {
      const prevStart = paragraphBreaks[currentParaIdx - 1];
      const prevEnd = paragraphBreaks[currentParaIdx] ?? words.length;
      result.push({ paraIdx: currentParaIdx - 1, startWord: prevStart, endWord: prevEnd, isCurrent: false });
    }

    // Current paragraph
    const curStart = paragraphBreaks[currentParaIdx] ?? 0;
    const curEnd = paragraphBreaks[currentParaIdx + 1] ?? words.length;
    result.push({ paraIdx: currentParaIdx, startWord: curStart, endWord: curEnd, isCurrent: true });

    // Next paragraph
    if (currentParaIdx + 1 < paragraphBreaks.length) {
      const nextStart = paragraphBreaks[currentParaIdx + 1];
      const nextEnd = paragraphBreaks[currentParaIdx + 2] ?? words.length;
      result.push({ paraIdx: currentParaIdx + 1, startWord: nextStart, endWord: nextEnd, isCurrent: false });
    }

    return result;
  }, [currentParaIdx, paragraphBreaks, words.length]);

  // Auto-scroll to keep active word visible
  useEffect(() => {
    activeWordRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
  }, [wordIndex]);

  if (words.length === 0 || paragraphBreaks.length === 0) return null;

  return (
    <div className="w-full max-w-lg max-h-[40vh] overflow-y-auto rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-5 py-4 text-sm leading-relaxed scroll-smooth">
      {visibleParagraphs.map((para) => (
        <p
          key={para.paraIdx}
          className={`mb-3 last:mb-0 transition-opacity duration-300 ${
            para.isCurrent ? "opacity-60" : "opacity-25"
          }`}
        >
          {words.slice(para.startWord, para.endWord).map((word, i) => {
            const globalIdx = para.startWord + i;
            const isActive = globalIdx === wordIndex;
            return (
              <span key={globalIdx}>
                {i > 0 && " "}
                <span
                  ref={isActive ? activeWordRef : undefined}
                  className={
                    isActive
                      ? "text-foreground opacity-100 bg-yellow-500/25 rounded px-0.5 -mx-0.5"
                      : ""
                  }
                >
                  {word}
                </span>
              </span>
            );
          })}
        </p>
      ))}
    </div>
  );
}
