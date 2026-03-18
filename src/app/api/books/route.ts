import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import os from "os";
import { v4 as uuid } from "uuid";
import { parseBook } from "@/lib/parser";
import { insertBook, listBooks } from "@/lib/queries";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function GET() {
  const books = listBooks();
  return NextResponse.json(books);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` },
      { status: 400 }
    );
  }

  const ext = path.extname(file.name).toLowerCase().replace(".", "");
  if (ext !== "epub" && ext !== "pdf") {
    return NextResponse.json(
      { error: "Unsupported format. Only EPUB and PDF are accepted." },
      { status: 400 }
    );
  }

  const tmpDir = path.join(os.tmpdir(), "speed-read-uploads");
  await mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${uuid()}.${ext}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(tmpPath, buffer);

  try {
    const parsed = await parseBook(tmpPath, ext as "epub" | "pdf");

    const totalWords = parsed.chapters.reduce((sum, ch) => sum + ch.words.length, 0);
    if (totalWords === 0) {
      return NextResponse.json(
        { error: "Could not extract any text from this file." },
        { status: 422 }
      );
    }

    const book = insertBook(parsed, file.name, ext as "epub" | "pdf");
    return NextResponse.json(book, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse file";
    return NextResponse.json({ error: message }, { status: 422 });
  } finally {
    unlink(tmpPath).catch(() => {});
  }
}
