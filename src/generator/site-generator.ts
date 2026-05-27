/**
 * Site generator module.
 * Generates the books.json manifest for the static gallery.
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Book } from '../types.js';

const DATA_FILE = 'data/books.json';
const HIRES_DIR = 'covers/hires';

export interface BooksManifest {
  lastUpdated: string;
  totalBooks: number;
  books: Book[];
}

/**
 * Generate the books.json manifest from the processed book list.
 * Only includes books that have valid hi-res image files on disk.
 * Sorts books alphabetically by publisher name (case-insensitive).
 */
export function generateManifest(books: Book[]): BooksManifest {
  // Filter to only books with existing hi-res files
  const validBooks = books.filter(book => {
    const hiresPath = resolve(process.cwd(), HIRES_DIR, book.hiresFilename);
    return existsSync(hiresPath);
  });

  // Sort alphabetically by publisher name (case-insensitive)
  validBooks.sort((a, b) =>
    a.publisher.toLowerCase().localeCompare(b.publisher.toLowerCase())
  );

  return {
    lastUpdated: new Date().toISOString(),
    totalBooks: validBooks.length,
    books: validBooks,
  };
}

/**
 * Write the manifest to data/books.json.
 */
export function writeManifest(manifest: BooksManifest): void {
  const filePath = resolve(process.cwd(), DATA_FILE);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`[Generator] Wrote ${manifest.totalBooks} books to ${DATA_FILE}`);
}

/**
 * Full generation pipeline: filter, sort, write.
 */
export function generateSite(books: Book[]): void {
  const manifest = generateManifest(books);
  writeManifest(manifest);
}
