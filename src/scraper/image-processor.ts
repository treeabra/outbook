/**
 * Image processor module.
 * Saves hi-res images and generates optimized thumbnails.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import sharp from 'sharp';
import type { ImageResult, Book, ProcessedImage } from '../types.js';

const HIRES_DIR = 'covers/hires';
const THUMBS_DIR = 'covers/thumbs';
const THUMB_WIDTH = 300;

/**
 * Process a hi-res image: save the original JPEG and generate a WebP thumbnail.
 */
export async function processImage(
  image: ImageResult,
  book: Book,
): Promise<ProcessedImage> {
  const baseFilename = sanitizeFilename(book.publisher, book.title);
  const hiresFilename = `${baseFilename}.jpg`;
  const thumbFilename = `${baseFilename}.webp`;

  const hiresPath = resolve(process.cwd(), HIRES_DIR, hiresFilename);
  const thumbPath = resolve(process.cwd(), THUMBS_DIR, thumbFilename);

  // Ensure directories exist
  mkdirSync(dirname(hiresPath), { recursive: true });
  mkdirSync(dirname(thumbPath), { recursive: true });

  // Save hi-res JPEG
  const hiresBuffer = await sharp(image.buffer)
    .jpeg({ quality: 95 })
    .toBuffer();
  writeFileSync(hiresPath, hiresBuffer);

  // Generate 300px-wide WebP thumbnail
  const thumbResult = await sharp(image.buffer)
    .resize({ width: THUMB_WIDTH })
    .webp({ quality: 80 })
    .toBuffer({ resolveWithObject: true });

  writeFileSync(thumbPath, thumbResult.data);

  return {
    hiresPath: `${HIRES_DIR}/${hiresFilename}`,
    thumbPath: `${THUMBS_DIR}/${thumbFilename}`,
    thumbWidth: thumbResult.info.width,
    thumbHeight: thumbResult.info.height,
  };
}

/**
 * Sanitize publisher name and book title into a valid filename.
 * Pattern: {publisher}_{book-title} — lowercase, hyphens for spaces/special chars.
 */
export function sanitizeFilename(publisher: string, title: string): string {
  const sanitize = (str: string): string =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80); // Limit length

  const pubPart = sanitize(publisher);
  const titlePart = sanitize(title);

  return `${pubPart}_${titlePart}`;
}
