/**
 * Carousel navigation strategy.
 * Interacts with carousel controls to reveal all hidden items.
 */

import type { Page } from 'playwright';
import type { INavigationStrategy, NavigationOptions, NavigationResult } from './types.js';

export class CarouselStrategy implements INavigationStrategy {
  async navigate(page: Page, options?: NavigationOptions): Promise<NavigationResult> {
    const clickSelector = options?.click_selector ?? '.carousel-next';
    const waitMs = options?.wait_ms ?? 500;
    const errors: string[] = [];
    let clicks = 0;
    const maxClicks = 20; // Safety limit

    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch {
      // Continue
    }

    // Click the carousel next button until it's no longer available or we hit the limit
    while (clicks < maxClicks) {
      try {
        const nextBtn = await page.$(clickSelector);
        if (!nextBtn) break;

        const isVisible = await nextBtn.isVisible();
        const isDisabled = await nextBtn.getAttribute('disabled');
        if (!isVisible || isDisabled !== null) break;

        await nextBtn.click();
        await page.waitForTimeout(waitMs);
        clicks++;
      } catch (err) {
        errors.push(`Carousel click ${clicks + 1} failed: ${(err as Error).message}`);
        break;
      }
    }

    return {
      success: true,
      pagesVisited: clicks + 1,
      errors,
    };
  }
}
