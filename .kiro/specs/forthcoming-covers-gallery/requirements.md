# Requirements Document

## Introduction

A free, static webpage that displays a scrollable grid of forthcoming book covers from approximately 40 publishers. The system automatically scrapes publisher websites to discover newly announced books, retrieves hi-res cover images (primarily from Amazon.com or Waterstones.com), detects and skips placeholder images, and presents the results in a simple gallery. The page is hosted on GitHub Pages at no cost and is accessible to all team members. A monthly health check verifies that publisher site structures have not changed in ways that break scraping.

## Glossary

- **Gallery_Page**: The static HTML webpage that displays the scrollable grid of book cover thumbnails and provides download links to hi-res images.
- **Scraper**: The automated process that visits publisher websites, identifies forthcoming books, and retrieves cover image URLs.
- **Publisher_Config**: A user-editable configuration file that defines, for each publisher, the URL to visit, navigation instructions, hi-res image source, and placeholder image descriptions.
- **Placeholder_Image**: A non-final cover image used by a publisher when the actual cover art is not yet available (e.g., images containing "Cover Coming Soon" text, publisher logos, author photos, or "Cover to be Revealed" text).
- **Hi_Res_Image**: The highest-resolution JPEG cover image available for a forthcoming book, typically sourced from Amazon.com product pages or Waterstones.com for Granta Books.
- **Health_Check**: A monthly automated process that verifies each publisher's website structure has not changed in a way that breaks scraping.
- **Cover_Store**: The repository of downloaded hi-res cover images served by the Gallery_Page.
- **GitHub_Actions**: The CI/CD automation platform used to run the Scraper and Health_Check on a schedule at no cost.

## Requirements

### Requirement 1: Display Cover Grid

**User Story:** As a team member, I want to see a scrollable grid of forthcoming book covers, so that I can quickly browse newly announced titles across all publishers.

#### Acceptance Criteria

1. THE Gallery_Page SHALL display all available forthcoming book covers in a responsive grid layout.
2. WHEN a team member loads the Gallery_Page, THE Gallery_Page SHALL display cover thumbnails organized in a scrollable grid.
3. THE Gallery_Page SHALL NOT display book title or publisher name beneath cover thumbnails; the cover image alone is sufficient.
4. WHEN no covers are available for a publisher, THE Gallery_Page SHALL omit that publisher from the grid rather than displaying empty sections.

### Requirement 2: Hi-Res Cover Download

**User Story:** As a team member, I want to click on a cover to download the hi-res JPEG, so that I can use the image in my work.

#### Acceptance Criteria

1. WHEN a team member clicks on a cover thumbnail, THE Gallery_Page SHALL initiate a download of the corresponding Hi_Res_Image in JPEG format.
2. THE Gallery_Page SHALL name downloaded files using the pattern `{publisher}_{book-title}.jpg`.
3. WHEN a Hi_Res_Image is unavailable, THE Gallery_Page SHALL not display that book in the grid.

### Requirement 3: Automated Publisher Scraping

**User Story:** As a team member, I want the system to automatically collect forthcoming covers from all configured publishers, so that the gallery stays current without manual intervention.

#### Acceptance Criteria

1. WHEN the scheduled scraping job runs, THE Scraper SHALL visit each publisher URL defined in the Publisher_Config.
2. THE Scraper SHALL identify all books listed as forthcoming or coming soon on each publisher page.
3. WHEN a publisher page uses pagination, THE Scraper SHALL navigate through all available pages to collect all forthcoming books.
4. WHEN a publisher page uses a carousel, THE Scraper SHALL extract all items from the carousel including those not initially visible.
5. THE Scraper SHALL run on a configurable schedule via GitHub_Actions.
6. WHEN the Scraper completes a run, THE Scraper SHALL update the Cover_Store with newly discovered covers and remove covers that are no longer listed as forthcoming.

### Requirement 4: Hi-Res Image Retrieval

**User Story:** As a team member, I want the system to find the highest-resolution cover images available, so that I have publication-quality images for my work.

#### Acceptance Criteria

1. WHEN the Publisher_Config specifies Amazon.com as the hi-res source, THE Scraper SHALL navigate to the Amazon.com product page for each book and retrieve the highest-resolution cover image available.
2. WHEN the Publisher_Config specifies Waterstones.com as the hi-res source, THE Scraper SHALL navigate to the Waterstones.com product page and retrieve the highest-resolution cover image available.
3. WHEN the Publisher_Config specifies a direct download source, THE Scraper SHALL retrieve the hi-res image directly from the publisher page.
4. IF the Scraper cannot retrieve a hi-res image from the configured source, THEN THE Scraper SHALL log the failure and skip that book.

### Requirement 5: Placeholder Image Detection

**User Story:** As a team member, I want the system to skip placeholder images, so that I only see actual finalized cover art in the gallery.

#### Acceptance Criteria

