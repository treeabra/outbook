# Implementation Plan: Forthcoming Covers Gallery

## Overview

This plan implements an automated pipeline that scrapes forthcoming book covers from ~40 publisher websites, processes them into a browsable static gallery, and hosts the result on GitHub Pages. The implementation uses Node.js 20 with TypeScript, Playwright for headless browsing, Sharp for image processing, and Vitest + fast-check for testing.

## Tasks

- [x] 1. Set up project structure and core configuration
  - [x] 1.1 Initialize Node.js project with TypeScript configuration
    - Create `package.json` with dependencies: playwright, sharp, tesseract.js, imghash, js-yaml, vitest, fast-check
    - Create `tsconfig.json` with strict mode, ES2022 target, Node module resolution
    - Create directory structure: `src/scraper/`, `src/generator/`, `src/health-check/`, `config/`, `covers/hires/`, `covers/thumbs/`, `data/`, `site/`, `tests/unit/`, `tests/property/`
    - Add npm scripts: `build`, `test`, `test:integration`, `test:all`, `scrape`, `generate`, `health-check`
    - _Requirements: 6.1, 6.2_

  - [x] 1.2 Define core TypeScript interfaces and types
    - Create `src/types.ts` with `Book`, `RawBook`, `Genre`, `PublisherConfig`, `PlaceholderConfig`, `NavigationStrategy`, `ImageResult`, `ProcessedImage`, `ScrapeResult`, `PublisherResult`, `PublisherFailure` interfaces
    - Define the `Genre` union type with all six categories
    - Define navigation type literals: `"static" | "paginated" | "carousel" | "infinite-scroll" | "multi-click"`
    - _Requirements: 11.4_

  - [x] 1.3 Implement publisher configuration parser and validator
    - Create `src/config/config-parser.ts` that reads and parses `config/publishers.yaml`
    - Validate required fields: name, url, navigation, hires_source, placeholder, default_genre
    - Return typed `PublisherConfig[]` array
    - Fail fast with clear error messages on invalid YAML or missing required fields
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 1.4 Write property test for publisher config round-trip parsing
    - **Property 9: Publisher config round-trip parsing**
    - **Validates: Requirements 7.2**

  - [x] 1.5 Create sample `config/publishers.yaml` with inline documentation
    - Include 2-3 example publisher entries demonstrating different navigation types
    - Add inline comments explaining each field and providing examples
    - _Requirements: 7.1, 7.2, 7.4_

- [x] 2. Implement publisher scraping engine
  - [x] 2.1 Implement navigation strategies
    - Create `src/scraper/navigation/` directory with strategy files
    - Implement `StaticStrategy`: single page, extract all visible books
    - Implement `PaginatedStrategy`: follow next-page links up to `max_pages`
    - Implement `CarouselStrategy`: interact with carousel to reveal hidden items
    - Implement `InfiniteScrollStrategy`: scroll page to trigger lazy loading
    - Implement `MultiClickStrategy`: click elements to reveal content
    - Each strategy accepts Playwright `Page` and `NavigationOptions`, returns when all content is loaded
    - _Requirements: 3.3, 3.4_

  - [x] 2.2 Implement publisher scraper
    - Create `src/scraper/publisher-scraper.ts`
    - Accept `PublisherConfig` and Playwright `Browser`, return `RawBook[]`
    - Use configured selectors (`book_selector`, `title_selector`, `cover_selector`, `isbn_selector`) to extract book data
    - Apply the appropriate navigation strategy based on `config.navigation`
    - Handle timeouts (30s per page) and selector-not-found errors gracefully
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 2.3 Implement scraper orchestrator
    - Create `src/scraper/orchestrator.ts`
    - Read publisher configs, launch Playwright browser, iterate through publishers
    - Collect results from each publisher scraper
    - Handle per-publisher failures (log error, skip, continue with remaining)
    - Restart browser on crash, retry current publisher once
    - Return `ScrapeResult` with totals and failure list
    - _Requirements: 3.1, 3.5, 3.6_

