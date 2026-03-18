import { getDocumentProxy, extractText } from "unpdf";
import { readFile } from "fs/promises";
import type { ParsedBook, ParsedChapter } from "./types";
import { textToWords } from "./utils";

// Detect if a page starts with what looks like a chapter heading:
// - Short first line (< 50 chars)
// - Matches common chapter patterns (Chapter X, Part X, roman numerals, etc.)
// - Or first line is ALL CAPS and short
const CHAPTER_PATTERN =
  /^(chapter|part|section|prologue|epilogue|introduction|conclusion|preface|foreword|afterword|appendix)\b/i;
const NUMBERED_PATTERN = /^([\dIVXLCDMivxlcdm]+[.\s:)]|[\d]+\s)/;

function isChapterStart(pageText: string): string | null {
  const firstLine = pageText.split("\n")[0].trim();
  if (!firstLine || firstLine.length > 60) return null;

  if (CHAPTER_PATTERN.test(firstLine)) return firstLine;
  if (NUMBERED_PATTERN.test(firstLine) && firstLine.length < 40) return firstLine;
  if (firstLine === firstLine.toUpperCase() && firstLine.length > 2 && firstLine.length < 50) {
    return firstLine;
  }

  return null;
}

export async function parsePdf(filePath: string): Promise<ParsedBook> {
  const buffer = await readFile(filePath);
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text: pages } = await extractText(pdf, { mergePages: false });

  const chapters: ParsedChapter[] = [];

  for (let i = 0; i < pages.length; i++) {
    const pageText = pages[i].trim();
    if (!pageText) continue;

    const words = textToWords(pageText);
    if (words.length === 0) continue;

    const chapterTitle = isChapterStart(pageText);

    if (chapterTitle !== null) {
      chapters.push({ title: chapterTitle, words: [...words] });
    } else if (chapters.length > 0) {
      chapters[chapters.length - 1].words.push(...words);
    } else {
      chapters.push({ title: "Chapter 1", words: [...words] });
    }
  }

  if (chapters.length === 0) {
    const allWords = pages.flatMap((p) => textToWords(p.trim()));
    if (allWords.length > 0) {
      chapters.push({ title: "Chapter 1", words: allWords });
    }
  }

  let title = "Unknown Title";
  let author: string | null = null;

  try {
    const meta = await pdf.getMetadata();
    const info = meta?.info as Record<string, string> | undefined;
    if (info?.Title?.trim()) title = info.Title.trim();
    if (info?.Author?.trim()) author = info.Author.trim();
  } catch {
    // metadata extraction is optional
  }

  return { title, author, chapters };
}
