export interface ParsedChapter {
  title: string;
  words: string[];
}

export interface ParsedBook {
  title: string;
  author: string | null;
  chapters: ParsedChapter[];
}
