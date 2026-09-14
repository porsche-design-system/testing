# Live regions and status

## Rules

- Status that does not take focus uses a live region (4.1.3). Prefer the project's status/toast primitives when a design-system skill is loaded.
- Pre-render the live-region host and keep it mounted. Mounting the host with the message often fails to announce, including conditional React/Vue renders.
- Put specific text that says what happened and what to do next.
- Use `role="status"` / `aria-live="polite"` for non-urgent updates; `role="alert"` for errors and warnings that must be heard immediately.
- Do not add a second live region for the same event when a control already announces loading or validation.
- Use `aria-live` on custom markup only when no status component fits.
- Mark an updating content region `aria-busy="true"` until its update is complete. Do not put `aria-busy` on the whole page for a local request.
- Use a native `<progress>` or correctly named `role="progressbar"` with min/max/current values for determinate progress. A spinner alone does not tell users what is loading.
- Use `aria-atomic="true"` only when the complete region must be re-read; otherwise update the smallest useful text node.
- Clear or replace stale messages deliberately so the same status is not announced again on unrelated renders.
