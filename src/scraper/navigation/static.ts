/**
 * Static navigation strategy.
 * Used for pages where all forthcoming books are visible on a single page load.
 */

import type { Page } from 'playwright';
import type { INavigationStrategy, NavigationOptions, NavigationResult } from './types.js';

export class StaticStrategy implements INavigationStrategy {
  async navigate(page: Page, _options?: NavigationOptions): Promise<NavigationResult> {
    // For static pages, content is already loaded after initial page navigation.
    // Wait for the page to be fully loaded.
    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
    } catch {
      // networkidle timeout is acceptable — content may already be present
    }

    return {
      success: true,
      pagesVisited: 1,
      errors: [],
    };
  }
}
