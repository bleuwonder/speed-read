import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import os from "os";
import { parseBook } from "@/lib/parser";
import { insertBook, listBooks } from "@/lib/queries";

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

  const ext = path.extname(file.name).toLowerCase().replace(".", "");
  if (ext !== "epub" && ext !== "pdf") {
    return NextResponse.json(
      { error: "Unsupported format. Only EPUB and PDF are accepted." },
      { status: 400 }
    );
  }

  const tmpDir = path.join(os.tmpdir(), "speed-read-uploads");
  await mkdir(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${Date.now()}-${file.name}`);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(tmpPath, buffer);

  try {
    const parsed = await parseBook(tmpPath, ext as "epub" | "pdf");
    const book = insertBook(parsed, file.name, ext as "epub" | "pdf");
    return NextResponse.json(book, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse file";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
