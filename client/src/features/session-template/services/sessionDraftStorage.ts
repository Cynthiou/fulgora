import type { SelectedExercise, SessionDraft } from "shared";

// The draft of the editor lives in the page. Choosing exercises goes through
// the catalog and its detail pages (other routes), so the draft is kept in
// sessionStorage meanwhile: private to the tab, gone when it closes.
// Every access is wrapped in try/catch: private mode or a full storage must
// never break the editor.

const DRAFT_KEY = "session-editor:draft";
const PENDING_KEY = "session-editor:pending-exercises";

export type StoredDraft = {
  draft: SessionDraft;
  // The block open on screen (A4/A6), to come back to it
  openBlockKey: string | null;
  // The appointment being modified (US-17), null for a new session
  appointmentId?: number | null;
};

export function loadDraft(): StoredDraft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw === null ? null : (JSON.parse(raw) as StoredDraft);
  } catch {
    return null;
  }
}

export function saveDraft(stored: StoredDraft): void {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(stored));
  } catch {
    // Not kept: the editor still works, the detour just loses the draft.
  }
}

export function clearDraft(): void {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to do.
  }
}

// The exercises chosen for a block, handed over when the selection page
// goes back to the editor.
export type PendingExercises = {
  blockKey: string;
  exercises: SelectedExercise[];
};

export function savePendingExercises(pending: PendingExercises): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  } catch {
    // Not kept.
  }
}

export function readPendingExercises(): PendingExercises | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw === null ? null : (JSON.parse(raw) as PendingExercises);
  } catch {
    return null;
  }
}

export function clearPendingExercises(): void {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Nothing to do.
  }
}
