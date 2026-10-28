/**
 * Route focus keeps moving focus to the page heading for a short hold.
 * A polite status region updated during that hold is dropped, so the product
 * banner waits until the hold ends before it fills in its message.
 */
let holding = false;
let releaseHold: (() => void) | null = null;
let settled: Promise<void> = Promise.resolve();

export function beginRouteFocusHold(): void {
  if (holding) return;
  holding = true;
  settled = new Promise((resolve) => {
    releaseHold = resolve;
  });
}

export function endRouteFocusHold(): void {
  if (!holding) return;
  holding = false;
  const release = releaseHold;
  releaseHold = null;
  release?.();
}

export function isRouteFocusHolding(): boolean {
  return holding;
}

export function routeFocusSettled(): Promise<void> {
  return settled;
}
