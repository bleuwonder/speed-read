"use client";

import { useMemo, useRef, useEffect, useState, useCallback } from "react";

interface ContextPanelProps {
  words: string[];
  paragraphBreaks: number[];
  wordIndex: number;
  onWordClick: (index: number) => void;
}

function getParagraphForWord(wordIndex: number, paragraphBreaks: number[]): number {
  let paraIdx = 0;
  for (let i = 1; i < paragraphBreaks.length; i++) {
    if (paragraphBreaks[i] > wordIndex) break;
    paraIdx = i;
  }
  return paraIdx;
}

export default function ContextPanel({ words, paragraphBreaks, wordIndex, onWordClick }: ContextPanelProps) {
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [userDetached, setUserDetached] = useState(false);
  const programmaticScrollRef = useRef(false);

  const currentParaIdx = useMemo(
    () => getParagraphForWord(wordIndex, paragraphBreaks),
    [wordIndex, paragraphBreaks]
  );

  const visibleParagraphs = useMemo(() => {
    const result: { paraIdx: number; startWord: number; endWord: number; isCurrent: boolean }[] = [];

    if (currentParaIdx > 0) {
      const prevStart = paragraphBreaks[currentParaIdx - 1];
      const prevEnd = paragraphBreaks[currentParaIdx] ?? words.length;
      result.push({ paraIdx: currentParaIdx - 1, startWord: prevStart, endWord: prevEnd, isCurrent: false });
    }

    const curStart = paragraphBreaks[currentParaIdx] ?? 0;
    const curEnd = paragraphBreaks[currentParaIdx + 1] ?? words.length;
    result.push({ paraIdx: currentParaIdx, startWord: curStart, endWord: curEnd, isCurrent: true });

    if (currentParaIdx + 1 < paragraphBreaks.length) {
      const nextStart = paragraphBreaks[currentParaIdx + 1];
      const nextEnd = paragraphBreaks[currentParaIdx + 2] ?? words.length;
      result.push({ paraIdx: currentParaIdx + 1, startWord: nextStart, endWord: nextEnd, isCurrent: false });
    }

    return result;
  }, [currentParaIdx, paragraphBreaks, words.length]);

  // Detect user scroll vs programmatic scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onScroll() {
      if (programmaticScrollRef.current) return;
      // User scrolled manually — detach auto-follow
      setUserDetached(true);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const smoothScrollToActive = useCallback(() => {
    if (!activeWordRef.current || !containerRef.current) return;
    programmaticScrollRef.current = true;
    activeWordRef.current.scrollIntoView?.({ block: "center", behavior: "smooth" });
    // Reset flag after scroll animation settles
    setTimeout(() => { programmaticScrollRef.current = false; }, 300);
  }, []);

  // Auto-scroll to keep active word centered — unless user has detached
  useEffect(() => {
    if (userDetached) return;
    smoothScrollToActive();
  }, [wordIndex, userDetached, smoothScrollToActive]);

  function reattach() {
    setUserDetached(false);
    smoothScrollToActive();
  }

  function handleWordClick(idx: number) {
    onWordClick(idx);
    setUserDetached(false);
    requestAnimationFrame(() => {
      smoothScrollToActive();
    });
  }

  if (words.length === 0 || paragraphBreaks.length === 0) return null;

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="context-panel-scroll w-full h-full overflow-y-auto rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-5 py-4 text-sm leading-relaxed"
      >
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
                    onClick={() => handleWordClick(globalIdx)}
                    className={`cursor-pointer hover:bg-foreground/10 rounded ${
                      isActive
                        ? "text-foreground opacity-100 bg-yellow-500/25 px-0.5 -mx-0.5"
                        : ""
                    }`}
                  >
                    {word}
                  </span>
                </span>
              );
            })}
          </p>
        ))}
      </div>

      {userDetached && (
        <button
          onClick={reattach}
          className="absolute bottom-2 right-2 p-1.5 rounded-md bg-foreground/10 hover:bg-foreground/20 text-foreground/50 hover:text-foreground/80 transition-colors"
          aria-label="Jump to current word"
          title="Jump to current word"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
    </div>
  );
}
