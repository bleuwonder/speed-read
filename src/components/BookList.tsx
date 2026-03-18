"use client";

import Link from "next/link";

interface Book {
  id: string;
  title: string;
  author: string | null;
  format: string;
  total_words: number;
  progress_pct: number;
}

interface BookListProps {
  books: Book[];
}

export default function BookList({ books }: BookListProps) {
  if (books.length === 0) {
    return (
      <p className="text-foreground/50 text-center py-12">
        No books yet. Upload an EPUB or PDF to get started.
      </p>
    );
  }

  return (
    <ul className="grid gap-3">
      {books.map((book) => (
        <li key={book.id}>
          <Link
            href={`/read/${book.id}`}
            className="block rounded-lg border border-foreground/10 p-4 hover:bg-foreground/5 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-medium truncate">{book.title}</h2>
                {book.author && (
                  <p className="text-sm text-foreground/60 truncate">{book.author}</p>
                )}
                <p className="text-xs text-foreground/40 mt-1">
                  {book.format.toUpperCase()} &middot;{" "}
                  {book.total_words.toLocaleString()} words
                </p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-sm font-mono">{Math.round(book.progress_pct)}%</span>
                <div className="w-20 h-1.5 bg-foreground/10 rounded-full mt-1">
                  <div
                    className="h-full bg-foreground/60 rounded-full transition-all"
                    style={{ width: `${book.progress_pct}%` }}
                  />
                </div>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
