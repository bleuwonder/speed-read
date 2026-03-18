import { NextRequest, NextResponse } from "next/server";
import { getBook, getBookChapters, deleteBook, deleteBookKeepProgress } from "@/lib/queries";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const book = getBook(id);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  const chapters = getBookChapters(id);
  return NextResponse.json({ ...book, chapters });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const keepProgress = request.nextUrl.searchParams.get("keepProgress") === "true";

  const book = getBook(id);
  if (!book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  if (keepProgress) {
    deleteBookKeepProgress(id);
    return NextResponse.json({ ok: true, action: "deleted_kept_progress" });
  }

  deleteBook(id);
  return NextResponse.json({ ok: true, action: "deleted" });
}
