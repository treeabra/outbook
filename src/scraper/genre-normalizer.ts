/**
 * Genre normalization module.
 * Maps source genre tags to the six valid gallery categories.
 */

import type { Genre } from '../types.js';

/**
 * The six valid genre categories for the gallery.
 */
export const VALID_GENRES: Genre[] = [
  'Nonfiction',
  'Literary & Historical Fiction',
  'Translation, Poetry & Short Stories',
  'Science Fiction & Fantasy',
  'Thriller & Mystery',
  'Romance, Young Adult & Graphic Novel',
];

/**
 * Mapping from common source genre tags (lowercase) to normalized categories.
 */
const GENRE_MAP: Record<string, Genre> = {
  // Nonfiction
  'nonfiction': 'Nonfiction',
  'non-fiction': 'Nonfiction',
  'memoir': 'Nonfiction',
  'memoirs': 'Nonfiction',
  'biography': 'Nonfiction',
  'biographies': 'Nonfiction',
  'autobiography': 'Nonfiction',
  'essays': 'Nonfiction',
  'essay': 'Nonfiction',
  'history': 'Nonfiction',
  'politics': 'Nonfiction',
  'science': 'Nonfiction',
  'philosophy': 'Nonfiction',
  'self-help': 'Nonfiction',
  'true crime': 'Nonfiction',
  'journalism': 'Nonfiction',
  'travel': 'Nonfiction',
  'nature': 'Nonfiction',
  'food & drink': 'Nonfiction',
  'business': 'Nonfiction',
  'economics': 'Nonfiction',
  'psychology': 'Nonfiction',
  'sociology': 'Nonfiction',
  'cultural criticism': 'Nonfiction',
  'music': 'Nonfiction',
  'art': 'Nonfiction',
  'sports': 'Nonfiction',

  // Literary & Historical Fiction
  'literary fiction': 'Literary & Historical Fiction',
  'fiction': 'Literary & Historical Fiction',
  'literary': 'Literary & Historical Fiction',
  'historical fiction': 'Literary & Historical Fiction',
  'historical': 'Literary & Historical Fiction',
  'general fiction': 'Literary & Historical Fiction',
  'contemporary fiction': 'Literary & Historical Fiction',
  'novels': 'Literary & Historical Fiction',
  'novel': 'Literary & Historical Fiction',

  // Translation, Poetry & Short Stories
  'translation': 'Translation, Poetry & Short Stories',
  'translated': 'Translation, Poetry & Short Stories',
  'poetry': 'Translation, Poetry & Short Stories',
  'poems': 'Translation, Poetry & Short Stories',
  'short stories': 'Translation, Poetry & Short Stories',
  'short fiction': 'Translation, Poetry & Short Stories',
  'stories': 'Translation, Poetry & Short Stories',
  'fiction in translation': 'Translation, Poetry & Short Stories',
  'world literature': 'Translation, Poetry & Short Stories',
  'international': 'Translation, Poetry & Short Stories',

  // Science Fiction & Fantasy
  'science fiction': 'Science Fiction & Fantasy',
  'sci-fi': 'Science Fiction & Fantasy',
  'fantasy': 'Science Fiction & Fantasy',
  'speculative fiction': 'Science Fiction & Fantasy',
  'speculative': 'Science Fiction & Fantasy',
  'dystopian': 'Science Fiction & Fantasy',
  'horror': 'Science Fiction & Fantasy',

  // Thriller & Mystery
  'thriller': 'Thriller & Mystery',
  'mystery': 'Thriller & Mystery',
  'crime': 'Thriller & Mystery',
  'crime fiction': 'Thriller & Mystery',
  'suspense': 'Thriller & Mystery',
  'detective': 'Thriller & Mystery',
  'noir': 'Thriller & Mystery',
  'espionage': 'Thriller & Mystery',

  // Romance, Young Adult & Graphic Novel
  'romance': 'Romance, Young Adult & Graphic Novel',
  'young adult': 'Romance, Young Adult & Graphic Novel',
  'ya': 'Romance, Young Adult & Graphic Novel',
  'graphic novel': 'Romance, Young Adult & Graphic Novel',
  'graphic novels': 'Romance, Young Adult & Graphic Novel',
  'comics': 'Romance, Young Adult & Graphic Novel',
  'manga': 'Romance, Young Adult & Graphic Novel',
  'children': 'Romance, Young Adult & Graphic Novel',
  "children's": 'Romance, Young Adult & Graphic Novel',
};

/**
 * Normalize an array of source genre tags to valid gallery categories.
 * Retains all applicable genres (a book can appear under multiple filters).
 * Falls back to defaultGenre if no tags can be mapped.
 */
export function normalizeGenres(sourceTags: string[], defaultGenre: Genre): Genre[] {
  if (!sourceTags || sourceTags.length === 0) {
    return [defaultGenre];
  }

  const normalized = new Set<Genre>();

  for (const tag of sourceTags) {
    const lower = tag.toLowerCase().trim();
    const mapped = GENRE_MAP[lower];
    if (mapped) {
      normalized.add(mapped);
    }
  }

  // If no tags could be mapped, use the default
  if (normalized.size === 0) {
    return [defaultGenre];
  }

  return Array.from(normalized);
}

/**
 * Check if a genre string is a valid gallery category.
 */
export function isValidGenre(genre: string): genre is Genre {
  return VALID_GENRES.includes(genre as Genre);
}
