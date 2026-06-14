import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { BookPage } from '../types';

export const isDataUrl = (s?: string): s is string => !!s && s.startsWith('data:');

// Cache stores in-flight Promises so concurrent calls with the same data URL
// share one upload instead of racing to create duplicates.
const _cache = new Map<string, Promise<string>>();

export function clearImageCache(): void {
  _cache.clear();
}

export function uploadPageImage(dataUrl: string, storagePath: string): Promise<string> {
  const cached = _cache.get(dataUrl);
  if (cached) return cached;

  const promise = (async () => {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    return getDownloadURL(snapshot.ref);
  })();

  _cache.set(dataUrl, promise);
  return promise;
}

export async function processPages(pages: BookPage[], bookId: string): Promise<BookPage[]> {
  return Promise.all(pages.map(async (page) => {
    const updated: BookPage = { ...page };

    if (isDataUrl(page.originalImage)) {
      try {
        updated.originalImage = await uploadPageImage(
          page.originalImage,
          `books/${bookId}/pages/${page.id}/original`
        );
      } catch (e) {
        console.warn(`[Storage] originalImage upload failed for page ${page.id}:`, e);
        delete updated.originalImage;
      }
    }

    if (isDataUrl(page.coloringImage)) {
      try {
        updated.coloringImage = await uploadPageImage(
          page.coloringImage,
          `books/${bookId}/pages/${page.id}/coloring`
        );
      } catch (e) {
        console.warn(`[Storage] coloringImage upload failed for page ${page.id}:`, e);
        delete updated.coloringImage;
      }
    }

    return updated;
  }));
}
