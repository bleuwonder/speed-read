"use client";

import { useMemo, useRef, useLayoutEffect, useState, useEffect, useCallback } from "react";

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [offsetY, setOffsetY] = useState(0);
  const [userDetached, setUserDetached] = useState(false);
  const lastAutoOffsetRef = useRef(0);

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

  // Calculate the translateY needed to center the active word
  const recalcOffset = useCallback(() => {
    const container = containerRef.current;
    const word = activeWordRef.current;
    const content = contentRef.current;
    if (!container || !word || !content) return;

    const containerHeight = container.clientHeight;
    const wordOffsetInContent = word.offsetTop - content.offsetTop;
    const wordHeight = word.offsetHeight;

    // Shift content up so the word sits at vertical center
    const newOffset = -(wordOffsetInContent - containerHeight / 2 + wordHeight / 2);
    setOffsetY(newOffset);
    lastAutoOffsetRef.current = newOffset;
  }, []);

  // Recalc on every word change (before paint)
  useLayoutEffect(() => {
    if (userDetached) return;
    recalcOffset();
  }, [wordIndex, userDetached, recalcOffset]);

  // Detect manual scroll (wheel) to detach
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let scrollDelta = 0;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      scrollDelta += e.deltaY;
      setUserDetached(true);
      setOffsetY((prev) => prev - e.deltaY);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function reattach() {
    setUserDetached(false);
    recalcOffset();
  }

  function handleWordClick(idx: number) {
    onWordClick(idx);
    setUserDetached(false);
  }

  // Check if active word is off-screen (for showing jump-back button)
  const isDetachedFar = useMemo(() => {
    if (!userDetached) return false;
    return Math.abs(offsetY - lastAutoOffsetRef.current) > 50;
  }, [userDetached, offsetY]);

  if (words.length === 0 || paragraphBreaks.length === 0) return null;

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-5 text-sm leading-relaxed"
      >
        <div
          ref={contentRef}
          style={{ transform: `translateY(${offsetY}px)` }}
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
      </div>

      {isDetachedFar && (
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
