import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "./db";

describe("database schema", () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.pragma("foreign_keys = ON");
    migrate(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates books table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it("creates chapters table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chapters'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it("creates reading_progress table", () => {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='reading_progress'")
      .all();
    expect(tables).toHaveLength(1);
  });

  it("inserts and retrieves a book", () => {
    db.prepare(
      "INSERT INTO books (id, title, author, filename, format, total_words) VALUES (?, ?, ?, ?, ?, ?)"
    ).run("book-1", "Test Book", "Author", "test.epub", "epub", 1000);

    const book = db.prepare("SELECT * FROM books WHERE id = ?").get("book-1") as Record<string, unknown>;
    expect(book.title).toBe("Test Book");
    expect(book.total_words).toBe(1000);
  });

  it("inserts chapters with unique book_id + chapter_index constraint", () => {
    db.prepare(
      "INSERT INTO books (id, title, filename, format, total_words) VALUES (?, ?, ?, ?, ?)"
    ).run("book-1", "Test", "test.epub", "epub", 100);

    db.prepare(
      "INSERT INTO chapters (id, book_id, chapter_index, title, word_offset, word_count, words) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("ch-1", "book-1", 0, "Chapter 1", 0, 50, JSON.stringify(["word1", "word2"]));

    expect(() => {
      db.prepare(
        "INSERT INTO chapters (id, book_id, chapter_index, title, word_offset, word_count, words) VALUES (?, ?, ?, ?, ?, ?, ?)"
      ).run("ch-2", "book-1", 0, "Duplicate", 0, 50, "[]");
    }).toThrow();
  });

  it("cascades delete from book to chapters and progress", () => {
    db.prepare(
      "INSERT INTO books (id, title, filename, format, total_words) VALUES (?, ?, ?, ?, ?)"
    ).run("book-1", "Test", "test.epub", "epub", 100);

    db.prepare(
      "INSERT INTO chapters (id, book_id, chapter_index, title, word_offset, word_count, words) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run("ch-1", "book-1", 0, "Ch1", 0, 100, "[]");

    db.prepare(
      "INSERT INTO reading_progress (book_id, current_chapter_index, current_word_in_chapter, wpm) VALUES (?, ?, ?, ?)"
    ).run("book-1", 0, 25, 300);

    db.prepare("DELETE FROM books WHERE id = ?").run("book-1");

    const chapters = db.prepare("SELECT * FROM chapters WHERE book_id = ?").all("book-1");
    const progress = db.prepare("SELECT * FROM reading_progress WHERE book_id = ?").all("book-1");
    expect(chapters).toHaveLength(0);
    expect(progress).toHaveLength(0);
  });

  it("migrate is idempotent", () => {
    expect(() => migrate(db)).not.toThrow();
  });
});
