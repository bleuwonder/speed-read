import { NextRequest, NextResponse } from "next/server";
import { getBook, getProgress, upsertProgress } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = getBook(id);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const progress = getProgress(id);
  return NextResponse.json(
    progress || {
      book_id: id,
      current_chapter_index: 0,
      current_word_in_chapter: 0,
      wpm: 300,
      updated_at: null,
    }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = getBook(id);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const body = await request.json();
  const { current_chapter_index, current_word_in_chapter, wpm } = body;

  if (
    typeof current_chapter_index !== "number" ||
    typeof current_word_in_chapter !== "number" ||
    typeof wpm !== "number"
  ) {
    return NextResponse.json(
      { error: "Missing required fields: current_chapter_index, current_word_in_chapter, wpm" },
      { status: 400 }
    );
  }

  const progress = upsertProgress(id, current_chapter_index, current_word_in_chapter, wpm);
  return NextResponse.json(progress);
}
