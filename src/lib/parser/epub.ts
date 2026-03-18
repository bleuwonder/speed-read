import { initEpubFile } from "@lingo-reader/epub-parser";
import type { ParsedBook, ParsedChapter } from "./types";

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function textToWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

export async function parseEpub(filePath: string): Promise<ParsedBook> {
  const epub = await initEpubFile(filePath);
  const metadata = epub.getMetadata();
  const spine = epub.getSpine();
  const toc = epub.getToc();

  const tocMap = new Map<string, string>();
  if (toc) {
    for (const entry of toc) {
      if (entry.id) tocMap.set(entry.id, entry.label || "");
      if (entry.href) tocMap.set(entry.href.split("#")[0], entry.label || "");
    }
  }

  const chapters: ParsedChapter[] = [];

  for (const item of spine) {
    const chapter = await epub.loadChapter(item.id);
    if (!chapter?.html) continue;

    const text = stripHtml(chapter.html);
    const words = textToWords(text);
    if (words.length === 0) continue;

    const title =
      tocMap.get(item.id || "") ||
      tocMap.get(item.href?.split("#")[0] || "") ||
      `Chapter ${chapters.length + 1}`;

    chapters.push({ title, words });
  }

  // Extract author from creator array
  const creators = metadata?.creator;
  let author: string | null = null;
  if (Array.isArray(creators) && creators.length > 0) {
    author = creators[0].contributor || null;
  } else if (typeof creators === "string") {
    author = creators;
  }

  return {
    title: metadata?.title || "Unknown Title",
    author,
    chapters,
  };
}
