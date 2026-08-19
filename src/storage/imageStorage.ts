import * as FileSystem from 'expo-file-system/legacy';
import { v4 as uuidv4 } from 'uuid';
import { compressImage } from '../utils/imageCompressor';

const IMAGE_DIR = `${FileSystem.documentDirectory}restohub_images/`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

/**
 * Compresses and saves a picked image to the app's local directory.
 * Returns the new local URI.
 */
export async function saveImageLocally(pickedUri: string): Promise<string> {
  await ensureDir();
  // Compress and optimize photo dimensions before persistent storage
  const compressedUri = await compressImage(pickedUri, { maxWidth: 1200, maxHeight: 1200, quality: 0.75 });
  const filename = `${uuidv4()}.jpg`;
  const dest = `${IMAGE_DIR}${filename}`;
  await FileSystem.copyAsync({ from: compressedUri, to: dest });
  return dest;
}

/**
 * Delete a single image from local storage.
 */
export async function deleteImage(localUri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists) {
      await FileSystem.deleteAsync(localUri);
    }
  } catch {
    // Ignore errors on cleanup
  }
}

/**
 * Delete all images for a restaurant.
 */
export async function deleteImages(localUris: string[]): Promise<void> {
  await Promise.all(localUris.map(deleteImage));
}
