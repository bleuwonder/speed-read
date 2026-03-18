import { describe, it, expect } from "vitest";
import path from "path";
import { parseEpub } from "./epub";
import { parsePdf } from "./pdf";
import { parseBook } from "./index";

const FIXTURES = path.join(__dirname, "../../test/fixtures");

describe("EPUB parser", () => {
  it("extracts title and author", async () => {
    const book = await parseEpub(path.join(FIXTURES, "test.epub"));
    expect(book.title).toBe("Test Book");
    expect(book.author).toBe("Test Author");
  });

  it("extracts chapters with words", async () => {
    const book = await parseEpub(path.join(FIXTURES, "test.epub"));
    expect(book.chapters.length).toBeGreaterThanOrEqual(2);
    expect(book.chapters[0].words.length).toBeGreaterThan(0);
    expect(book.chapters[1].words.length).toBeGreaterThan(0);
  });

  it("strips HTML tags from chapter content", async () => {
    const book = await parseEpub(path.join(FIXTURES, "test.epub"));
    for (const ch of book.chapters) {
      for (const word of ch.words) {
        expect(word).not.toMatch(/<[^>]+>/);
      }
    }
  });

  it("contains expected words from chapter content", async () => {
    const book = await parseEpub(path.join(FIXTURES, "test.epub"));
    const allWords = book.chapters.flatMap((ch) => ch.words);
    expect(allWords).toContain("quick");
    expect(allWords).toContain("brown");
    expect(allWords).toContain("fox");
  });

  it("throws on nonexistent file", async () => {
    await expect(parseEpub("/nonexistent.epub")).rejects.toThrow();
  });
});

describe("PDF parser", () => {
  it("extracts chapters (pages) with words", async () => {
    const book = await parsePdf(path.join(FIXTURES, "test.pdf"));
    expect(book.chapters.length).toBeGreaterThanOrEqual(2);
    expect(book.chapters[0].words.length).toBeGreaterThan(0);
  });

  it("contains expected words from content", async () => {
    const book = await parsePdf(path.join(FIXTURES, "test.pdf"));
    const allWords = book.chapters.flatMap((ch) => ch.words);
    expect(allWords).toContain("quick");
    expect(allWords).toContain("brown");
    expect(allWords).toContain("fox");
  });

  it("uses first line as chapter title when short", async () => {
    const book = await parsePdf(path.join(FIXTURES, "test.pdf"));
    expect(book.chapters[0].title).toBe("Chapter One");
  });

  it("throws on nonexistent file", async () => {
    await expect(parsePdf("/nonexistent.pdf")).rejects.toThrow();
  });
});

describe("unified parseBook", () => {
  it("parses EPUB via format param", async () => {
    const book = await parseBook(path.join(FIXTURES, "test.epub"), "epub");
    expect(book.title).toBe("Test Book");
    expect(book.chapters.length).toBeGreaterThan(0);
  });

  it("parses PDF via format param", async () => {
    const book = await parseBook(path.join(FIXTURES, "test.pdf"), "pdf");
    expect(book.chapters.length).toBeGreaterThan(0);
  });

  it("returns consistent ParsedBook shape for both formats", async () => {
    const epub = await parseBook(path.join(FIXTURES, "test.epub"), "epub");
    const pdf = await parseBook(path.join(FIXTURES, "test.pdf"), "pdf");

    for (const book of [epub, pdf]) {
      expect(book).toHaveProperty("title");
      expect(book).toHaveProperty("author");
      expect(book).toHaveProperty("chapters");
      expect(Array.isArray(book.chapters)).toBe(true);
      for (const ch of book.chapters) {
        expect(ch).toHaveProperty("title");
        expect(ch).toHaveProperty("words");
        expect(Array.isArray(ch.words)).toBe(true);
        expect(ch.words.every((w: string) => typeof w === "string")).toBe(true);
      }
    }
  });

  it("throws on unsupported format", async () => {
    await expect(
      parseBook("/fake.txt", "txt" as "epub")
    ).rejects.toThrow("Unsupported format");
  });
});
