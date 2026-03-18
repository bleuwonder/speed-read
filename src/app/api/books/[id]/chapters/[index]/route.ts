import { NextRequest, NextResponse } from "next/server";
import { getBook, getChapterWords } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; index: string }> }
) {
  const { id, index } = await params;
  const chapterIndex = parseInt(index, 10);

  if (isNaN(chapterIndex) || chapterIndex < 0) {
    return NextResponse.json({ error: "Invalid chapter index" }, { status: 400 });
  }

  const book = getBook(id);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const words = getChapterWords(id, chapterIndex);
  if (!words) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  return NextResponse.json({ words });
}
