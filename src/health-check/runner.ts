/**
 * Health check runner.
 * Attempts to scrape each publisher and classifies results as pass/fail.
 */

import { chromium, type Browser } from 'playwright';
import type { PublisherConfig } from '../types.js';
import { scrapePublisher } from '../scraper/publisher-scraper.js';

export interface PublisherHealthStatus {
  publisherName: string;
  status: 'pass' | 'fail';
  booksFound: number;
  error?: string;
}

export interface HealthCheckResult {
  passed: PublisherHealthStatus[];
  failed: PublisherHealthStatus[];
}

/**
 * Run health check against all configured publishers.
 * Classifies each as pass or fail based on scraping results.
 */
export async function runHealthCheck(configs: PublisherConfig[]): Promise<HealthCheckResult> {
  const passed: PublisherHealthStatus[] = [];
  const failed: PublisherHealthStatus[] = [];

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    for (const config of configs) {
      const status = await checkPublisher(config, browser);
      if (status.status === 'pass') {
        passed.push(status);
      } else {
        failed.push(status);
      }
    }
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }

  return { passed, failed };
}

async function checkPublisher(config: PublisherConfig, browser: Browser): Promise<PublisherHealthStatus> {
  try {
    console.log(`[HealthCheck] Checking: ${config.name}`);
    const books = await scrapePublisher(config, browser);

    if (books.length === 0) {
      return {
        publisherName: config.name,
        status: 'fail',
        booksFound: 0,
        error: 'Zero books found — possible site structure change',
      };
    }

    return {
      publisherName: config.name,
      status: 'pass',
      booksFound: books.length,
    };
  } catch (err) {
    return {
      publisherName: config.name,
      status: 'fail',
      booksFound: 0,
      error: (err as Error).message,
    };
  }
}
