export function textToWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

const BLOCK_TAGS = /^(p|div|h[1-6]|li|ul|ol|blockquote|tr|td|th|table|section|article|header|footer|nav|aside|figure|figcaption|details|summary|pre|hr|br|dd|dt|dl)$/i;

export function stripHtml(html: string): string {
  // Replace block-level tags with spaces, remove inline tags silently
  return html
    .replace(/<\/?([\w-]+)[^>]*>/g, (match, tag) => BLOCK_TAGS.test(tag) ? " " : "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function htmlToParagraphs(html: string): { words: string[]; paragraphBreaks: number[] } {
  // Insert paragraph markers at block-level boundaries
  const withMarkers = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n\n");

  // Strip remaining tags: inline tags removed silently, block opening tags get a space
  const rawText = withMarkers
    .replace(/<\/?([\w-]+)[^>]*>/g, (match, tag) => BLOCK_TAGS.test(tag) ? " " : "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "");

  const paragraphs = rawText.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);

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
