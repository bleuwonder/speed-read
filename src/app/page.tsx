"use client";

import { useState, useEffect, useCallback } from "react";
import UploadForm from "@/components/UploadForm";
import BookList from "@/components/BookList";

export default function LibraryPage() {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    try {
      const res = await fetch("/api/books");
      const data = await res.json();
      setBooks(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8 w-full">
      <h1 className="text-2xl font-bold mb-6">Speed Read</h1>
      <UploadForm onUploadComplete={fetchBooks} />
      <div className="mt-8">
        {loading ? (
          <p className="text-foreground/50 text-center py-12">Loading...</p>
        ) : (
          <BookList books={books} />
        )}
      </div>
    </main>
  );
}
