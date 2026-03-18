import { initEpubFile } from "@lingo-reader/epub-parser";
import type { ParsedBook, ParsedChapter } from "./types";
import { textToWords, stripHtml } from "./utils";

export async function parseEpub(filePath: string): Promise<ParsedBook> {
  const epub = await initEpubFile(filePath);
  const metadata = epub.getMetadata();
  const spine = epub.getSpine();
  const toc = epub.getToc();

  const tocEntries = new Map<string, string>();
  if (toc) {
    for (const entry of toc) {
      if (entry.href) {
        const baseHref = entry.href.split("#")[0];
        tocEntries.set(baseHref, entry.label || "");
      }
      if (entry.id) {
        tocEntries.set(entry.id, entry.label || "");
      }
    }
  }

  const spineContent: { id: string; href: string; words: string[]; tocTitle: string | null }[] = [];

  for (const item of spine) {
    const chapter = await epub.loadChapter(item.id);
    if (!chapter?.html) continue;

    const text = stripHtml(chapter.html);
    const words = textToWords(text);
    if (words.length === 0) continue;

    const baseHref = item.href?.split("#")[0] || "";
    const tocTitle = tocEntries.get(item.id) || tocEntries.get(baseHref) || null;

    spineContent.push({ id: item.id, href: baseHref, words, tocTitle });
  }

  const hasToc = spineContent.some((s) => s.tocTitle !== null);
  const chapters: ParsedChapter[] = [];

  if (hasToc) {
    for (const item of spineContent) {
      if (item.tocTitle !== null) {
        chapters.push({ title: item.tocTitle, words: [...item.words] });
      } else if (chapters.length > 0) {
        chapters[chapters.length - 1].words.push(...item.words);
      } else {
        chapters.push({ title: "Front Matter", words: [...item.words] });
      }
    }
  } else {
    for (let i = 0; i < spineContent.length; i++) {
      chapters.push({
        title: `Chapter ${i + 1}`,
        words: [...spineContent[i].words],
      });
    }
  }

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
