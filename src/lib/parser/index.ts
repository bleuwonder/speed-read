import { parseEpub } from "./epub";
import { parsePdf } from "./pdf";
import type { ParsedBook } from "./types";

export type { ParsedBook, ParsedChapter } from "./types";

export async function parseBook(
  filePath: string,
  format: "epub" | "pdf"
): Promise<ParsedBook> {
  switch (format) {
    case "epub":
      return parseEpub(filePath);
    case "pdf":
      return parsePdf(filePath);
    default:
      throw new Error(`Unsupported format: ${format}`);
  }
}
