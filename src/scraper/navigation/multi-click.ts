/**
 * Multi-click navigation strategy.
 * Clicks elements to reveal hidden content (tabs, expandable sections, popups).
 */

import type { Page } from 'playwright';
import type { INavigationStrategy, NavigationOptions, NavigationResult } from './types.js';

export class MultiClickStrategy implements INavigationStrategy {
  async navigate(page: Page, options?: NavigationOptions): Promise<NavigationResult> {
    const clickSelector = options?.click_selector ?? '.reveal-btn';
    const waitMs = options?.wait_ms ?? 800;
    const errors: string[] = [];
    let clicksPerformed = 0;

    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch {
      // Continue
    }

    // Click all matching elements (tabs, reveal buttons, etc.)
    const selectors = clickSelector.split(',').map(s => s.trim());

    for (const selector of selectors) {
      try {
        const elements = await page.$$(selector);
        for (const element of elements) {
          try {
            const isVisible = await element.isVisible();
            if (isVisible) {
              await element.click();
              await page.waitForTimeout(waitMs);
              clicksPerformed++;
            }
          } catch (err) {
            errors.push(`Click on "${selector}" failed: ${(err as Error).message}`);
          }
        }
      } catch (err) {
        errors.push(`Selector "${selector}" failed: ${(err as Error).message}`);
      }
    }

    return {
      success: true,
      pagesVisited: clicksPerformed + 1,
      errors,
    };
  }
}
