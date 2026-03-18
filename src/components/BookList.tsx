"use client";

import { useState } from "react";
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
  onBooksChanged: () => void;
}

interface DeleteDialogState {
  bookId: string;
  bookTitle: string;
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export default function BookList({ books, onBooksChanged }: BookListProps) {
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (books.length === 0) {
    return (
      <p className="text-foreground/50 text-center py-12">
        No books yet. Upload an EPUB or PDF to get started.
      </p>
    );
  }

  async function handleDelete(keepProgress: boolean) {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      const url = `/api/books/${deleteDialog.bookId}${keepProgress ? "?keepProgress=true" : ""}`;
      await fetch(url, { method: "DELETE" });
      onBooksChanged();
    } finally {
      setDeleting(false);
      setDeleteDialog(null);
    }
  }

  return (
    <>
      <ul className="grid gap-3">
        {books.map((book) => (
          <li key={book.id}>
            <div className="flex items-center rounded-lg border border-foreground/10 hover:bg-foreground/5 transition-colors">
              <Link
                href={`/read/${book.id}`}
                className="flex-1 p-4 min-w-0"
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
              <button
                onClick={() => setDeleteDialog({ bookId: book.id, bookTitle: book.title })}
                className="p-4 text-foreground/30 hover:text-red-500 transition-colors shrink-0"
                aria-label={`Delete ${book.title}`}
              >
                <TrashIcon />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Delete confirmation dialog */}
      {deleteDialog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-label="Delete confirmation"
        >
          <div className="bg-background border border-foreground/10 rounded-lg p-6 max-w-sm w-full shadow-lg">
            <h3 className="font-medium mb-2">Delete book?</h3>
            <p className="text-sm text-foreground/60 mb-5">
              &ldquo;{deleteDialog.bookTitle}&rdquo;
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => handleDelete(false)}
                disabled={deleting}
                className="w-full rounded bg-red-600 text-white px-4 py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete book and all data"}
              </button>
              <button
                onClick={() => handleDelete(true)}
                disabled={deleting}
                className="w-full rounded border border-foreground/20 px-4 py-2 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete book and keep progress"}
              </button>
              <button
                onClick={() => setDeleteDialog(null)}
                disabled={deleting}
                className="w-full rounded px-4 py-2 text-sm text-foreground/50 hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
