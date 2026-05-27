/**
 * Paginated navigation strategy.
 * Follows next-page links up to max_pages to collect all forthcoming books.
 */

import type { Page } from 'playwright';
import type { INavigationStrategy, NavigationOptions, NavigationResult } from './types.js';

export class PaginatedStrategy implements INavigationStrategy {
  async navigate(page: Page, options?: NavigationOptions): Promise<NavigationResult> {
    const nextSelector = options?.next_selector ?? 'a.next';
    const maxPages = options?.max_pages ?? 5;
    const waitMs = options?.wait_ms ?? 1000;
    const errors: string[] = [];
    let pagesVisited = 1;

    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch {
      // Continue even if networkidle times out
    }

    for (let i = 1; i < maxPages; i++) {
      try {
        const nextLink = await page.$(nextSelector);
        if (!nextLink) {
          break; // No more pages
        }

        await nextLink.click();
        await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(waitMs);
        pagesVisited++;
      } catch (err) {
        errors.push(`Failed to navigate to page ${i + 1}: ${(err as Error).message}`);
        break;
      }
    }

    return {
      success: errors.length === 0,
      pagesVisited,
      errors,
    };
  }
}
