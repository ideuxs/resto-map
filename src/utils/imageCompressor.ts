import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

/**
 * Compresses and resizes an image URI before storing it in persistent storage.
 * Defaults to max dimension 1200px and 75% JPEG quality for fast storage and loading.
 */
export async function compressImage(uri: string, options: CompressOptions = {}): Promise<string> {
  if (!uri || uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  const { maxWidth = 1200, maxHeight = 1200, quality = 0.75 } = options;

  try {
    const actions = [];
    if (maxWidth || maxHeight) {
      actions.push({ resize: { width: maxWidth } });
    }

    const result = await manipulateAsync(
      uri,
      actions,
      { compress: quality, format: SaveFormat.JPEG }
    );

    return result.uri;
  } catch (error) {
    console.warn('[imageCompressor] Failed to compress image, falling back to original URI:', error);
    return uri;
  }
}

/**
 * Compresses multiple image URIs concurrently.
 */
export async function compressImages(uris: string[], options?: CompressOptions): Promise<string[]> {
  return Promise.all(uris.map((uri) => compressImage(uri, options)));
}
