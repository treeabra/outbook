/**
 * Hi-res image retrieval module.
 * Retrieves the highest-resolution cover images from Amazon, Waterstones, or directly.
 */

import type { Browser, Page } from 'playwright';
import type { ImageResult, PublisherConfig, RawBook } from '../types.js';

const RATE_LIMIT_MS = 2000;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;

// ---------------------------------------------------------------------------
// Amazon Retriever
// ---------------------------------------------------------------------------

export class AmazonRetriever {
  private lastRequestTime = 0;

  async getHiResCover(isbn: string, browser: Browser): Promise<ImageResult | null> {
    await this.rateLimit();

    const url = `https://www.amazon.com/dp/${isbn}`;
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

          // Look for hi-res image URL in various Amazon image attributes
          const imageUrl = await this.extractAmazonImage(page);
          if (!imageUrl) return null;

          const buffer = await this.downloadImage(page, imageUrl);
          if (!buffer) return null;

          return {
            buffer,
            mimeType: 'image/jpeg',
            width: 0,
            height: 0,
            sourceUrl: imageUrl,
          };
        } catch {
          if (attempt < MAX_RETRIES - 1) {
            await this.backoff(attempt);
          }
        }
      }
      return null;
    } finally {
      await context.close();
    }
  }

  private async extractAmazonImage(page: Page): Promise<string | null> {
    // Try data-old-hires attribute first (highest quality)
    const hiresUrl = await page.$eval('#imgBlkFront, #landingImage, #ebooksImgBlkFront', (el) => {
      return el.getAttribute('data-old-hires') || el.getAttribute('src') || null;
    }).catch(() => null);

    if (hiresUrl && !hiresUrl.includes('blank')) {
      // Replace size constraints in Amazon image URLs for maximum resolution
      return hiresUrl.replace(/\._[A-Z]+[0-9_]+_\./, '.');
    }

    return null;
  }

  private async downloadImage(page: Page, url: string): Promise<Buffer | null> {
    try {
      const response = await page.context().request.get(url);
      if (response.ok()) {
        return Buffer.from(await response.body());
      }
    } catch {
      // Fall through
    }
    return null;
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// ---------------------------------------------------------------------------
// Waterstones Retriever
// ---------------------------------------------------------------------------

export class WaterstonesRetriever {
  private lastRequestTime = 0;

  async getHiResCover(isbn: string, browser: Browser): Promise<ImageResult | null> {
    await this.rateLimit();

    const url = `https://www.waterstones.com/book/${isbn}`;
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

          const imageUrl = await page.$eval('.book-image img, .main-image img', (el) => {
            return el.getAttribute('src') || null;
          }).catch(() => null);

          if (!imageUrl) return null;

          // Waterstones images: remove size suffix for full resolution
          const hiresUrl = imageUrl.replace(/\/[a-z]+\//, '/large/');

          const response = await page.context().request.get(hiresUrl);
          if (!response.ok()) return null;

          return {
            buffer: Buffer.from(await response.body()),
            mimeType: 'image/jpeg',
            width: 0,
            height: 0,
            sourceUrl: hiresUrl,
          };
        } catch {
          if (attempt < MAX_RETRIES - 1) {
            await this.backoff(attempt);
          }
        }
      }
      return null;
    } finally {
      await context.close();
    }
  }

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < RATE_LIMIT_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// ---------------------------------------------------------------------------
// Direct Retriever
// ---------------------------------------------------------------------------

export class DirectRetriever {
  async getHiResCover(coverUrl: string, browser: Browser): Promise<ImageResult | null> {
    const context = await browser.newContext();

    try {
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await context.request.get(coverUrl);
          if (!response.ok()) {
            if (attempt < MAX_RETRIES - 1) {
              await this.backoff(attempt);
              continue;
            }
            return null;
          }

          const buffer = Buffer.from(await response.body());
          const contentType = response.headers()['content-type'] ?? 'image/jpeg';

          return {
            buffer,
            mimeType: contentType,
            width: 0,
            height: 0,
            sourceUrl: coverUrl,
          };
        } catch {
          if (attempt < MAX_RETRIES - 1) {
            await this.backoff(attempt);
          }
        }
      }
      return null;
    } finally {
      await context.close();
    }
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// ---------------------------------------------------------------------------
// Retriever Dispatcher
// ---------------------------------------------------------------------------

/**
 * Select and invoke the correct retriever based on publisher config.
 */
export async function retrieveHiResImage(
  book: RawBook,
  config: PublisherConfig,
  browser: Browser,
): Promise<ImageResult | null> {
  try {
    switch (config.hires_source) {
      case 'amazon': {
        if (!book.isbn) {
          console.warn(`[HiRes] No ISBN for "${book.title}" — cannot retrieve from Amazon`);
          return null;
        }
        const retriever = new AmazonRetriever();
        return await retriever.getHiResCover(book.isbn, browser);
      }
      case 'waterstones': {
        if (!book.isbn) {
          console.warn(`[HiRes] No ISBN for "${book.title}" — cannot retrieve from Waterstones`);
          return null;
        }
        const retriever = new WaterstonesRetriever();
        return await retriever.getHiResCover(book.isbn, browser);
      }
      case 'direct': {
        const retriever = new DirectRetriever();
        return await retriever.getHiResCover(book.coverUrl, browser);
      }
      default:
        console.warn(`[HiRes] Unknown source "${config.hires_source}" for "${book.title}"`);
        return null;
    }
  } catch (err) {
    console.error(`[HiRes] Failed to retrieve image for "${book.title}": ${(err as Error).message}`);
    return null;
  }
}
