import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "speed-read.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    migrate(db);
  }
  return db;
}

export function migrate(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      filename TEXT NOT NULL,
      format TEXT NOT NULL CHECK(format IN ('epub', 'pdf')),
      total_words INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      chapter_index INTEGER NOT NULL,
      title TEXT,
      word_offset INTEGER NOT NULL,
      word_count INTEGER NOT NULL,
      words JSON NOT NULL,
      paragraph_breaks JSON NOT NULL DEFAULT '[]',
      UNIQUE(book_id, chapter_index)
    );

    CREATE TABLE IF NOT EXISTS reading_progress (
      book_id TEXT PRIMARY KEY,
      current_chapter_index INTEGER NOT NULL DEFAULT 0,
      current_word_in_chapter INTEGER NOT NULL DEFAULT 0,
      wpm INTEGER NOT NULL DEFAULT 300,
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
