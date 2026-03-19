"use client";

import { useMemo, useRef, useEffect, useLayoutEffect, useState, useCallback } from "react";

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
  const [halfHeight, setHalfHeight] = useState(0);

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

  // Measure container half-height for top/bottom padding (so first/last word can center)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setHalfHeight(Math.floor(container.clientHeight / 2));
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      setHalfHeight(Math.floor(container.clientHeight / 2));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Detect user scroll vs programmatic scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onScroll() {
      if (programmaticScrollRef.current) return;
      setUserDetached(true);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const centerActiveWord = useCallback((smooth: boolean) => {
    const container = containerRef.current;
    const word = activeWordRef.current;
    if (!container || !word) return;

    const wordTop = word.offsetTop;
    const wordHeight = word.offsetHeight;
    const targetScroll = wordTop - container.clientHeight / 2 + wordHeight / 2;

    programmaticScrollRef.current = true;

    if (smooth) {
      container.scrollTo({ top: targetScroll, behavior: "smooth" });
      setTimeout(() => { programmaticScrollRef.current = false; }, 400);
    } else {
      container.scrollTop = targetScroll;
      programmaticScrollRef.current = false;
    }
  }, []);

  // useLayoutEffect fires synchronously after DOM update but BEFORE browser paint.
  // This means scrollTop is set before the user ever sees the wrong position.
  useLayoutEffect(() => {
    if (userDetached) return;
    centerActiveWord(false);
  }, [wordIndex, userDetached, centerActiveWord]);

  function reattach() {
    setUserDetached(false);
  }

  function handleWordClick(idx: number) {
    onWordClick(idx);
    setUserDetached(false);
  }

  if (words.length === 0 || paragraphBreaks.length === 0) return null;

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="context-panel-scroll w-full h-full overflow-y-auto rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-5 text-sm leading-relaxed"
      >
        {/* Top spacer so the first word can be centered */}
        <div style={{ height: halfHeight }} />

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

        {/* Bottom spacer so the last word can be centered */}
        <div style={{ height: halfHeight }} />
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
