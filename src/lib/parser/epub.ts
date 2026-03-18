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

  // Build a set of spine item IDs/hrefs that are actual TOC entries
  const tocEntries = new Map<string, string>(); // href (without fragment) -> label
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

  // Load all spine items and figure out which ones are TOC chapter starts
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

  // Merge spine items into chapters using TOC as boundaries.
  // If a spine item has a TOC entry, it starts a new chapter.
  // If it doesn't, its words get appended to the previous chapter.
  // If there are no TOC entries at all, fall back to one chapter per spine item.
  const hasToc = spineContent.some((s) => s.tocTitle !== null);
  const chapters: ParsedChapter[] = [];

  if (hasToc) {
    for (const item of spineContent) {
      if (item.tocTitle !== null) {
        // Start a new chapter
        chapters.push({ title: item.tocTitle, words: [...item.words] });
      } else if (chapters.length > 0) {
        // Merge into previous chapter
        chapters[chapters.length - 1].words.push(...item.words);
      } else {
        // Content before first TOC entry — create a "Front Matter" chapter
        chapters.push({ title: "Front Matter", words: [...item.words] });
      }
    }
  } else {
    // No TOC — each spine item is a chapter
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