1. THE Scraper SHALL evaluate each retrieved cover image against the placeholder detection rules defined in the Publisher_Config for that publisher.
2. WHEN a cover image matches a placeholder pattern (text overlays such as "Cover Coming Soon" or "Cover to be Revealed", publisher logos used as covers, or author photos used as covers), THE Scraper SHALL skip that book and not include the image in the Cover_Store.
3. THE Scraper SHALL support publisher-specific placeholder definitions so that each publisher's unique placeholder style is detected.
4. WHEN a previously skipped placeholder is replaced with a final cover on a subsequent scraping run, THE Scraper SHALL include the book in the Cover_Store.

### Requirement 6: Free Static Hosting

**User Story:** As the site owner, I want the gallery hosted for free on GitHub Pages, so that there are no ongoing hosting costs.

#### Acceptance Criteria

1. THE Gallery_Page SHALL be deployable as a static site on GitHub Pages.
2. THE Gallery_Page SHALL require no server-side processing at runtime.
3. THE Cover_Store SHALL store images within the GitHub repository or use a free CDN compatible with GitHub Pages.
4. THE Gallery_Page SHALL be accessible via a public URL without authentication.

### Requirement 7: Publisher Configuration Management

**User Story:** As a non-developer site maintainer, I want to update publisher scraping instructions in a simple configuration file, so that I can fix broken scrapers without writing code.

#### Acceptance Criteria

1. THE Publisher_Config SHALL use a human-readable format (YAML or similar) that a non-developer can edit.
2. THE Publisher_Config SHALL define for each publisher: the publisher name, the URL to visit, navigation instructions, the hi-res image source type, and placeholder image descriptions.
3. WHEN the Publisher_Config is updated in the repository, THE Scraper SHALL use the updated configuration on the next scheduled run.
4. THE Publisher_Config SHALL include inline comments explaining each field and providing examples.

### Requirement 8: Monthly Health Check

**User Story:** As the site maintainer, I want a monthly automated check that verifies scraping still works for each publisher, so that I am alerted when a publisher's site changes break the scraper.

#### Acceptance Criteria

1. WHEN the monthly Health_Check runs, THE Health_Check SHALL attempt to scrape each publisher defined in the Publisher_Config.
2. WHEN the Health_Check detects that a publisher's page structure has changed (zero books found, navigation errors, or image retrieval failures), THE Health_Check SHALL mark that publisher as failing.
3. WHEN one or more publishers fail the Health_Check, THE Health_Check SHALL send an alert notification (via GitHub Issues or email) listing the failing publishers and the nature of the failure.
4. THE Health_Check SHALL run automatically on a monthly schedule via GitHub_Actions.
5. WHEN all publishers pass the Health_Check, THE Health_Check SHALL log a success summary without sending an alert.

### Requirement 9: Gallery Page Performance

**User Story:** As a team member, I want the gallery to load quickly even with many covers, so that I can browse efficiently.

#### Acceptance Criteria

1. THE Gallery_Page SHALL use lazy loading for cover thumbnail images so that only visible images are loaded initially.
2. THE Gallery_Page SHALL display optimized thumbnail images in the grid rather than full hi-res images.
3. WHEN a team member scrolls the Gallery_Page, THE Gallery_Page SHALL load additional thumbnails as they enter the viewport.

### Requirement 10: Gallery Filtering and Organization

**User Story:** As a team member, I want to filter covers by genre, so that I can find covers relevant to my area of interest quickly.

#### Acceptance Criteria

1. THE Gallery_Page SHALL provide a filter mechanism that allows team members to filter displayed covers by genre.
2. WHEN a genre filter is applied, THE Gallery_Page SHALL display only covers belonging to the selected genre.
3. THE Gallery_Page SHALL display the total number of covers currently shown.
4. THE Gallery_Page SHALL sort covers by publisher name alphabetically by default.
5. THE Gallery_Page SHALL also provide a secondary filter by publisher name.

### Requirement 11: Genre Classification

**User Story:** As a team member, I want each book to be tagged with a genre, so that genre-based filtering is possible.

#### Acceptance Criteria

1. WHEN the Scraper retrieves book information, THE Scraper SHALL extract genre or category metadata from the source page (publisher page or Amazon product page).
2. IF genre metadata is not available from the source page, THEN THE Scraper SHALL assign the genre defined in the Publisher_Config for that publisher as a fallback.
3. THE Publisher_Config SHALL allow the site maintainer to define a default genre for each publisher.
4. THE Scraper SHALL normalize genre labels to the following categories: "Nonfiction" (includes memoir and biography), "Literary & Historical Fiction" (includes literary fiction and historical fiction), "Translation, Poetry & Short Stories" (includes translated works, poetry collections, and story collections), "Science Fiction & Fantasy", "Thriller & Mystery", and "Romance, Young Adult & Graphic Novel".
5. WHEN a book has multiple genre tags from the source, THE Scraper SHALL retain all applicable genres so the book appears under each relevant filter.
