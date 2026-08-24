/**
 * Module-level store for "pending actions" – actions a logged-out user
 * attempted and that should be automatically completed after login.
 *
 * Pattern mirrors pendingInvite.ts: a simple in-memory singleton.
 */

export type PendingAction =
  | {
      type: 'highFive';
      /** Visible name of the person whose content is being reacted to. */
      displayName: string;
      /** The Firestore event ID used to write the kudos document. */
      eventId: string;
      /** UID of the event owner (kudos recipient). */
      eventOwnerUid: string;
    }
  | {
      type: 'follow';
      /** Firestore user ID to follow. */
      userId: string;
      /** Display name shown in confirmation copy. */
      displayName: string;
    }
  | { type: 'keepExploring' }
  | { type: 'scrollFeed' }
  | {
      type: 'viewProfile';
      userId: string;
      displayName: string;
    };

let _pendingAction: PendingAction | null = null;

/** Store the action the user was attempting before they were prompted to log in. */
export function setPendingAction(action: PendingAction): void {
  _pendingAction = action;
}

/**
 * Consume (read + clear) the pending action.
 * Call this once after login when resuming the interrupted action.
 */
export function consumePendingAction(): PendingAction | null {
  const value = _pendingAction;
  _pendingAction = null;
  return value;
}

/** Read the pending action without clearing it. */
export function peekPendingAction(): PendingAction | null {
  return _pendingAction;
}

/** Discard the pending action without executing it. */
export function clearPendingAction(): void {
  _pendingAction = null;
}
