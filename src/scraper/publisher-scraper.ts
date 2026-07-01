/**
 * Publisher scraper module.
 * Navigates to a publisher's forthcoming page and extracts book data
 * using flexible pattern-based extraction rather than rigid CSS selectors.
 *
 * Supports:
 * - Shopify sites (Two Dollar Radio, Feminist Press, Coffee House Press)
 * - Custom CMS sites (Milkweed, Transit Books, Bellevue Literary Press, Unnamed Press)
 * - Generic fallback using link/image proximity heuristics
 */

import type { Browser, Page } from 'playwright';
import type { PublisherConfig, RawBook } from '../types.js';
import { createNavigationStrategy } from './navigation/index.js';

const PAGE_TIMEOUT = 30000;

/** Default URL patterns that indicate a link points to a book detail page. */
const DEFAULT_BOOK_URL_PATTERNS = [
  '/products/',
  '/book/',
  '/books/',
  '/all-books/',
  '/title/',
  '/catalogue/',
];

/**
 * Scrape a single publisher's forthcoming page for book entries.
 * Uses a layered extraction strategy:
 * 1. Try CSS selectors from config (if they match anything)
 * 2. Detect Shopify and use Shopify-specific extraction
 * 3. Fall back to pattern-based link+image extraction
 */
export async function scrapePublisher(config: PublisherConfig, browser: Browser): Promise<RawBook[]> {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);

  try {
    console.log(`[${config.name}] Navigating to ${config.url}`);
    await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: PAGE_TIMEOUT });

    // Wait for the page to settle (images, lazy loading, etc.)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      console.log(`[${config.name}] Network idle timeout — proceeding with available content`);
    });

    // Apply navigation strategy to load all content (pagination, scroll, etc.)
    const strategy = createNavigationStrategy(config.navigation);
    const navResult = await strategy.navigate(page, config.navigation_options);

    if (navResult.errors.length > 0) {
      console.warn(`[${config.name}] Navigation warnings:`, navResult.errors);
    }

    // Layered extraction
    let books = await trySelectorsExtraction(page, config);

    if (books.length > 0) {
      console.log(`[${config.name}] CSS selectors matched ${books.length} books`);
      return books;
    }

    console.log(`[${config.name}] CSS selectors found nothing — trying pattern-based extraction`);

    // Detect if Shopify
    const isShopify = await detectShopify(page);
    if (isShopify) {
      console.log(`[${config.name}] Detected Shopify site`);
      books = await extractShopify(page, config);
      if (books.length > 0) {
        console.log(`[${config.name}] Shopify extraction found ${books.length} books`);
        return books;
      }
    }

    // Generic pattern-based extraction
    books = await extractByPatterns(page, config);
    console.log(`[${config.name}] Pattern-based extraction found ${books.length} books`);
    return books;
  } catch (err) {
    throw new Error(`Failed to scrape ${config.name}: ${(err as Error).message}`);
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------------------
// Strategy 1: CSS Selectors (original approach, kept as first attempt)
// ---------------------------------------------------------------------------

async function trySelectorsExtraction(page: Page, config: PublisherConfig): Promise<RawBook[]> {
  const books: RawBook[] = [];

  try {
    const bookElements = await page.$$(config.book_selector);
    if (bookElements.length === 0) return [];

    for (const element of bookElements) {
      try {
        const titleEl = await element.$(config.title_selector);
        const title = titleEl ? (await titleEl.textContent())?.trim() ?? '' : '';
        if (!title) continue;

        const coverEl = await element.$(config.cover_selector);
        let coverUrl = '';
        if (coverEl) {
          coverUrl =
            (await coverEl.getAttribute('src')) ??
            (await coverEl.getAttribute('data-src')) ??
            (await coverEl.getAttribute('data-srcset'))?.split(' ')[0] ??
            '';
        }
        if (!coverUrl) continue;

        coverUrl = normalizeImageUrl(coverUrl, config.url);

        let isbn: string | undefined;
        if (config.isbn_selector) {
          const isbnEl = await element.$(config.isbn_selector);
          if (isbnEl) {
            isbn = (await isbnEl.getAttribute('data-isbn')) ?? (await isbnEl.textContent())?.trim() ?? undefined;
          }
        }

        books.push({ title, coverUrl, isbn, publisherName: config.name });
      } catch {
        continue;
      }
    }
  } catch {
    // Selectors didn't work at all
  }

  return books;
}

// ---------------------------------------------------------------------------
// Strategy 2: Shopify-specific extraction
// ---------------------------------------------------------------------------

async function detectShopify(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // Check for Shopify signatures
    if ((window as any).Shopify) return true;
    if (document.querySelector('link[href*="cdn.shopify.com"]')) return true;
    if (document.querySelector('script[src*="cdn.shopify.com"]')) return true;
    if (document.querySelector('meta[name="shopify-checkout-api-token"]')) return true;
    // Check if any images come from Shopify CDN
    const imgs = document.querySelectorAll('img[src*="cdn.shopify.com"]');
    if (imgs.length > 0) return true;
    return false;
  });
}

