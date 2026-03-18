import { getDocumentProxy, extractText } from "unpdf";
import { readFile } from "fs/promises";
import type { ParsedBook, ParsedChapter } from "./types";

function textToWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
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

    // Use first line as chapter title if it looks like a heading (short line)
    const firstLine = pageText.split("\n")[0].trim();
    const title =
      firstLine.length < 60 ? firstLine : `Page ${i + 1}`;

    chapters.push({ title, words });
  }

  return {
    title: "Unknown Title", // PDF metadata extraction is unreliable
    author: null,
    chapters,
  };
}
