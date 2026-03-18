"use client";

import { useState, useRef } from "react";

interface UploadFormProps {
  onUploadComplete: () => void;
}

export default function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "epub" && ext !== "pdf") {
      setError("Only EPUB and PDF files are supported.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/books", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      if (fileRef.current) fileRef.current.value = "";
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept=".epub,.pdf"
        aria-label="Select book file"
        className="file:mr-3 file:rounded file:border-0 file:bg-foreground/10 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-foreground/20 cursor-pointer"
      />
      <button
        type="submit"
        disabled={uploading}
        className="rounded bg-foreground text-background px-4 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
      {error && <span role="alert" className="text-red-500 text-sm">{error}</span>}
    </form>
  );
}
