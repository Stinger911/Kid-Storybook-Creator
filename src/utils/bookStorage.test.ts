// @vitest-environment node
import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { BookPage } from '../types';

// Mock firebase/storage before importing the module under test
vi.mock('firebase/storage', () => ({
  ref: vi.fn((_storage, path: string) => ({ _path: path })),
  uploadString: vi.fn(),
  getDownloadURL: vi.fn(),
}));

// Mock the firebase init so it doesn't try to connect on import
vi.mock('../firebase', () => ({
  storage: {},
  auth: { currentUser: null },
  db: {},
  OperationType: { WRITE: 'write', GET: 'get', DELETE: 'delete' },
  handleFirestoreError: vi.fn(),
}));

import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { isDataUrl, uploadPageImage, processPages, clearImageCache } from './bookStorage';

const mockRef = vi.mocked(ref);
const mockUploadString = vi.mocked(uploadString);
const mockGetDownloadURL = vi.mocked(getDownloadURL);

const DATA_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const DATA_JPG = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJ==';
const STORAGE_URL = 'https://storage.googleapis.com/lab18-net.firebasestorage.app/books/b1/pages/p1/original';

const makePage = (overrides: Partial<BookPage> = {}): BookPage => ({
  id: 'page-1',
  title: 'Test Page',
  type: 'mixed',
  layout: 'coloring-top-writing-bottom',
  pageNumber: 1,
  ...overrides,
});

// Reset mocks and cache before every test
beforeEach(() => {
  clearImageCache();
  vi.clearAllMocks();

  const fakeRef = { _path: 'fake/path' };
  mockRef.mockReturnValue(fakeRef as any);
  mockUploadString.mockResolvedValue({ ref: fakeRef } as any);
  mockGetDownloadURL.mockResolvedValue(STORAGE_URL);
});

// ─────────────────────────────────────────────
// isDataUrl
// ─────────────────────────────────────────────
describe('isDataUrl', () => {
  it('returns true for image/png data URL', () => {
    expect(isDataUrl(DATA_PNG)).toBe(true);
  });

  it('returns true for image/jpeg data URL', () => {
    expect(isDataUrl(DATA_JPG)).toBe(true);
  });

  it('returns false for an https:// Storage URL', () => {
    expect(isDataUrl(STORAGE_URL)).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isDataUrl('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDataUrl(undefined)).toBe(false);
  });
});

// ─────────────────────────────────────────────
// uploadPageImage
// ─────────────────────────────────────────────
describe('uploadPageImage', () => {
  it('calls ref → uploadString → getDownloadURL and returns URL', async () => {
    const result = await uploadPageImage(DATA_PNG, 'books/b1/pages/p1/original');

    expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'books/b1/pages/p1/original');
    expect(mockUploadString).toHaveBeenCalledOnce();
    expect(mockGetDownloadURL).toHaveBeenCalledOnce();
    expect(result).toBe(STORAGE_URL);
  });

  it('returns cached URL on second call with the same data URL', async () => {
    const first = await uploadPageImage(DATA_PNG, 'path/a');
    const second = await uploadPageImage(DATA_PNG, 'path/b');

    expect(mockUploadString).toHaveBeenCalledOnce();
    expect(first).toBe(STORAGE_URL);
    expect(second).toBe(STORAGE_URL);
  });

  it('uploads again when data URL is different', async () => {
    const urlB = 'https://storage.googleapis.com/other';
    mockGetDownloadURL
      .mockResolvedValueOnce(STORAGE_URL)
      .mockResolvedValueOnce(urlB);

    const r1 = await uploadPageImage(DATA_PNG, 'path/a');
    const r2 = await uploadPageImage(DATA_JPG, 'path/b');

    expect(mockUploadString).toHaveBeenCalledTimes(2);
    expect(r1).toBe(STORAGE_URL);
    expect(r2).toBe(urlB);
  });

  it('propagates upload errors', async () => {
    mockUploadString.mockRejectedValueOnce(new Error('quota exceeded'));
    await expect(uploadPageImage(DATA_PNG, 'path/x')).rejects.toThrow('quota exceeded');
  });
});

