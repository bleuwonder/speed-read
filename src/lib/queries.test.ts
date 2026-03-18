import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { migrate } from "./db";
import type { ParsedBook } from "./parser/types";

// Mock getDb to use in-memory database
let testDb: Database.Database;

vi.mock("./db", async () => {
  const actual = await vi.importActual("./db");
  return {
    ...actual,
    getDb: () => testDb,
  };
});

import {
  insertBook,
  listBooks,
  getBook,
  getBookChapters,
  getChapterWords,
  deleteBook,
  getProgress,
  upsertProgress,
} from "./queries";

const sampleBook: ParsedBook = {
  title: "Test Book",
  author: "Test Author",
  chapters: [
    { title: "Chapter One", words: ["the", "quick", "brown", "fox"] },
    { title: "Chapter Two", words: ["speed", "reading", "is", "fun", "and", "fast"] },
  ],
};

describe("queries", () => {
  beforeEach(() => {
    testDb = new Database(":memory:");
    testDb.pragma("foreign_keys = ON");
    migrate(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  describe("insertBook", () => {
    it("inserts a book and returns the row", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      expect(book.title).toBe("Test Book");
      expect(book.author).toBe("Test Author");
      expect(book.filename).toBe("test.epub");
      expect(book.format).toBe("epub");
      expect(book.total_words).toBe(10);
      expect(book.id).toBeTruthy();
    });

    it("inserts chapters with correct word offsets", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      const chapters = getBookChapters(book.id);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].word_offset).toBe(0);
      expect(chapters[0].word_count).toBe(4);
      expect(chapters[1].word_offset).toBe(4);
      expect(chapters[1].word_count).toBe(6);
    });
  });

  describe("listBooks", () => {
    it("returns empty array when no books", () => {
      expect(listBooks()).toEqual([]);
    });

    it("returns books with progress percentage", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      const books = listBooks();
      expect(books).toHaveLength(1);
      expect(books[0].id).toBe(book.id);
      expect(books[0].progress_pct).toBe(0);
    });

    it("calculates progress percentage correctly", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      // At chapter 1, word 2 means: all of ch0 (4 words) + 2 words = 6/10 = 60%
      upsertProgress(book.id, 1, 2, 300);
      const books = listBooks();
      expect(books[0].progress_pct).toBe(60);
    });
  });

  describe("getBook", () => {
    it("returns book by id", () => {
      const inserted = insertBook(sampleBook, "test.epub", "epub");
      const book = getBook(inserted.id);
      expect(book?.title).toBe("Test Book");
    });

    it("returns undefined for nonexistent id", () => {
      expect(getBook("nonexistent")).toBeUndefined();
    });
  });

  describe("getBookChapters", () => {
    it("returns chapters without words field", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      const chapters = getBookChapters(book.id);
      expect(chapters).toHaveLength(2);
      expect(chapters[0].title).toBe("Chapter One");
      expect(chapters[1].title).toBe("Chapter Two");
      // words field should not be present
      expect((chapters[0] as Record<string, unknown>).words).toBeUndefined();
    });
  });

  describe("getChapterWords", () => {
    it("returns words for a specific chapter", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      const words = getChapterWords(book.id, 0);
      expect(words).toEqual(["the", "quick", "brown", "fox"]);
    });

    it("returns words for second chapter", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      const words = getChapterWords(book.id, 1);
      expect(words).toEqual(["speed", "reading", "is", "fun", "and", "fast"]);
    });

    it("returns null for nonexistent chapter", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      expect(getChapterWords(book.id, 99)).toBeNull();
    });

    it("returns null for nonexistent book", () => {
      expect(getChapterWords("fake", 0)).toBeNull();
    });
  });

  describe("deleteBook", () => {
    it("deletes book and returns true", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      expect(deleteBook(book.id)).toBe(true);
      expect(getBook(book.id)).toBeUndefined();
    });

    it("cascades to chapters and progress", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      upsertProgress(book.id, 0, 2, 300);
      deleteBook(book.id);
      expect(getBookChapters(book.id)).toHaveLength(0);
      expect(getProgress(book.id)).toBeUndefined();
    });

    it("returns false for nonexistent book", () => {
      expect(deleteBook("nonexistent")).toBe(false);
    });
  });

  describe("progress", () => {
    it("returns undefined when no progress exists", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      expect(getProgress(book.id)).toBeUndefined();
    });

    it("upserts new progress", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      const progress = upsertProgress(book.id, 0, 3, 350);
      expect(progress.book_id).toBe(book.id);
      expect(progress.current_chapter_index).toBe(0);
      expect(progress.current_word_in_chapter).toBe(3);
      expect(progress.wpm).toBe(350);
    });

    it("updates existing progress", () => {
      const book = insertBook(sampleBook, "test.epub", "epub");
      upsertProgress(book.id, 0, 1, 300);
      const updated = upsertProgress(book.id, 1, 5, 400);
      expect(updated.current_chapter_index).toBe(1);
      expect(updated.current_word_in_chapter).toBe(5);
      expect(updated.wpm).toBe(400);
    });
  });
});
