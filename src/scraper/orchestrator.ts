/**
 * Scraper orchestrator.
 * Coordinates scraping across all publishers, handles failures, and aggregates results.
 */

import { chromium, type Browser } from 'playwright';
import type { PublisherConfig, RawBook, ScrapeResult, PublisherFailure } from '../types.js';
import { scrapePublisher } from './publisher-scraper.js';

export interface OrchestratorResult {
  books: RawBook[];
  failures: PublisherFailure[];
}

/**
 * Run the scraping pipeline for all configured publishers.
 */
export async function runOrchestrator(configs: PublisherConfig[]): Promise<OrchestratorResult> {
  const allBooks: RawBook[] = [];
  const failures: PublisherFailure[] = [];
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();

    for (const config of configs) {
      try {
        console.log(`[Orchestrator] Scraping: ${config.name}`);
        const books = await scrapePublisher(config, browser);
        allBooks.push(...books);
        console.log(`[Orchestrator] ${config.name}: found ${books.length} books`);
      } catch (err) {
        const errorMsg = (err as Error).message;
        console.error(`[Orchestrator] ${config.name} failed: ${errorMsg}`);

        // Retry once after browser restart
        try {
          await browser.close().catch(() => {});
          browser = await launchBrowser();
          const books = await scrapePublisher(config, browser);
          allBooks.push(...books);
          console.log(`[Orchestrator] ${config.name} (retry): found ${books.length} books`);
        } catch (retryErr) {
          failures.push({
            publisherName: config.name,
            error: (retryErr as Error).message,
          });
        }
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return { books: allBooks, failures };
}

/**
 * Run scraping for a single publisher (useful for testing).
 */
export async function runSinglePublisher(config: PublisherConfig): Promise<RawBook[]> {
  const browser = await launchBrowser();
  try {
    return await scrapePublisher(config, browser);
  } finally {
    await browser.close();
  }
}

async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
}