// ─────────────────────────────────────────────
// processPages
// ─────────────────────────────────────────────
describe('processPages', () => {
  it('returns a page unchanged when it has no images', async () => {
    const page = makePage();
    const [result] = await processPages([page], 'book-1');

    expect(result).toEqual(page);
    expect(mockUploadString).not.toHaveBeenCalled();
  });

  it('uploads originalImage and replaces it with a Storage URL', async () => {
    const page = makePage({ originalImage: DATA_PNG });
    const [result] = await processPages([page], 'book-1');

    expect(result.originalImage).toBe(STORAGE_URL);
    expect(mockUploadString).toHaveBeenCalledOnce();
  });

  it('uploads coloringImage and replaces it with a Storage URL', async () => {
    const page = makePage({ coloringImage: DATA_PNG });
    const [result] = await processPages([page], 'book-1');

    expect(result.coloringImage).toBe(STORAGE_URL);
    expect(mockUploadString).toHaveBeenCalledOnce();
  });

  it('uploads both images when both are data URLs', async () => {
    mockGetDownloadURL
      .mockResolvedValueOnce('https://storage.url/original')
      .mockResolvedValueOnce('https://storage.url/coloring');

    const page = makePage({ originalImage: DATA_PNG, coloringImage: DATA_JPG });
    const [result] = await processPages([page], 'book-1');

    expect(result.originalImage).toBe('https://storage.url/original');
    expect(result.coloringImage).toBe('https://storage.url/coloring');
    expect(mockUploadString).toHaveBeenCalledTimes(2);
  });

  it('skips originalImage when it is already an https:// URL', async () => {
    const page = makePage({ originalImage: STORAGE_URL });
    const [result] = await processPages([page], 'book-1');

    expect(result.originalImage).toBe(STORAGE_URL);
    expect(mockUploadString).not.toHaveBeenCalled();
  });

  it('skips coloringImage when it is already an https:// URL', async () => {
    const page = makePage({ coloringImage: STORAGE_URL });
    const [result] = await processPages([page], 'book-1');

    expect(result.coloringImage).toBe(STORAGE_URL);
    expect(mockUploadString).not.toHaveBeenCalled();
  });

  it('deletes originalImage when upload fails (no base64 in Firestore)', async () => {
    mockUploadString.mockRejectedValueOnce(new Error('permission-denied'));
    const page = makePage({ originalImage: DATA_PNG });
    const [result] = await processPages([page], 'book-1');

    expect('originalImage' in result).toBe(false);
  });

  it('deletes coloringImage when upload fails', async () => {
    mockUploadString.mockRejectedValueOnce(new Error('storage/quota-exceeded'));
    const page = makePage({ coloringImage: DATA_PNG });
    const [result] = await processPages([page], 'book-1');

    expect('coloringImage' in result).toBe(false);
  });

  it('keeps other page fields intact after upload failure', async () => {
    mockUploadString.mockRejectedValueOnce(new Error('network-error'));
    const page = makePage({ originalImage: DATA_PNG, tracingText: 'HELLO', storyText: 'Once upon...' });
    const [result] = await processPages([page], 'book-1');

    expect(result.tracingText).toBe('HELLO');
    expect(result.storyText).toBe('Once upon...');
    expect('originalImage' in result).toBe(false);
  });

  it('processes multiple pages and returns them all', async () => {
    const pages = [
      makePage({ id: 'p1', originalImage: DATA_PNG, pageNumber: 1 }),
      makePage({ id: 'p2', coloringImage: DATA_JPG, pageNumber: 2 }),
      makePage({ id: 'p3', pageNumber: 3 }),
    ];
    mockGetDownloadURL
      .mockResolvedValueOnce('https://url/p1-original')
      .mockResolvedValueOnce('https://url/p2-coloring');

    const result = await processPages(pages, 'book-x');

    expect(result).toHaveLength(3);
    expect(result[0].originalImage).toBe('https://url/p1-original');
    expect(result[1].coloringImage).toBe('https://url/p2-coloring');
    expect(result[2]).toEqual(pages[2]);
    expect(mockUploadString).toHaveBeenCalledTimes(2);
  });

  it('uses correct Storage path: books/{bookId}/pages/{pageId}/{type}', async () => {
    const page = makePage({ id: 'pg-99', originalImage: DATA_PNG, coloringImage: DATA_JPG });
    mockGetDownloadURL.mockResolvedValue('https://url/x');

    await processPages([page], 'book-abc');

    expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'books/book-abc/pages/pg-99/original');
    expect(mockRef).toHaveBeenCalledWith(expect.anything(), 'books/book-abc/pages/pg-99/coloring');
  });

  it('deduplicates uploads when the same data URL appears in multiple pages', async () => {
    const pages = [
      makePage({ id: 'p1', originalImage: DATA_PNG, pageNumber: 1 }),
      makePage({ id: 'p2', originalImage: DATA_PNG, pageNumber: 2 }),
    ];

    const result = await processPages(pages, 'book-1');

    // Cache hit → only one actual upload despite two pages
    expect(mockUploadString).toHaveBeenCalledOnce();
    expect(result[0].originalImage).toBe(STORAGE_URL);
    expect(result[1].originalImage).toBe(STORAGE_URL);
  });
});
