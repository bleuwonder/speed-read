# Speed Read App - Implementation Plan

## Stack
- **Framework**: Next.js 14+ App Router (TypeScript)
- **Testing**: Vitest + React Testing Library (TDD)
- **EPUB parsing**: `@lingo-reader/epub-parser` — actively maintained, clean chapter/content extraction
- **PDF parsing**: `unpdf` — modern pdf.js wrapper, works in edge/serverless
- **Storage**: SQLite via `better-sqlite3` — easy migration path to Postgres for multi-user later
- **Styling**: Tailwind CSS
- **State**: React hooks (useState/useContext) — no external state lib needed

## Data Model (SQLite)

```sql
books (
  id TEXT PRIMARY KEY,        -- uuid
  title TEXT,
  author TEXT,
  filename TEXT,
  format TEXT,                -- 'epub' | 'pdf'
  total_words INTEGER,
  created_at DATETIME
)

chapters (
  id TEXT PRIMARY KEY,        -- uuid
  book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
  chapter_index INTEGER,      -- ordering
  title TEXT,
  word_offset INTEGER,        -- global word position where chapter starts
  word_count INTEGER,
  words JSON                  -- string[] for this chapter only
)

reading_progress (
  book_id TEXT PRIMARY KEY REFERENCES books(id) ON DELETE CASCADE,
  current_chapter_index INTEGER,
  current_word_in_chapter INTEGER,  -- position within current chapter's words
  wpm INTEGER DEFAULT 300,
  updated_at DATETIME
)
```

Words are stored per-chapter in the `chapters` table. The reader loads only the current chapter's words into memory. `word_offset` enables global position tracking (e.g., "word 5,432 of 98,000") without loading all chapters.

## Architecture

```
/app
  /page.tsx                  -- library view (list books, upload)
  /read/[id]/page.tsx        -- reader view (RSVP display)
/app/api
  /books/route.ts            -- GET (list), POST (upload + parse)
  /books/[id]/route.ts       -- GET (book detail), DELETE
  /books/[id]/chapters/[index]/route.ts -- GET chapter words (lazy load)
  /books/[id]/progress/route.ts -- GET/PUT reading progress
/lib
  /db.ts                     -- SQLite setup + queries
  /parser/epub.ts            -- EPUB → chapters + words
  /parser/pdf.ts             -- PDF → chapters + words
  /parser/index.ts           -- unified parse interface
/components
  /BookList.tsx              -- library listing
  /UploadForm.tsx            -- file upload (PDF/EPUB)
  /Reader.tsx                -- RSVP word display
  /ReaderControls.tsx        -- play/pause, WPM slider, chapter nav
```

## Implementation Phases (TDD)

### Phase 1: Project Setup
- [ ] Init Next.js 14 with TypeScript, Tailwind
- [ ] Configure Vitest + React Testing Library
- [ ] Set up SQLite with better-sqlite3
- [ ] Write DB schema migration (books, chapters, reading_progress)

### Phase 2: Book Parsing (test-first)
- [ ] **Tests**: parse EPUB → extract title, author, chapters with words per chapter
- [ ] **Tests**: parse PDF → extract text, split into words, create chapter chunks
- [ ] **Tests**: unified parser returns consistent `ParsedBook` type
- [ ] **Tests**: malformed/encrypted files return clear errors (not crashes)
- [ ] Implement EPUB parser (@lingo-reader/epub-parser) — strip HTML/images, extract text only
- [ ] Implement PDF parser (unpdf)
- [ ] Both return: `{ title, author, chapters: [{title, words: string[]}] }`

### Phase 3: Upload + Storage API (test-first)
- [ ] **Tests**: POST /api/books — upload file, parse, store book + chapters in DB, return metadata
- [ ] **Tests**: GET /api/books — list all books with progress summary
- [ ] **Tests**: GET /api/books/[id] — return book metadata + chapter list (no words)
- [ ] **Tests**: GET /api/books/[id]/chapters/[index] — return single chapter's words
- [ ] **Tests**: DELETE /api/books/[id] — cascading delete book + chapters + progress
- [ ] **Tests**: GET/PUT /api/books/[id]/progress — read/write position
- [ ] Implement API routes

### Phase 4: Library UI (test-first)
- [ ] **Tests**: UploadForm renders, accepts PDF/EPUB only, shows error for other types
- [ ] **Tests**: UploadForm shows progress/error states during upload
- [ ] **Tests**: BookList renders books, shows title/author/progress percentage
- [ ] **Tests**: clicking a book navigates to /read/[id]
- [ ] Implement library page with upload + book list
- [ ] Dark mode support (system preference + toggle)

### Phase 5: RSVP Reader (test-first)
- [ ] **Tests**: Reader loads current chapter's words on mount
- [ ] **Tests**: Reader displays current word at center of screen with ORP highlight
- [ ] **Tests**: play/pause toggles word advancement
- [ ] **Tests**: WPM slider changes display speed (100-1000 WPM range)
- [ ] **Tests**: chapter transition — auto-loads next chapter when current exhausts
- [ ] **Tests**: chapter navigation jumps to chapter start, loads that chapter's words
- [ ] **Tests**: progress saves on pause and on interval (every 5s)
- [ ] **Tests**: resuming loads last saved chapter + position within chapter
- [ ] Implement Reader component with ORP (Optimal Recognition Point) highlighting
- [ ] Implement ReaderControls (play/pause, WPM, chapter selector)
- [ ] Keyboard shortcuts (space = play/pause, arrow keys = skip words)
- [ ] Dark mode reader

### Phase 6: Polish
- [ ] Loading states and error boundaries throughout
- [ ] Responsive layout (desktop + tablet)
- [ ] Global progress display (word X of Y across all chapters)
- [ ] Handle edge cases: empty chapters, single-word chapters, very long words

## Key Decisions
1. **Per-chapter word storage** — only the active chapter is in memory. Chapters are loaded on demand via API. Scales to large books without memory issues.
2. **SQLite now, Postgres later** — schema is designed to be Postgres-compatible. Add a `user_id` column to each table when multi-user is needed.
3. **No auth (for now)** — single-user local app. Schema is ready for user scoping later.
4. **ORP highlighting** — red letter at ~1/3 of word length for natural eye focus.
5. **TDD throughout** — every phase starts with failing tests, then implementation.
6. **Dark mode** — system preference default with manual toggle, essential for a reader app.
7. **Strip formatting** — EPUB HTML/images are stripped to plain text. RSVP only needs words.
