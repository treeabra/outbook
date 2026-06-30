/**
 * Placeholder image detector.
 * Applies detection methods in order from cheapest to most expensive:
 * 1. File size check (instant)
 * 2. Perceptual hash comparison (fast)
 * 3. OCR text detection (slower)
 */

import type { PlaceholderConfig } from '../types.js';

/**
 * Determine if an image buffer is a placeholder based on publisher-specific rules.
 * Returns true if the image matches any placeholder criteria.
 */
export async function isPlaceholder(
  imageBuffer: Buffer,
  config: PlaceholderConfig,
): Promise<boolean> {
  // 1. File size check (cheapest)
  if (config.min_file_size_kb) {
    const sizeKb = imageBuffer.length / 1024;
    if (sizeKb < config.min_file_size_kb) {
      return true;
    }
  }

  // 2. Perceptual hash comparison
  if (config.known_hashes && config.known_hashes.length > 0) {
    const matches = await checkPerceptualHash(imageBuffer, config.known_hashes);
    if (matches) {
      return true;
    }
  }

  // 3. OCR text detection (most expensive)
  if (config.text_patterns && config.text_patterns.length > 0) {
    const hasText = await checkOcrText(imageBuffer, config.text_patterns);
    if (hasText) {
      return true;
    }
  }

  return false;
}

/**
 * Compare image against known placeholder hashes using perceptual hashing.
 */
async function checkPerceptualHash(imageBuffer: Buffer, knownHashes: string[]): Promise<boolean> {
  try {
    // Dynamic import for image-hash (ESM compatibility)
    const { imageHash } = await import('image-hash');
    const hash = await new Promise<string>((resolve, reject) => {
      imageHash({ data: imageBuffer }, 8, true, (err: Error | null, hash: string) => {
        if (err) reject(err);
        else resolve(hash);
      });
    });

    for (const knownHash of knownHashes) {
      const distance = hammingDistance(hash, knownHash);
      // Threshold of 10 bits difference (out of 64) means likely the same image
      if (distance <= 10) {
        return true;
      }
    }
  } catch (err) {
    console.warn(`[Placeholder] Hash comparison failed: ${(err as Error).message}`);
  }

  return false;
}

/**
 * Use OCR to detect text patterns in the image that indicate a placeholder.
 */
async function checkOcrText(imageBuffer: Buffer, textPatterns: string[]): Promise<boolean> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');

    const { data: { text } } = await worker.recognize(imageBuffer);
    await worker.terminate();

    const lowerText = text.toLowerCase();
    for (const pattern of textPatterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        return true;
      }
    }
  } catch (err) {
    console.warn(`[Placeholder] OCR detection failed: ${(err as Error).message}`);
  }

  return false;
}

/**
 * Calculate Hamming distance between two hex hash strings.
 */
function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return 64; // Max distance

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16);
    const n2 = parseInt(hash2[i], 16);
    // Count differing bits
    let xor = n1 ^ n2;
    while (xor > 0) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}

export { hammingDistance };
