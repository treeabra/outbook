/**
 * Infinite scroll navigation strategy.
 * Scrolls the page to trigger lazy loading of additional content.
 */

import type { Page } from 'playwright';
import type { INavigationStrategy, NavigationOptions, NavigationResult } from './types.js';

export class InfiniteScrollStrategy implements INavigationStrategy {
  async navigate(page: Page, options?: NavigationOptions): Promise<NavigationResult> {
    const scrollCount = options?.scroll_count ?? 10;
    const waitMs = options?.wait_ms ?? 1000;
    const errors: string[] = [];
    let scrollsPerformed = 0;

    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch {
      // Continue
    }

    for (let i = 0; i < scrollCount; i++) {
      try {
        const previousHeight = await page.evaluate(() => document.body.scrollHeight);

        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(waitMs);

        const newHeight = await page.evaluate(() => document.body.scrollHeight);
        scrollsPerformed++;

        // If page height didn't change, we've reached the end
        if (newHeight === previousHeight) {
          break;
        }
      } catch (err) {
        errors.push(`Scroll ${i + 1} failed: ${(err as Error).message}`);
        break;
      }
    }

    return {
      success: true,
      pagesVisited: scrollsPerformed + 1,
      errors,
    };
  }
}
