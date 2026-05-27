/**
 * Shared types for navigation strategies.
 */

import type { Page } from 'playwright';

export interface NavigationOptions {
  next_selector?: string;
  max_pages?: number;
  scroll_count?: number;
  click_selector?: string;
  wait_ms?: number;
}

export interface NavigationResult {
  /** Whether navigation completed successfully */
  success: boolean;
  /** Number of pages/steps navigated */
  pagesVisited: number;
  /** Any errors encountered */
  errors: string[];
}

/**
 * Base interface for all navigation strategies.
 * Each strategy loads all content on the page so that book selectors can extract everything.
 */
export interface INavigationStrategy {
  navigate(page: Page, options?: NavigationOptions): Promise<NavigationResult>;
}
