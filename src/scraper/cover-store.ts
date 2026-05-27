/**
 * Cover store sync logic.
 * Manages the books.json manifest and cleans up orphaned image files.
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Book } from '../types.js';

const DATA_FILE = 'data/books.json';
const HIRES_DIR = 'covers/hires';
const THUMBS_DIR = 'covers/thumbs';

export interface BooksManifest {
  lastUpdated: string;
  totalBooks: number;
  books: Book[];
}

/**
 * Load the existing books manifest from disk.
 */
export function loadManifest(): BooksManifest {
  const filePath = resolve(process.cwd(), DATA_FILE);
  if (!existsSync(filePath)) {
    return { lastUpdated: new Date().toISOString(), totalBooks: 0, books: [] };
  }

  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as BooksManifest;
  } catch {
    return { lastUpdated: new Date().toISOString(), totalBooks: 0, books: [] };
  }
}

/**
 * Save the books manifest to disk.
 */
export function saveManifest(manifest: BooksManifest): void {
  const filePath = resolve(process.cwd(), DATA_FILE);
  writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
}

/**
 * Sync the cover store with newly scraped books.
 * - Adds new books
 * - Removes books no longer listed as forthcoming
 * - Updates lastSeen for books still present
 * - Deletes orphaned image files
 */
export function syncCoverStore(
  existingBooks: Book[],
  newBooks: Book[],
): { updated: Book[]; added: number; removed: number } {
  const today = new Date().toISOString().split('T')[0];
  const newBookIds = new Set(newBooks.map(b => b.id));
  const existingBookIds = new Set(existingBooks.map(b => b.id));

  // Books to keep (still present in new scrape) — update lastSeen
  const kept = existingBooks
    .filter(b => newBookIds.has(b.id))
    .map(b => ({ ...b, lastSeen: today }));

  // Truly new books (not in existing)
  const added = newBooks.filter(b => !existingBookIds.has(b.id));

  // Books to remove (no longer in new scrape)
  const removed = existingBooks.filter(b => !newBookIds.has(b.id));

  // Delete orphaned image files
  for (const book of removed) {
    deleteBookFiles(book);
  }

  const updated = [...kept, ...added];

  return {
    updated,
    added: added.length,
    removed: removed.length,
  };
}

/**
 * Delete image files associated with a book.
 */
function deleteBookFiles(book: Book): void {
  const hiresPath = resolve(process.cwd(), HIRES_DIR, book.hiresFilename);
  const thumbPath = resolve(process.cwd(), THUMBS_DIR, book.thumbFilename);

  try {
    if (existsSync(hiresPath)) unlinkSync(hiresPath);
  } catch {
    // Ignore deletion errors
  }
  try {
    if (existsSync(thumbPath)) unlinkSync(thumbPath);
  } catch {
    // Ignore deletion errors
  }
}

/**
 * Remove any image files in covers/ that don't correspond to a book in the manifest.
 */
export function cleanOrphanedFiles(books: Book[]): void {
  const validHiresFiles = new Set(books.map(b => b.hiresFilename));
  const validThumbFiles = new Set(books.map(b => b.thumbFilename));

  // Clean hires directory
  const hiresDir = resolve(process.cwd(), HIRES_DIR);
  if (existsSync(hiresDir)) {
    for (const file of readdirSync(hiresDir)) {
      if (file === '.gitkeep') continue;
      if (!validHiresFiles.has(file)) {
        try { unlinkSync(resolve(hiresDir, file)); } catch { /* ignore */ }
      }
    }
  }

  // Clean thumbs directory
  const thumbsDir = resolve(process.cwd(), THUMBS_DIR);
  if (existsSync(thumbsDir)) {
    for (const file of readdirSync(thumbsDir)) {
      if (file === '.gitkeep') continue;
      if (!validThumbFiles.has(file)) {
        try { unlinkSync(resolve(thumbsDir, file)); } catch { /* ignore */ }
      }
    }
  }
}
