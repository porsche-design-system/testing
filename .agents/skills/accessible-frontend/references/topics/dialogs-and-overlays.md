# Dialogs and overlays

## Rules

- Prefer the installed dialog/sheet/popover primitive. Otherwise prefer native `<dialog>` opened with `showModal()` for modal behavior.
- Give a dialog an accessible name from its visible heading. Add a description only when concise text helps users understand the purpose; do not make a long dialog body one accessible description.
- Choose initial focus by task: first invalid field for correction, the least destructive action for irreversible confirmation, or a static heading (`tabindex="-1"`) when reading should begin at the top.
- A modal makes background content inert and keeps document focus within the modal context while open. Do not add a second manual trap or inert implementation when native `<dialog>` or the installed component already handles it.
- Provide a visible keyboard-operable close action. Escape normally dismisses, but a nested widget may handle Escape first. Do not dismiss when closing would lose data without warning.
- On close, return focus to the trigger when it still exists; otherwise choose the next logical workflow target.
- A non-modal popover or disclosure must not claim `aria-modal`. Keep its trigger state synchronized and define whether focus stays on the trigger or moves into the overlay.
- Do not use a modal for passive status, tooltip content, or navigation that can remain in normal page flow.
