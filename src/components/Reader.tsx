"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

export default function Reader({
  bookId,
  initialChapterIndex,
  initialWordIndex,
  initialWpm,
  totalChapters,
  chapterTitles,
}: ReaderProps) {
  const [words, setWords] = useState<string[]>([]);
  const [chapterIndex, setChapterIndex] = useState(initialChapterIndex);
  const [wordIndex, setWordIndex] = useState(initialWordIndex);
  const [wpm, setWpm] = useState(initialWpm);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
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
        setWords(data.words);
        return true;
      } finally {
        setLoading(false);
      }
    },
    [bookId]
  );

  const saveProgress = useCallback(async () => {
    await fetch(`/api/books/${bookId}/progress`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        current_chapter_index: chapterIndexRef.current,
        current_word_in_chapter: wordIndexRef.current,
        wpm: wpmRef.current,
      }),
    });
  }, [bookId]);

  // Load initial chapter
  useEffect(() => {
    loadChapter(chapterIndex);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save every 5s while playing
  useEffect(() => {
    if (playing) {
      saveTimerRef.current = setInterval(saveProgress, 5000);
    }
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [playing, saveProgress]);

  // Word advancement
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
          // End of chapter — try next
          if (chapterIndexRef.current < totalChapters - 1) {
            const nextChapter = chapterIndexRef.current + 1;
            setChapterIndex(nextChapter);
            loadChapter(nextChapter);
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
  }, [playing, loading, wpm, words.length, totalChapters, loadChapter, saveProgress]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      if (p) saveProgress(); // save on pause
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

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        skipWords(1);
      } else if (e.key === "ArrowLeft") {
        skipWords(-1);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [togglePlay, skipWords]);

  const currentWord = words[wordIndex] || "";
  const orpIdx = getOrpIndex(currentWord);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 sm:gap-8 px-4 select-none">
      {/* Word display */}
      <div
        className="text-3xl sm:text-5xl font-mono tracking-wider min-h-[1.5em] flex items-center justify-center"
        aria-live="polite"
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

      {/* Controls */}
      <div className="flex flex-col items-center gap-4 w-full max-w-md">
        {/* Play/Pause */}
        <button
          onClick={togglePlay}
          className="rounded-full bg-foreground text-background w-14 h-14 text-xl font-bold"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "||" : "\u25B6"}
        </button>

        {/* WPM slider */}
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

        {/* Chapter selector */}
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

        {/* Position info */}
        <p className="text-xs text-foreground/40">
          Word {wordIndex + 1} of {words.length} in chapter {chapterIndex + 1}/{totalChapters}
        </p>
      </div>
    </div>
  );
}
