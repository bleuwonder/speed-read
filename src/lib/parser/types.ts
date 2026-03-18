export interface ParsedChapter {
  title: string;
  words: string[];
  paragraphBreaks: number[]; // word indices where each paragraph starts
}

export interface ParsedBook {
  title: string;
  author: string | null;
  chapters: ParsedChapter[];
}
