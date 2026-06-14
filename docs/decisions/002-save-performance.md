# ADR-002: Save Performance — Debounce, Serialization, and Queue

**Date:** 2026-06-14  
**Status:** Accepted

## Context

BookStudio triggers a cloud save on every user interaction: keystroke in title/author/storyText, coloring slider drag, add/delete page, AI generation. Without throttling, each interaction causes a Storage upload + Firestore write, making the UI feel sluggish and creating redundant uploads.

Additionally, concurrent `executeSave` calls caused the "Syncing to cloud" spinner to cycle `true → false → true` in rapid succession, appearing to never stop.

## Decision

### Debounce auto-saves (800 ms)

`triggerSave(book, immediate?)` debounces the actual save by 800 ms. A pending timer is cancelled and reset on each new call. This batches rapid edits (typing, slider drags) into a single save per burst.

Structural operations that must not be delayed — add/delete page, AI book generation, toggle public/private, manual Save button — pass `immediate = true` to bypass the debounce.

### Single-slot serialization queue

`executeSave` uses `isSavingRef` (a ref, not state) as a mutex. If a save is already in flight when a new `executeSave` call arrives, the new book is stored in `pendingBookRef` (overwriting any earlier queued version — only the latest matters). When the current save finishes, `finally` drains the slot and runs one more save with the pending book.

This guarantees:
- At most one Storage/Firestore operation in flight at any time.
- `isSaving` state transitions cleanly `true → false` without racing back to `true`.
- The latest book version is always saved, even if many edits arrived during a long upload.

### Save button disabled during save

`<button disabled={isSaving}>` prevents manual duplicate saves. The button label changes to "Saving..." with a spinner icon while `isSaving` is true.

## Consequences

- **Good:** Text edits see one Firestore write per ~800 ms pause — typical UX for collaborative editors.
- **Good:** The spinner reliably stops; no more infinite-spin appearance.
- **Good:** Image uploads don't block text saves from starting.
- **Trade-off:** With an 800 ms debounce, a rapid navigate-away within 800 ms of the last edit loses that change (no flush-on-unmount). Acceptable for MVP; mitigated by the manual Save button.
- **Trade-off:** Serialization means a slow image-upload save (3–5 s) delays a queued text-only save by that duration. The queue slot always holds the latest version, so correctness is preserved.
