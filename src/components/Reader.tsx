"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ContextPanel from "./ContextPanel";

interface ReaderProps {
  bookId: string;
  initialChapterIndex: number;
  initialWordIndex: number;
  initialWpm: number;
  totalChapters: number;
  chapterTitles: string[];
}

function getOrpIndex(word: string): number {
  const len = word.length;
  if (len <= 1) return 0;
  if (len <= 5) return Math.floor(len / 2) - 1;
  return Math.floor(len * 0.33);
}

function ContextToggleIcon({ active }: { active: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.5 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="3" y1="14" x2="18" y2="14" />
      <line x1="3" y1="18" x2="15" y2="18" />
    </svg>
  );
}

export default function Reader({
  bookId,
  initialChapterIndex,
  initialWordIndex,
  initialWpm,
  totalChapters,
  chapterTitles,
}: ReaderProps) {
  const [words, setWords] = useState<string[]>([]);
  const [paragraphBreaks, setParagraphBreaks] = useState<number[]>([]);
  const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
  const [wordIndex, setWordIndex] = useState(initialWordIndex);
  const [wpm, setWpm] = useState(initialWpm);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingChapter, setPendingChapter] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wordIndexRef = useRef(wordIndex);
  const chapterIndexRef = useRef(chapterIndex);
  const wpmRef = useRef(wpm);

  wordIndexRef.current = wordIndex;
  chapterIndexRef.current = chapterIndex;
  wpmRef.current = wpm;

  const loadChapter = useCallback(
    async (idx: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/books/${bookId}/chapters/${idx}`);
        if (!res.ok) return false;
        const data = await res.json();
        const chapterWords = data.words as string[];
        if (chapterWords.length === 0) {
          if (idx < totalChapters - 1) {
            setChapterIndex(idx + 1);
            return loadChapter(idx + 1);
          }
        }
        setWords(chapterWords);
        setParagraphBreaks(data.paragraphBreaks || [0]);
        return true;
      } finally {
        setLoading(false);
      }
    },
    [bookId, totalChapters]
  );

  const saveProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/books/${bookId}/progress`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_chapter_index: chapterIndexRef.current,
          current_word_in_chapter: wordIndexRef.current,
          wpm: wpmRef.current,
        }),
      });
      setSaveError(!res.ok);
    } catch {
      setSaveError(true);
    }
  }, [bookId]);

  useEffect(() => {
    loadChapter(chapterIndex);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (pendingChapter === null) return;
    const nextCh = pendingChapter;
    setPendingChapter(null);
    setChapterIndex(nextCh);
    setWordIndex(0);
    loadChapter(nextCh);
  }, [pendingChapter, loadChapter]);

  useEffect(() => {
    if (playing) {
      saveTimerRef.current = setInterval(saveProgress, 5000);
    }
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [playing, saveProgress]);

  useEffect(() => {
    if (!playing || loading || words.length === 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    const ms = 60000 / wpm;
    intervalRef.current = setInterval(() => {
      setWordIndex((prev) => {
        const next = prev + 1;
        if (next >= words.length) {
          if (chapterIndexRef.current < totalChapters - 1) {
            setPendingChapter(chapterIndexRef.current + 1);
            return 0;
          } else {
            setPlaying(false);
            saveProgress();
            return prev;
          }
        }
        return next;
      });
    }, ms);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, loading, wpm, words.length, totalChapters, saveProgress]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (p) saveProgress();
      return !p;
    });
  }, [saveProgress]);

  const jumpToChapter = useCallback(
    async (idx: number) => {
      setPlaying(false);
      setChapterIndex(idx);
      setWordIndex(0);
      await loadChapter(idx);
      saveProgress();
    },
    [loadChapter, saveProgress]
  );

  const skipWords = useCallback(
    (delta: number) => {
      setWordIndex((prev) => Math.max(0, Math.min(prev + delta, words.length - 1)));
    },
    [words.length]
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        skipWords(1);
      } else if (e.key === "ArrowLeft") {
        skipWords(-1);
      } else if (e.key === "c" || e.key === "C") {
        setShowContext((s) => !s);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [togglePlay, skipWords]);

  const currentWord = words[wordIndex] || "";
  const orpIdx = getOrpIndex(currentWord);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 sm:gap-6 px-4 select-none">
      {/* Context panel — above the word display */}
      {showContext && !loading && (
        <ContextPanel
          words={words}
          paragraphBreaks={paragraphBreaks}
          wordIndex={wordIndex}
        />
      )}

      {/* Word display */}
      <div className="relative">
        <div
          className="text-3xl sm:text-5xl font-mono tracking-wider min-h-[1.5em] flex items-center justify-center"
          aria-live={playing ? "off" : "polite"}
          aria-label={`Current word: ${currentWord}`}
          data-testid="word-display"
        >
          {loading ? (
            <span className="text-foreground/30">Loading...</span>
          ) : (
            <span>
              <span>{currentWord.slice(0, orpIdx)}</span>
              <span className="text-red-500">{currentWord[orpIdx] || ""}</span>
              <span>{currentWord.slice(orpIdx + 1)}</span>
            </span>
          )}
        </div>
        {/* Context toggle — sits in the top-right of the word display area */}
        <button
          onClick={() => setShowContext((s) => !s)}
          className={`absolute -top-1 -right-8 sm:-right-10 p-1.5 rounded transition-colors ${
            showContext
              ? "text-foreground/70 bg-foreground/10"
              : "text-foreground/20 hover:text-foreground/50"
          }`}
          aria-label={showContext ? "Hide context" : "Show context"}
          title="Toggle paragraph context (C)"
        >
          <ContextToggleIcon active={showContext} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        <button
          onClick={togglePlay}
          className="rounded-full bg-foreground text-background w-14 h-14 text-xl font-bold"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "||" : "\u25B6"}
        </button>

        <div className="flex items-center gap-3 w-full">
          <span className="text-xs text-foreground/50 w-8">100</span>
          <input
            type="range"
            min={100}
            max={1000}
            step={25}
            value={wpm}
            onChange={(e) => setWpm(Number(e.target.value))}
            className="flex-1"
            aria-label="Words per minute"
          />
          <span className="text-xs text-foreground/50 w-10">1000</span>
        </div>
        <span className="text-sm font-mono" data-testid="wpm-display">{wpm} WPM</span>

        <select
          value={chapterIndex}
          onChange={(e) => jumpToChapter(Number(e.target.value))}
          className="bg-transparent border border-foreground/20 rounded px-3 py-1.5 text-sm w-full"
          aria-label="Chapter"
        >
          {chapterTitles.map((title, i) => (
            <option key={i} value={i}>
              {title}
            </option>
          ))}
        </select>

        <p className="text-xs text-foreground/40">
          Word {wordIndex + 1} of {words.length} in chapter {chapterIndex + 1}/{totalChapters}
          {saveError && <span className="text-red-500 ml-2">Save failed</span>}
        </p>
      </div>
    </div>
  );
}
