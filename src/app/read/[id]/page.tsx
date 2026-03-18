"use client";

import { use, useEffect, useState } from "react";
import Reader from "@/components/Reader";
import Link from "next/link";

interface BookDetail {
  id: string;
  title: string;
  author: string | null;
  total_words: number;
  chapters: { chapter_index: number; title: string; word_count: number }[];
}

interface Progress {
  current_chapter_index: number;
  current_word_in_chapter: number;
  wpm: number;
}

export default function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [book, setBook] = useState<BookDetail | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [bookRes, progressRes] = await Promise.all([
        fetch(`/api/books/${id}`),
        fetch(`/api/books/${id}/progress`),
      ]);

      if (!bookRes.ok) {
        setError("Book not found");
        return;
      }

      setBook(await bookRes.json());
      setProgress(await progressRes.json());
    }
    load();
  }, [id]);

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-500">{error}</p>
        <Link href="/" className="text-sm underline">
          Back to library
        </Link>
      </main>
    );
  }

  if (!book || !progress) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-foreground/50">Loading...</p>
      </main>
    );
  }

  return (
    <>
      <div className="absolute top-4 left-4">
        <Link href="/" className="text-sm text-foreground/50 hover:text-foreground">
          &larr; Library
        </Link>
      </div>
      <div className="absolute top-4 right-4">
        <span className="text-sm text-foreground/50">{book.title}</span>
      </div>
      <Reader
        bookId={id}
        initialChapterIndex={progress.current_chapter_index}
        initialWordIndex={progress.current_word_in_chapter}
        initialWpm={progress.wpm}
        totalChapters={book.chapters.length}
        chapterTitles={book.chapters.map((c) => c.title || `Chapter ${c.chapter_index + 1}`)}
      />
    </>
  );
}
