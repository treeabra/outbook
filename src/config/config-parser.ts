/**
 * Publisher configuration parser and validator.
 * Reads config/publishers.yaml and returns typed PublisherConfig[].
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';
import type { PublisherConfig, Genre, NavigationStrategy } from '../types.js';

const VALID_GENRES: Genre[] = [
  'Nonfiction',
  'Literary & Historical Fiction',
  'Translation, Poetry & Short Stories',
  'Science Fiction & Fantasy',
  'Thriller & Mystery',
  'Romance, Young Adult & Graphic Novel',
];

const VALID_NAVIGATION: NavigationStrategy[] = [
  'static',
  'paginated',
  'carousel',
  'infinite-scroll',
  'multi-click',
];

const VALID_HIRES_SOURCES = ['amazon', 'waterstones', 'direct'] as const;

interface RawYamlConfig {
  publishers?: unknown[];
}

/**
 * Parse and validate the publishers.yaml configuration file.
 * @param configPath - Path to the YAML file. Defaults to config/publishers.yaml relative to project root.
 */
export function parsePublisherConfig(configPath?: string): PublisherConfig[] {
  const filePath = configPath ?? resolve(process.cwd(), 'config', 'publishers.yaml');

  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`Failed to read publisher config at ${filePath}: ${(err as Error).message}`);
  }

  let parsed: RawYamlConfig;
  try {
    parsed = yaml.load(content) as RawYamlConfig;
  } catch (err) {
    throw new Error(`Invalid YAML in publisher config: ${(err as Error).message}`);
  }

  if (!parsed || !Array.isArray(parsed.publishers)) {
    throw new Error('Publisher config must contain a "publishers" array at the top level.');
  }

  return parsed.publishers.map((entry, index) => validatePublisher(entry, index));
}

function validatePublisher(entry: unknown, index: number): PublisherConfig {
  if (!entry || typeof entry !== 'object') {
    throw new Error(`Publisher at index ${index} must be an object.`);
  }

  const obj = entry as Record<string, unknown>;
  const prefix = `Publisher at index ${index}`;

  // Required string fields
  const name = requireString(obj, 'name', prefix);
  const url = requireString(obj, 'url', prefix);
  const bookSelector = requireString(obj, 'book_selector', prefix);
  const titleSelector = requireString(obj, 'title_selector', prefix);
  const coverSelector = requireString(obj, 'cover_selector', prefix);

  // Navigation
  const navigation = requireString(obj, 'navigation', prefix) as NavigationStrategy;
  if (!VALID_NAVIGATION.includes(navigation)) {
    throw new Error(`${prefix} ("${name}"): navigation must be one of: ${VALID_NAVIGATION.join(', ')}`);
  }

  // Hi-res source
  const hiresSource = requireString(obj, 'hires_source', prefix) as PublisherConfig['hires_source'];
  if (!(VALID_HIRES_SOURCES as readonly string[]).includes(hiresSource)) {
    throw new Error(`${prefix} ("${name}"): hires_source must be one of: ${VALID_HIRES_SOURCES.join(', ')}`);
  }

  // Default genre
  const defaultGenre = requireString(obj, 'default_genre', prefix) as Genre;
  if (!VALID_GENRES.includes(defaultGenre)) {
    throw new Error(`${prefix} ("${name}"): default_genre must be one of: ${VALID_GENRES.join(', ')}`);
  }

  // Placeholder config (required object)
  if (!obj.placeholder || typeof obj.placeholder !== 'object') {
    throw new Error(`${prefix} ("${name}"): placeholder configuration is required.`);
  }
  const placeholderRaw = obj.placeholder as Record<string, unknown>;
  const placeholder = {
    known_hashes: Array.isArray(placeholderRaw.known_hashes)
      ? (placeholderRaw.known_hashes as string[])
      : undefined,
    text_patterns: Array.isArray(placeholderRaw.text_patterns)
      ? (placeholderRaw.text_patterns as string[])
      : undefined,
    min_file_size_kb: typeof placeholderRaw.min_file_size_kb === 'number'
      ? placeholderRaw.min_file_size_kb
      : undefined,
  };

  // Optional fields
  const navigationOptions = obj.navigation_options
    ? (obj.navigation_options as PublisherConfig['navigation_options'])
    : undefined;
  const isbnSelector = typeof obj.isbn_selector === 'string' ? obj.isbn_selector : undefined;
  const urlPattern = typeof obj.url_pattern === 'string' ? obj.url_pattern : undefined;

  return {
    name,
    url,
    navigation,
    navigation_options: navigationOptions,
    book_selector: bookSelector,
    title_selector: titleSelector,
    cover_selector: coverSelector,
    hires_source: hiresSource,
    isbn_selector: isbnSelector,
    default_genre: defaultGenre,
    placeholder,
    url_pattern: urlPattern,
  };
}

function requireString(obj: Record<string, unknown>, field: string, prefix: string): string {
  const value = obj[field];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${prefix}: "${field}" is required and must be a non-empty string.`);
  }
  return value;
}
