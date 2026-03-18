export function textToWords(text: string): string[] {
  // Normalize Unicode whitespace (non-breaking spaces, thin spaces, etc.) before splitting
  const normalized = text.replace(/[\u00A0\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/g, " ");
  return normalized.split(/\s+/).filter((w) => w.length > 0);
}

const BLOCK_TAGS = /^(p|div|h[1-6]|li|ul|ol|blockquote|tr|td|th|table|section|article|header|footer|nav|aside|figure|figcaption|details|summary|pre|hr|br|dd|dt|dl)$/i;
const INLINE_TAG = /<\/?(span|b|i|em|strong|a|u|s|small|sub|sup|abbr|cite|code|mark|q|time|var|del|ins|ruby|rt|rp|bdi|bdo|data|dfn|kbd|samp|wbr)(?:\s[^>]*)?>/gi;

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/**
 * Remove inline tags and fix word splits they cause.
 *
 * After removing inline tags, whitespace that was between tags can split
 * words incorrectly. We fix this by:
 * 1. Removing inline tags (no replacement)
 * 2. Joining fragments where a short (1-2 char) piece is separated from
 *    the next word by only whitespace — these are dropcap/styling splits
 */
function removeInlineTagsAndJoin(html: string): string {
  let text = html.replace(INLINE_TAG, "");
  // Fix dropcap splits (lowercase continuation): "T\n  he" → "The"
  text = text.replace(/(^|[\n\r])\s*([A-Z]{1,2})\s+([a-z])/gm, "$1$2$3");
  // Fix dropcap splits (ALL CAPS): "P RAISE" → "PRAISE", "W ORK" → "WORK"
  text = text.replace(/\b([A-Z]) ([A-Z]{2,})\b/g, "$1$2");
  return text;
}

export function stripHtml(html: string): string {
  let text = removeInlineTagsAndJoin(html);
  text = text.replace(/<\/?([\w-]+)[^>]*>/g, " ");
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

export function htmlToParagraphs(html: string): { words: string[]; paragraphBreaks: number[] } {
  // 1. Mark paragraph boundaries
  let text = html
    .replace(/<\/(p|div|h[1-6]|li|blockquote|tr|section|article)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n\n");

  // 2. Remove inline tags and fix word splits
  text = removeInlineTagsAndJoin(text);

  // 3. Replace remaining block tags with spaces
  text = text.replace(/<\/?([\w-]+)[^>]*>/g, " ");

  // 4. Decode entities
  text = decodeEntities(text);

  const paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);

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
