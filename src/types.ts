/**
 * Core TypeScript interfaces and types for the Forthcoming Covers Gallery.
 *
 * Defines the data models used throughout the scraping pipeline,
 * image processing, site generation, and health check systems.
 */

// ---------------------------------------------------------------------------
// Genre
// ---------------------------------------------------------------------------

/**
 * The six valid genre categories used for filtering in the gallery.
 * Books are normalized to these categories from source genre tags.
 */
export type Genre =
  | "Nonfiction"
  | "Literary & Historical Fiction"
  | "Translation, Poetry & Short Stories"
  | "Science Fiction & Fantasy"
  | "Thriller & Mystery"
  | "Romance, Young Adult & Graphic Novel";

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

/**
 * Navigation strategy type literals describing how a publisher's
 * forthcoming page is structured and how the scraper should traverse it.
 */
export type NavigationStrategy =
  | "static"
  | "paginated"
  | "carousel"
  | "infinite-scroll"
  | "multi-click";

// ---------------------------------------------------------------------------
// Book Models
// ---------------------------------------------------------------------------

/**
 * A raw book entry as extracted directly from a publisher page,
 * before hi-res retrieval and processing.
 */
export interface RawBook {
  title: string;
  coverUrl: string;
  isbn?: string;
  genres?: string[];
  publisherName: string;
}

/**
 * A fully processed book ready for inclusion in the gallery manifest.
 */
export interface Book {
  id: string;
  title: string;
  publisher: string;
  genres: Genre[];
  hiresFilename: string;
  thumbFilename: string;
  isbn?: string;
  dateDiscovered: string;
  lastSeen: string;
}

// ---------------------------------------------------------------------------
// Publisher Configuration
// ---------------------------------------------------------------------------

/**
 * Placeholder detection configuration for a publisher.
 * Detection methods are applied in order from cheapest to most expensive.
 */
export interface PlaceholderConfig {
  known_hashes?: string[];
  text_patterns?: string[];
  min_file_size_kb?: number;
}

/**
 * Parsed publisher configuration from publishers.yaml.
 * Defines how to scrape a specific publisher's forthcoming page.
 */
export interface PublisherConfig {
  name: string;
  url: string;
  navigation: NavigationStrategy;
  navigation_options?: {
    next_selector?: string;
    max_pages?: number;
    scroll_count?: number;
    click_selector?: string;
    wait_ms?: number;
  };
  book_selector: string;
  title_selector: string;
  cover_selector: string;
  hires_source: "amazon" | "waterstones" | "direct";
  isbn_selector?: string;
  default_genre: Genre;
  placeholder: PlaceholderConfig;
  /**
   * Optional URL pattern(s) to identify book detail links.
   * Comma-separated if multiple (e.g., "/products/,/books/").
   * Used by the pattern-based scraper fallback when CSS selectors don't match.
   */
  url_pattern?: string;
}

// ---------------------------------------------------------------------------
// Image Processing
// ---------------------------------------------------------------------------

/**
 * Result of retrieving a hi-res image from an external source.
 */
export interface ImageResult {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  sourceUrl: string;
}

/**
 * Result of processing an image through the image pipeline
 * (saving hi-res and generating thumbnail).
 */
export interface ProcessedImage {
  hiresPath: string;
  thumbPath: string;
  thumbWidth: number;
  thumbHeight: number;
}

// ---------------------------------------------------------------------------
// Scrape Results
// ---------------------------------------------------------------------------

/**
 * Overall result of a full scraping run across all publishers.
 */
export interface ScrapeResult {
  totalBooks: number;
  newBooks: number;
  removedBooks: number;
  failures: PublisherFailure[];
}

/**
 * Result of scraping a single publisher.
 */
export interface PublisherResult {
  publisherName: string;
  books: Book[];
  errors: string[];
}

/**
 * Record of a publisher that failed during scraping.
 */
export interface PublisherFailure {
  publisherName: string;
  error: string;
}