- [x] 3. Implement hi-res image retrieval
  - [x] 3.1 Implement Amazon hi-res retriever
    - Create `src/scraper/hires-retriever.ts` with `AmazonRetriever` class
    - Navigate to Amazon product page using ISBN
    - Extract highest-resolution cover image (look for `data-old-hires` attribute or zoom image URL)
    - Rate-limit requests to 1 per 2 seconds
    - Use exponential backoff (1s, 2s, 4s) with max 3 retries
    - _Requirements: 4.1_

  - [x] 3.2 Implement Waterstones hi-res retriever
    - Add `WaterstonesRetriever` class to `src/scraper/hires-retriever.ts`
    - Navigate to Waterstones product page using ISBN
    - Extract highest-resolution cover image
    - Apply same rate-limiting and retry strategy
    - _Requirements: 4.2_

  - [x] 3.3 Implement direct source retriever
    - Add `DirectRetriever` class for publishers that host their own hi-res images
    - Download image directly from the cover URL found on the publisher page
    - Apply retry strategy on network failures
    - _Requirements: 4.3_

  - [x] 3.4 Implement retriever dispatcher
    - Create a dispatcher function that selects the correct retriever based on `config.hires_source`
    - Log failures and return `null` for books where retrieval fails
    - _Requirements: 4.4_

  - [ ]* 3.5 Write property test for failed image retrieval
    - **Property 6: Failed image retrieval skips book**
    - **Validates: Requirements 4.4**

- [x] 4. Implement placeholder detection
  - [x] 4.1 Implement placeholder detector
    - Create `src/scraper/placeholder-detector.ts`
    - Implement detection methods in order (cheapest first):
      1. File size check: reject images below `min_file_size_kb`
      2. Perceptual hash comparison: compare against `known_hashes` using imghash
      3. OCR text detection: use Tesseract.js to detect `text_patterns`
    - Return `true` if any check matches, `false` otherwise
    - _Requirements: 5.1, 5.2, 5.3_

  - [ ]* 4.2 Write property test for placeholder detection correctness
    - **Property 7: Placeholder detection correctness**
    - **Validates: Requirements 5.2**

  - [ ]* 4.3 Write property test for placeholder-to-real cover transition
    - **Property 8: Placeholder-to-real cover transition**
    - **Validates: Requirements 5.4**

- [x] 5. Implement image processing and storage
  - [x] 5.1 Implement image processor
    - Create `src/scraper/image-processor.ts`
    - Accept `ImageResult` and `Book`, save hi-res JPEG to `covers/hires/`
    - Generate 300px-wide WebP thumbnail using Sharp, save to `covers/thumbs/`
    - Implement filename sanitization: lowercase, replace spaces/special chars with hyphens, pattern `{publisher}_{book-title}`
    - Return `ProcessedImage` with paths and dimensions
    - _Requirements: 2.2, 9.2_

  - [ ]* 5.2 Write property test for download filename pattern
    - **Property 3: Download filename follows naming pattern**
    - **Validates: Requirements 2.2**

  - [x] 5.3 Implement cover store sync logic
    - Create `src/scraper/cover-store.ts`
    - Compare newly scraped books against existing `data/books.json`
    - Add new books, remove books no longer listed as forthcoming
    - Delete orphaned image files from `covers/hires/` and `covers/thumbs/`
    - Update `lastSeen` date for books still present
    - _Requirements: 3.6, 5.4_

  - [ ]* 5.4 Write property test for cover store sync
    - **Property 5: Cover store sync adds new and removes stale books**
    - **Validates: Requirements 3.6**

