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
  const [activeVisible, setActiveVisible] = useState(true);
  const userScrolledRef = useRef(false);

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

  // Check if the active word is visible in the scroll container
  const checkActiveVisible = useCallback(() => {
    if (!activeWordRef.current || !containerRef.current) {
      setActiveVisible(true);
      return;
    }
    const container = containerRef.current.getBoundingClientRect();
    const word = activeWordRef.current.getBoundingClientRect();
    const visible = word.top >= container.top - 10 && word.bottom <= container.bottom + 10;
    setActiveVisible(visible);
  }, []);

  // Track user scrolling
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onScroll() {
      userScrolledRef.current = true;
      checkActiveVisible();
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [checkActiveVisible]);

  // When wordIndex changes, check visibility but don't auto-scroll
  useEffect(() => {
    checkActiveVisible();
  }, [wordIndex, checkActiveVisible]);

  function scrollToActive() {
    activeWordRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    setActiveVisible(true);
    userScrolledRef.current = false;
  }

  function handleWordClick(idx: number) {
    onWordClick(idx);
    // After clicking a word, scroll to it
    requestAnimationFrame(() => {
      activeWordRef.current?.scrollIntoView?.({ block: "center", behavior: "smooth" });
      setActiveVisible(true);
      userScrolledRef.current = false;
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

      {/* Jump back to active word indicator */}
      {!activeVisible && (
        <button
          onClick={scrollToActive}
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
