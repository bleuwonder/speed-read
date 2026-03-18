"use client";

import { use } from "react";

export default function ReaderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen">
      <p className="text-foreground/50">Reader for book {id} — coming soon</p>
    </main>
  );
}