async function extractShopify(page: Page, config: PublisherConfig): Promise<RawBook[]> {
  const urlPatterns = getUrlPatterns(config);

  return page.evaluate(
    ({ publisherName, patterns }) => {
      const books: Array<{ title: string; coverUrl: string; publisherName: string }> = [];
      const seen = new Set<string>();

      // Find all links that look like product pages
      const links = document.querySelectorAll('a[href]');
      for (const link of links) {
        const href = link.getAttribute('href') ?? '';

        // Check if this link matches a book URL pattern
        const isBookLink = patterns.some((p) => href.includes(p));
        if (!isBookLink) continue;

        // Deduplicate by href
        const normalizedHref = href.replace(/\?.*$/, '').replace(/#.*$/, '');
        if (seen.has(normalizedHref)) continue;
        seen.add(normalizedHref);

        // Find cover image: check inside the link first, then siblings
        let coverUrl = '';
        const img = link.querySelector('img');
        if (img) {
          coverUrl = img.getAttribute('src') ?? img.getAttribute('data-src') ?? img.getAttribute('data-srcset')?.split(' ')[0] ?? '';
        }

        // If no img inside the link, look in parent container
        if (!coverUrl) {
          const parent = link.closest('[class*="product"], [class*="card"], [class*="book"], [class*="item"], li, article');
          if (parent) {
            const parentImg = parent.querySelector('img');
            if (parentImg) {
              coverUrl = parentImg.getAttribute('src') ?? parentImg.getAttribute('data-src') ?? '';
            }
          }
        }

        // If still no image, check preceding sibling or next sibling
        if (!coverUrl) {
          const prevEl = link.previousElementSibling;
          if (prevEl) {
            const sibImg = prevEl.tagName === 'IMG' ? prevEl : prevEl.querySelector('img');
            if (sibImg) {
              coverUrl = sibImg.getAttribute('src') ?? sibImg.getAttribute('data-src') ?? '';
            }
          }
        }
        if (!coverUrl) {
          const nextEl = link.nextElementSibling;
          if (nextEl) {
            const sibImg = nextEl.tagName === 'IMG' ? nextEl : nextEl.querySelector('img');
            if (sibImg) {
              coverUrl = sibImg.getAttribute('src') ?? sibImg.getAttribute('data-src') ?? '';
            }
          }
        }

        // Extract title: link text, aria-label, alt text of image, or URL slug
        let title = '';
        // Try link text
        const textContent = link.textContent?.trim() ?? '';
        if (textContent && textContent.length < 200 && textContent.length > 1) {
          title = textContent;
        }
        // Try aria-label
        if (!title) {
          title = link.getAttribute('aria-label') ?? '';
        }
        // Try img alt text
        if (!title && img) {
          title = img.getAttribute('alt') ?? '';
        }
        // Fall back to URL slug
        if (!title) {
          const slug = normalizedHref.split('/').filter(Boolean).pop() ?? '';
          title = slug.replace(/-/g, ' ').replace(/^\d+-/, '').trim();
          // Title case
          title = title.replace(/\b\w/g, (c) => c.toUpperCase());
        }

        if (!title || !coverUrl) continue;

        // Filter out non-cover images (icons, logos, etc.)
        if (coverUrl.includes('logo') || coverUrl.includes('icon') || coverUrl.includes('badge')) continue;

        books.push({ title, coverUrl, publisherName });
      }

      return books;
    },
    { publisherName: config.name, patterns: urlPatterns }
  );
}

// ---------------------------------------------------------------------------
// Strategy 3: Generic pattern-based extraction (link + nearest image)
// ---------------------------------------------------------------------------

async function extractByPatterns(page: Page, config: PublisherConfig): Promise<RawBook[]> {
  const urlPatterns = getUrlPatterns(config);
  const baseUrl = config.url;

  return page.evaluate(
    ({ publisherName, patterns, baseUrl }) => {
      const books: Array<{ title: string; coverUrl: string; publisherName: string; genres?: string[] }> = [];
      const seen = new Set<string>();

      const links = document.querySelectorAll('a[href]');

      for (const link of links) {
        const href = link.getAttribute('href') ?? '';
        const fullHref = href.startsWith('http') ? href : new URL(href, baseUrl).href;

        // Check if this link matches a book URL pattern
        const isBookLink = patterns.some((p) => href.includes(p) || fullHref.includes(p));
        if (!isBookLink) continue;

        // Deduplicate by path
        const normalizedHref = fullHref.replace(/\?.*$/, '').replace(/#.*$/, '');
        if (seen.has(normalizedHref)) continue;
        seen.add(normalizedHref);

        // Find the closest container that likely wraps a single book
        const container =
          link.closest('[class*="book"], [class*="product"], [class*="card"], [class*="item"], [class*="entry"], li, article, [class*="grid"] > div, [class*="list"] > div') ??
          link.parentElement?.parentElement ??
          link.parentElement;

        // Find cover image
        let coverUrl = '';

        // 1. Image inside the link
        const imgInLink = link.querySelector('img');
        if (imgInLink) {
          coverUrl = imgInLink.getAttribute('src') ?? imgInLink.getAttribute('data-src') ?? '';
        }

        // 2. Image in the container
        if (!coverUrl && container) {
          const imgs = container.querySelectorAll('img');
          for (const img of imgs) {
            const src = img.getAttribute('src') ?? img.getAttribute('data-src') ?? '';
            // Skip tiny images (likely icons) and logos
            if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('badge')) {
              const width = img.getAttribute('width');
              const naturalWidth = (img as HTMLImageElement).naturalWidth;
              // Skip very small images
              if (width && parseInt(width) < 40) continue;
              if (naturalWidth && naturalWidth < 40) continue;
              coverUrl = src;
              break;
            }
          }
        }

        // 3. Background image on container elements
        if (!coverUrl && container) {
          const bgElements = container.querySelectorAll('[style*="background-image"]');
          for (const el of bgElements) {
            const style = el.getAttribute('style') ?? '';
            const match = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
            if (match?.[1]) {
              coverUrl = match[1];
              break;
            }
          }
        }

        // Extract title
        let title = '';

        // 1. Explicit title elements in container
        if (container) {
          const titleEl =
            container.querySelector('[class*="title"], [class*="name"], h2, h3, h4') as HTMLElement | null;
          if (titleEl && titleEl !== link) {
            title = titleEl.textContent?.trim() ?? '';
          }
        }

        // 2. Link text content (if not too long)
        if (!title) {
          const linkText = link.textContent?.trim() ?? '';
          if (linkText.length > 1 && linkText.length < 200) {
            title = linkText;
          }
        }

        // 3. aria-label on the link
        if (!title) {
          title = link.getAttribute('aria-label')?.trim() ?? '';
        }

        // 4. alt text on cover image
        if (!title && imgInLink) {
          title = imgInLink.getAttribute('alt')?.trim() ?? '';
        }
        if (!title && container) {
          const img = container.querySelector('img');
          if (img) {
            title = img.getAttribute('alt')?.trim() ?? '';
          }
        }

        // 5. URL slug as last resort
        if (!title) {
          const slug = normalizedHref.split('/').filter(Boolean).pop() ?? '';
          title = slug
            .replace(/-/g, ' ')
            .replace(/^\d+-/, '') // remove leading ISBN-like prefix
            .trim()
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }

        if (!title || !coverUrl) continue;

        // Try to extract genre labels from container
        const genres: string[] = [];
        if (container) {
          const genreEl = container.querySelector('[class*="genre"], [class*="category"], [class*="tag"], [class*="label"]') as HTMLElement | null;
          if (genreEl) {
            const genreText = genreEl.textContent?.trim();
            if (genreText && genreText.length < 50) {
              genres.push(genreText);
            }
          }
        }

        books.push({
          title,
          coverUrl: coverUrl.startsWith('http') ? coverUrl : new URL(coverUrl, baseUrl).href,
          publisherName,
          genres: genres.length > 0 ? genres : undefined,
        });
      }

      return books;
    },
    { publisherName: config.name, patterns: urlPatterns, baseUrl }
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get URL patterns to match book links for a given publisher.
 * Uses the config's url_pattern field if available, otherwise defaults.
 */
function getUrlPatterns(config: PublisherConfig): string[] {
  if (config.url_pattern) {
    // url_pattern can be a single string or comma-separated
    const patterns = config.url_pattern.split(',').map((p) => p.trim()).filter(Boolean);
    if (patterns.length > 0) return patterns;
  }
  return DEFAULT_BOOK_URL_PATTERNS;
}

/**
 * Normalize a potentially relative image URL to absolute.
 */
function normalizeImageUrl(url: string, baseUrl: string): string {
  if (!url) return '';
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('http')) return url;
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return url;
  }
}
