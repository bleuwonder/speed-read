"use client";

import { useState, useEffect, useCallback } from "react";
import UploadForm from "@/components/UploadForm";
import BookList from "@/components/BookList";
import ThemeToggle from "@/components/ThemeToggle";

export default function LibraryPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBooks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/books");
      if (!res.ok) throw new Error("Failed to load books");
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load books");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Speed Read</h1>
        <ThemeToggle />
      </div>
      <UploadForm onUploadComplete={fetchBooks} />
      <div className="mt-8">
        {loading ? (
          <p className="text-foreground/50 text-center py-12">Loading...</p>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 mb-2">{error}</p>
            <button
              onClick={fetchBooks}
              className="text-sm underline text-foreground/60"
            >
              Retry
            </button>
          </div>
        ) : (
          <BookList books={books} onBooksChanged={fetchBooks} />
        )}
      </div>
    </main>
  );
}
