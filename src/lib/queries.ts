import { getDb } from "./db";
import { v4 as uuid } from "uuid";
import type { ParsedBook } from "./parser/types";

export interface BookRow {
  id: string;
  title: string;
  author: string | null;
  filename: string;
  format: string;
  total_words: number;
  created_at: string;
}

export interface ChapterRow {
  id: string;
  book_id: string;
  chapter_index: number;
  title: string | null;
  word_offset: number;
  word_count: number;
  words: string;
}

export interface ProgressRow {
  book_id: string;
  current_chapter_index: number;
  current_word_in_chapter: number;
  wpm: number;
  updated_at: string;
}

export function insertBook(
  parsed: ParsedBook,
  filename: string,
  format: "epub" | "pdf"
): BookRow {
  const db = getDb();
  const bookId = uuid();
  const totalWords = parsed.chapters.reduce((sum, ch) => sum + ch.words.length, 0);

  const insertBookStmt = db.prepare(
    "INSERT INTO books (id, title, author, filename, format, total_words) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertChapterStmt = db.prepare(
    "INSERT INTO chapters (id, book_id, chapter_index, title, word_offset, word_count, words) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  const insert = db.transaction(() => {
    insertBookStmt.run(bookId, parsed.title, parsed.author, filename, format, totalWords);

    let wordOffset = 0;
    for (let i = 0; i < parsed.chapters.length; i++) {
      const ch = parsed.chapters[i];
      insertChapterStmt.run(
        uuid(),
        bookId,
        i,
        ch.title,
        wordOffset,
        ch.words.length,
        JSON.stringify(ch.words)
      );
      wordOffset += ch.words.length;
    }
  });

  insert();

  return db.prepare("SELECT * FROM books WHERE id = ?").get(bookId) as BookRow;
}

export function listBooks(): (BookRow & { progress_pct: number })[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT b.*,
       COALESCE(
         ROUND(
           (COALESCE(
             (SELECT SUM(c.word_count) FROM chapters c
              WHERE c.book_id = b.id AND c.chapter_index < COALESCE(rp.current_chapter_index, 0))
             + COALESCE(rp.current_word_in_chapter, 0), 0)
           ) * 100.0 / NULLIF(b.total_words, 0), 1
         ), 0
       ) as progress_pct
       FROM books b
       LEFT JOIN reading_progress rp ON rp.book_id = b.id
       ORDER BY b.created_at DESC`
    )
    .all() as (BookRow & { progress_pct: number })[];
}

export function getBook(id: string): BookRow | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM books WHERE id = ?").get(id) as BookRow | undefined;
}

export function getBookChapters(bookId: string): Omit<ChapterRow, "words">[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT id, book_id, chapter_index, title, word_offset, word_count FROM chapters WHERE book_id = ? ORDER BY chapter_index"
    )
    .all(bookId) as Omit<ChapterRow, "words">[];
}

export function getChapterWords(bookId: string, chapterIndex: number): string[] | null {
  const db = getDb();
  const row = db
    .prepare("SELECT words FROM chapters WHERE book_id = ? AND chapter_index = ?")
    .get(bookId, chapterIndex) as { words: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.words);
}

export function deleteBook(id: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM books WHERE id = ?").run(id);
  return result.changes > 0;
}

export function resetProgress(bookId: string): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM reading_progress WHERE book_id = ?").run(bookId);
  return result.changes > 0;
}

export function getProgress(bookId: string): ProgressRow | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM reading_progress WHERE book_id = ?")
    .get(bookId) as ProgressRow | undefined;
}

export function upsertProgress(
  bookId: string,
  chapterIndex: number,
  wordInChapter: number,
  wpm: number
): ProgressRow {
  const db = getDb();
  db.prepare(
    `INSERT INTO reading_progress (book_id, current_chapter_index, current_word_in_chapter, wpm, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(book_id) DO UPDATE SET
       current_chapter_index = excluded.current_chapter_index,
       current_word_in_chapter = excluded.current_word_in_chapter,
       wpm = excluded.wpm,
       updated_at = datetime('now')`
  ).run(bookId, chapterIndex, wordInChapter, wpm);

  return db
    .prepare("SELECT * FROM reading_progress WHERE book_id = ?")
    .get(bookId) as ProgressRow;
}
