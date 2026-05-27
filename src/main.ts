/**
 * Main entry point for the scraping pipeline.
 * Wires together: config parser → orchestrator → hi-res retriever →
 * placeholder detector → image processor → cover store sync → site generator.
 *
 * Usage:
 *   npm run scrape                    # Scrape all publishers
 *   npm run scrape -- --publisher "Two Dollar Radio"  # Single publisher
 */

import { chromium } from 'playwright';
import { createHash } from 'node:crypto';
import { parsePublisherConfig } from './config/config-parser.js';
import { runOrchestrator, runSinglePublisher } from './scraper/orchestrator.js';
import { retrieveHiResImage } from './scraper/hires-retriever.js';
import { isPlaceholder } from './scraper/placeholder-detector.js';
import { processImage, sanitizeFilename } from './scraper/image-processor.js';
import { loadManifest, saveManifest, syncCoverStore, cleanOrphanedFiles } from './scraper/cover-store.js';
import { normalizeGenres } from './scraper/genre-normalizer.js';
import { generateManifest, writeManifest } from './generator/site-generator.js';
import type { Book, PublisherConfig, RawBook } from './types.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const publisherArg = getArgValue(args, '--publisher');

  console.log('[Main] Loading publisher configurations...');
  const configs = parsePublisherConfig();
  console.log(`[Main] Loaded ${configs.length} publisher configs.`);

  let rawBooks: RawBook[];

  if (publisherArg) {
    // Single publisher mode
    const config = configs.find(c => c.name.toLowerCase() === publisherArg.toLowerCase());
    if (!config) {
      console.error(`[Main] Publisher "${publisherArg}" not found in config.`);
      process.exit(1);
    }
    console.log(`[Main] Running single publisher: ${config.name}`);
    rawBooks = await runSinglePublisher(config);
  } else {
    // Full scrape
    const result = await runOrchestrator(configs);
    rawBooks = result.books;
    if (result.failures.length > 0) {
      console.warn(`[Main] ${result.failures.length} publisher(s) failed:`);
      for (const f of result.failures) {
        console.warn(`  - ${f.publisherName}: ${f.error}`);
      }
    }
  }

  console.log(`[Main] Scraped ${rawBooks.length} raw books. Processing images...`);

  // Process each book: retrieve hi-res, detect placeholders, generate thumbnails
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const processedBooks: Book[] = [];

  try {
    for (const rawBook of rawBooks) {
      const config = configs.find(c => c.name === rawBook.publisherName);
      if (!config) continue;

      // Retrieve hi-res image
      const imageResult = await retrieveHiResImage(rawBook, config, browser);
      if (!imageResult) {
        console.log(`[Main] Skipping "${rawBook.title}" — no hi-res image`);
        continue;
      }

      // Check for placeholder
      const isPlaceholderImage = await isPlaceholder(imageResult.buffer, config.placeholder);
      if (isPlaceholderImage) {
        console.log(`[Main] Skipping "${rawBook.title}" — placeholder detected`);
        continue;
      }

      // Build Book object
      const genres = normalizeGenres(rawBook.genres ?? [], config.default_genre);
      const book: Book = {
        id: generateBookId(rawBook.publisherName, rawBook.title),
        title: rawBook.title,
        publisher: rawBook.publisherName,
        genres,
        hiresFilename: `${sanitizeFilename(rawBook.publisherName, rawBook.title)}.jpg`,
        thumbFilename: `${sanitizeFilename(rawBook.publisherName, rawBook.title)}.webp`,
        isbn: rawBook.isbn,
        dateDiscovered: new Date().toISOString().split('T')[0],
        lastSeen: new Date().toISOString().split('T')[0],
      };

      // Process image (save hi-res + generate thumbnail)
      await processImage(imageResult, book);
      processedBooks.push(book);
    }
  } finally {
    await browser.close();
  }

  console.log(`[Main] Processed ${processedBooks.length} books with valid covers.`);

  // Sync cover store
  const manifest = loadManifest();
  const syncResult = syncCoverStore(manifest.books, processedBooks);
  console.log(`[Main] Sync: +${syncResult.added} new, -${syncResult.removed} removed`);

  // Clean orphaned files
  cleanOrphanedFiles(syncResult.updated);

  // Generate site manifest
  const newManifest = generateManifest(syncResult.updated);
  writeManifest(newManifest);

  console.log(`[Main] Done. Gallery has ${newManifest.totalBooks} covers.`);
}

function generateBookId(publisher: string, title: string): string {
  const hash = createHash('sha256')
    .update(`${publisher}::${title}`)
    .digest('hex');
  return hash.slice(0, 8);
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}

main().catch(err => {
  console.error('[Main] Fatal error:', err);
  process.exit(1);
});
