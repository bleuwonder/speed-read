"use client";

import { useState, useRef, useCallback } from "react";

interface UploadFormProps {
  onUploadComplete: () => void;
}

export default function UploadForm({ onUploadComplete }: UploadFormProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
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
  }, [onUploadComplete]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
  }

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !uploading && fileRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        aria-label="Upload book file"
        className={`
          relative flex items-center justify-center rounded-lg border-2 border-dashed
          px-6 py-8 cursor-pointer transition-colors
          ${dragOver
            ? "border-foreground/40 bg-foreground/5"
            : "border-foreground/15 hover:border-foreground/30 hover:bg-foreground/[0.02]"
          }
          ${uploading ? "pointer-events-none opacity-60" : ""}
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".epub,.pdf"
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
        <div className="text-center">
          {uploading ? (
            <p className="text-sm text-foreground/50">Uploading...</p>
          ) : (
            <>
              <p className="text-sm text-foreground/60">
                Drop an EPUB or PDF here, or <span className="underline text-foreground/80">click to browse</span>
              </p>
            </>
          )}
        </div>
      </div>
      {error && <p role="alert" className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
}
