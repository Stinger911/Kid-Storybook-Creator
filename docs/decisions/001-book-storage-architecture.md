# ADR-001: Book Storage Architecture

**Date:** 2026-06-14  
**Status:** Accepted

## Context

StoryCraft books contain two types of data:

- **Metadata** — title, author, themeColor, storyText, tracingText, page layout settings (small, text)
- **Images** — originalImage (user photo) and coloringImage (processed line-art), stored initially as canvas data URLs (base64 PNG, typically 100–500 KB each)

Firestore has a **1 MB per-document limit**. A 3-page book with two images per page exceeds this limit as data URLs, causing silent truncation or write failures.

## Decision

Split storage across two Firebase services:

| Data | Where | Format |
|---|---|---|
| Book metadata + page text/settings | Firestore `books/{bookId}` | JSON document |
| Page images | Firebase Storage `books/{bookId}/pages/{pageId}/{type}` | PNG file |
| Image references in Firestore | Stored as HTTPS download URLs | Short string |

### Upload flow (`bookStorage.ts`)

1. Before every Firestore write, `processPages()` inspects each page.
2. If `originalImage` or `coloringImage` is a data URL (`isDataUrl()`), upload to Storage via `uploadString(..., 'data_url')`.
3. Replace the data URL with the returned HTTPS URL in the pages array.
4. Write the lean pages (URLs only) to Firestore.

### Promise-level deduplication cache

`uploadPageImage()` caches in-flight Promises keyed by data URL. Concurrent `Promise.all` uploads of the same image share one upload. Resolved Promises remain cached for the session lifetime, making repeated saves with the same data URL instant.

### Skip Storage for text-only saves

`saveBookToStore` checks `pages.some(p => isDataUrl(p.originalImage) || isDataUrl(p.coloringImage))` before calling `processPages`. If no data URLs exist, the Storage hop is skipped entirely and only the Firestore write runs (~200–500 ms).

### State update after save

After each successful save, `executeSave` in BookStudio merges the returned storage URLs back into `currentBook` state. This ensures that old books (loaded from Firestore with legacy data URLs) are migrated on first save and subsequent saves are text-only (fast path).

## Consequences

- **Good:** Firestore documents stay well under 1 MB regardless of image count.
- **Good:** Text edits save in ~1 s (debounce 800 ms + Firestore write ~200–500 ms).
- **Good:** First save of a new image is slow (~2–5 s) but subsequent saves in the same session are instant (cache hit), and saves after refresh are fast (storage URL already in state/Firestore).
- **Trade-off:** Two Firebase services to manage; Storage security rules required (`storage.rules`).
- **Trade-off:** Legacy books created before this architecture had data URLs written to Firestore; they are migrated transparently on first open-and-save.
