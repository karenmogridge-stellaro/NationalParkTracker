// Tiny event bus so any screen can open the feedback sheet without prop-drilling.
type Listener = () => void;
const listeners = new Set<Listener>();

export function openFeedback(): void {
  listeners.forEach((l) => l());
}

/** Subscribe; returns an unsubscribe function. */
export function onOpenFeedback(listener: Listener): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
