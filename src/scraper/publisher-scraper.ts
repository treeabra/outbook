/**
 * Publisher scraper module.
 * Navigates to a publisher's forthcoming page and extracts book data.
 */

import type { Browser, Page } from 'playwright';
import type { PublisherConfig, RawBook } from '../types.js';
import { createNavigationStrategy } from './navigation/index.js';

const PAGE_TIMEOUT = 30000;

/**
 * Scrape a single publisher's forthcoming page for book entries.
 */
export async function scrapePublisher(config: PublisherConfig, browser: Browser): Promise<RawBook[]> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);

  try {
    await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

    // Apply navigation strategy to load all content
    const strategy = createNavigationStrategy(config.navigation);
    const navResult = await strategy.navigate(page, config.navigation_options);

    if (navResult.errors.length > 0) {
      console.warn(`[${config.name}] Navigation warnings:`, navResult.errors);
    }

    // Extract books from the page
    const books = await extractBooks(page, config);
    return books;
  } catch (err) {
    throw new Error(`Failed to scrape ${config.name}: ${(err as Error).message}`);
  } finally {
    await context.close();
  }
}

async function extractBooks(page: Page, config: PublisherConfig): Promise<RawBook[]> {
  const books: RawBook[] = [];

  const bookElements = await page.$$(config.book_selector);

  for (const element of bookElements) {
    try {
      // Extract title
      const titleEl = await element.$(config.title_selector);
      const title = titleEl ? (await titleEl.textContent())?.trim() ?? '' : '';

      if (!title) continue;

      // Extract cover URL
      const coverEl = await element.$(config.cover_selector);
      let coverUrl = '';
      if (coverEl) {
        coverUrl = (await coverEl.getAttribute('src')) ?? (await coverEl.getAttribute('data-src')) ?? '';
      }

      if (!coverUrl) continue;

      // Extract ISBN if selector is configured
      let isbn: string | undefined;
      if (config.isbn_selector) {
        const isbnEl = await element.$(config.isbn_selector);
        if (isbnEl) {
          isbn = (await isbnEl.getAttribute('data-isbn')) ?? (await isbnEl.textContent())?.trim() ?? undefined;
        }
      }

      books.push({
        title,
        coverUrl,
        isbn,
        publisherName: config.name,
      });
    } catch {
      // Skip individual book extraction errors
      continue;
    }
  }

  return books;
}
