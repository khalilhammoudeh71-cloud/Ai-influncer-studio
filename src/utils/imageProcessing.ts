/**
 * Image Processing Utility
 * Handles iOS HEIC conversion, resizing, and normalization for all uploads.
 * Converts any image (including HEIC from iPad/iPhone camera rolls)
 * to a web-safe JPEG data URL with controllable max dimensions.
 */

const DEFAULT_MAX_DIMENSION = 2048;
const DEFAULT_QUALITY = 0.85;

/**
 * Process a File from an <input type="file"> into a normalized JPEG data URL.
 * Works around iOS Safari issues with HEIC files and large camera roll photos.
 * 
 * @param file - The File object from the file input
 * @param maxDimension - Max width/height (preserves aspect ratio)
 * @param quality - JPEG quality (0-1)
 * @returns Promise<string> - A data:image/jpeg;base64,... URL
 */
export function processImageFile(
  file: File,
  maxDimension: number = DEFAULT_MAX_DIMENSION,
  quality: number = DEFAULT_QUALITY
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Step 1: Create an object URL (works with HEIC on iOS Safari)
    // Object URLs are more reliable than FileReader for HEIC files
    const objectUrl = URL.createObjectURL(file);

    const img = new Image();
    // Do NOT set crossOrigin='anonymous' for blob URLs, it causes the browser to reject loading local files.
    
    img.onload = () => {
      try {
        // Step 2: Calculate scaled dimensions
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          const scale = maxDimension / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        // Step 3: Draw to canvas (this forces HEIC decode → bitmap → JPEG)
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Step 4: Export as JPEG data URL
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        
        // Cleanup
        URL.revokeObjectURL(objectUrl);
        canvas.width = 0;
        canvas.height = 0;

        if (!dataUrl || dataUrl === 'data:,') {
          reject(new Error('Canvas export produced empty result'));
          return;
        }

        resolve(dataUrl);
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback: try FileReader for non-image files or broken object URLs
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Process multiple image files in parallel.
 * Returns results in the same order as input files.
 */
export async function processImageFiles(
  files: File[],
  maxDimension: number = DEFAULT_MAX_DIMENSION,
  quality: number = DEFAULT_QUALITY
): Promise<{ url: string; name: string }[]> {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const url = await processImageFile(file, maxDimension, quality);
      return { url, name: file.name };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{ url: string; name: string }> => r.status === 'fulfilled')
    .map(r => r.value);
}

/**
 * Compress an existing data URL (or http URL) for API upload.
 * Ensures images stay under Vercel's ~4.5MB request body limit.
 * 
 * - If already small enough, returns as-is (no re-encoding).
 * - Otherwise, re-encodes through canvas at reduced resolution/quality.
 * 
 * @param dataUrl - A data:image/... URL or http(s) URL
 * @param maxBytes - Target max byte size for the base64 payload (default 2.5MB)
 * @param maxDimension - Max width/height (default 1536px)
 * @returns Promise<string> - Compressed data URL
 */
const UPLOAD_MAX_BYTES = 2_500_000; // ~2.5MB base64 = ~1.9MB raw
const UPLOAD_MAX_DIM = 1536;

export function compressForUpload(
  dataUrl: string,
  maxBytes: number = UPLOAD_MAX_BYTES,
  maxDimension: number = UPLOAD_MAX_DIM
): Promise<string> {
  // If it's an http URL (not base64), pass through — server fetches these directly
  if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
    return Promise.resolve(dataUrl);
  }

  // Check if already small enough
  const base64Part = dataUrl.split(',')[1] || '';
  if (base64Part.length < maxBytes) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    // Only use crossOrigin for external http URLs. Trying to use it on a data: URL throws an invalid CORS exception in many browsers.
    if (dataUrl.startsWith('http')) {
      img.crossOrigin = 'anonymous';
    }

    img.onload = () => {
      let { width, height } = img;

      // Scale down to maxDimension
      if (width > maxDimension || height > maxDimension) {
        const scale = maxDimension / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }

      ctx.drawImage(img, 0, 0, width, height);

      // Try progressively lower quality until under limit
      for (const q of [0.8, 0.65, 0.5, 0.35]) {
        const compressed = canvas.toDataURL('image/jpeg', q);
        const payload = compressed.split(',')[1] || '';
        if (payload.length < maxBytes) {
          canvas.width = 0;
          canvas.height = 0;
          resolve(compressed);
          return;
        }
      }

      // Last resort: scale down further
      const smallW = Math.round(width * 0.6);
      const smallH = Math.round(height * 0.6);
      canvas.width = smallW;
      canvas.height = smallH;
      ctx.drawImage(img, 0, 0, smallW, smallH);
      const result = canvas.toDataURL('image/jpeg', 0.5);
      canvas.width = 0;
      canvas.height = 0;
      resolve(result);
    };

    img.onerror = () => resolve(dataUrl); // Fallback: send as-is
    img.src = dataUrl;
  });
}

/**
 * Compress multiple images for upload.
 */
export async function compressImagesForUpload(
  images: (string | null | undefined)[]
): Promise<(string | null)[]> {
  return Promise.all(
    images.map(img => img ? compressForUpload(img) : Promise.resolve(null))
  );
}