- [x] 6. Implement genre classification
  - [x] 6.1 Implement genre normalization
    - Create `src/scraper/genre-normalizer.ts`
    - Map source genre tags to the six valid categories: "Nonfiction", "Literary & Historical Fiction", "Translation, Poetry & Short Stories", "Science Fiction & Fantasy", "Thriller & Mystery", "Romance, Young Adult & Graphic Novel"
    - Retain all applicable genres when a book has multiple tags
    - Fall back to `default_genre` from publisher config when no genre metadata is available
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]* 6.2 Write property test for genre normalization
    - **Property 16: Genre normalization produces valid categories and retains all applicable**
    - **Validates: Requirements 11.4, 11.5**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement site generator
  - [x] 8.1 Implement books manifest generator
    - Create `src/generator/site-generator.ts`
    - Generate `data/books.json` with `lastUpdated`, `totalBooks`, and `books` array
    - Only include books that have valid hi-res image files
    - Sort books alphabetically by publisher name (case-insensitive)
    - _Requirements: 2.3, 10.4_

  - [ ]* 8.2 Write property test for books without hi-res images excluded
    - **Property 4: Books without hi-res images are excluded**
    - **Validates: Requirements 2.3**

  - [ ]* 8.3 Write property test for default sort order
    - **Property 15: Default sort is alphabetical by publisher**
    - **Validates: Requirements 10.4**

  - [x] 8.4 Generate static gallery HTML page
    - Create `site/index.html` with responsive CSS grid layout
    - Include genre filter buttons for all 6 categories
    - Include publisher filter dropdown
    - Include book count display
    - Add `<noscript>` fallback that still shows all covers
    - _Requirements: 1.1, 1.2, 10.1, 10.5_

  - [x] 8.5 Implement gallery CSS
    - Create `site/style.css` with responsive grid layout
    - Style filter buttons and publisher dropdown
    - Style book cards with title and publisher text beneath thumbnails
    - Ensure responsive behavior across viewport sizes
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 8.6 Implement gallery JavaScript
    - Create `site/gallery.js`
    - Load `data/books.json` and render book cards dynamically
    - Implement lazy loading with Intersection Observer
    - Implement genre filter (show only matching books)
    - Implement publisher filter
    - Implement click-to-download hi-res functionality
    - Display and update book count on filter changes
    - _Requirements: 1.3, 2.1, 9.1, 9.3, 10.1, 10.2, 10.3, 10.5_

  - [ ]* 8.7 Write property test for book rendering includes title and publisher
    - **Property 1: Book rendering includes title and publisher**
    - **Validates: Requirements 1.3**

  - [ ]* 8.8 Write property test for empty publishers omitted
    - **Property 2: Empty publishers are omitted from gallery**
    - **Validates: Requirements 1.4**

  - [ ]* 8.9 Write property test for gallery uses thumbnail paths
    - **Property 12: Gallery uses thumbnail paths**
    - **Validates: Requirements 9.2**

  - [ ]* 8.10 Write property test for genre filter correctness
    - **Property 13: Genre filter returns only matching books**
    - **Validates: Requirements 10.1, 10.2**

  - [ ]* 8.11 Write property test for displayed count matches filtered results
    - **Property 14: Displayed count matches filtered results**
    - **Validates: Requirements 10.3**

- [x] 9. Implement health check system
  - [x] 9.1 Implement health check runner
    - Create `src/health-check/runner.ts`
    - Attempt to scrape each publisher (reuse publisher scraper logic)
    - Classify each publisher as "pass" or "fail" based on: zero books found, navigation errors, or image retrieval failures
    - Return `HealthCheckResult` with passed and failed lists
    - _Requirements: 8.1, 8.2_

  - [x] 9.2 Implement health check alerting
    - Create GitHub Issue when one or more publishers fail
    - Issue body lists each failing publisher name and error description
    - Do not create issue when all publishers pass; log success summary instead
    - _Requirements: 8.3, 8.5_

  - [ ]* 9.3 Write property test for health check pass/fail classification
    - **Property 10: Health check pass/fail classification**
    - **Validates: Requirements 8.2**

  - [ ]* 9.4 Write property test for health check alert contains all failures
    - **Property 11: Health check alert contains all failures**
    - **Validates: Requirements 8.3**

- [x] 10. Implement GitHub Actions workflows
  - [x] 10.1 Create scraping workflow
    - Create `.github/workflows/scrape.yml`
    - Schedule: weekly cron trigger (configurable)
    - Steps: checkout, setup Node.js 20, install dependencies, install Playwright browsers, run scraper, commit and push changes
    - Set workflow timeout to 60 minutes
    - _Requirements: 3.5, 6.1_

  - [x] 10.2 Create health check workflow
    - Create `.github/workflows/health-check.yml`
    - Schedule: monthly cron trigger
    - Steps: checkout, setup Node.js 20, install dependencies, install Playwright browsers, run health check, create GitHub Issue on failures
    - _Requirements: 8.4_

  - [x] 10.3 Create GitHub Pages deployment configuration
    - Configure repository for GitHub Pages deployment from the repository root or `site/` directory
    - Ensure `covers/` and `data/` directories are accessible from the deployed site
    - _Requirements: 6.1, 6.3, 6.4_

- [x] 11. Wire pipeline end-to-end
  - [x] 11.1 Create main entry point for scraping pipeline
    - Create `src/main.ts` that wires together: config parser → orchestrator → publisher scraper → hi-res retriever → placeholder detector → image processor → cover store sync → site generator
    - Accept CLI arguments for single-publisher testing
    - _Requirements: 3.1, 3.6_

  - [x] 11.2 Create main entry point for health check
    - Create `src/health-check-main.ts` that wires together: config parser → health check runner → alerting
    - _Requirements: 8.1, 8.4_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout with Node.js 20 runtime
- All external HTTP requests use exponential backoff and rate limiting as specified in the design
