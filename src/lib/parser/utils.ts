export function textToWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

export function stripHtml(html: string): string {
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

/**
 * Extract paragraphs from HTML by splitting on block-level tags.
 * Returns { words, paragraphBreaks } where paragraphBreaks[i] is the
 * word index where paragraph i starts.
 */
export function htmlToParagraphs(html: string): { words: string[]; paragraphBreaks: number[] } {
  // Insert paragraph markers before block-level elements
  const withMarkers = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n\n");

  const rawText = stripHtml(withMarkers);
  const paragraphs = rawText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const words: string[] = [];
  const paragraphBreaks: number[] = [];

  for (const para of paragraphs) {
    const paraWords = textToWords(para);
    if (paraWords.length === 0) continue;
    paragraphBreaks.push(words.length);
    words.push(...paraWords);
  }

  if (words.length > 0 && paragraphBreaks.length === 0) {
    paragraphBreaks.push(0);
  }

  return { words, paragraphBreaks };
}

/**
 * Extract paragraphs from plain text by splitting on double newlines.
 */
export function textToParagraphs(text: string): { words: string[]; paragraphBreaks: number[] } {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const words: string[] = [];
  const paragraphBreaks: number[] = [];

  for (const para of paragraphs) {
    const paraWords = textToWords(para);
    if (paraWords.length === 0) continue;
    paragraphBreaks.push(words.length);
    words.push(...paraWords);
  }

  if (words.length > 0 && paragraphBreaks.length === 0) {
    paragraphBreaks.push(0);
  }

  return { words, paragraphBreaks };
}
