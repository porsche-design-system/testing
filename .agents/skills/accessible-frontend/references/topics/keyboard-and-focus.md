# Keyboard and focus

## Rules

- Every function is operable without a pointer (2.1.1). Tab / Shift-Tab reaches each standalone control and each composite widget in a meaningful order; descendants of radio groups, tabs, menus, listboxes, and similar composites follow their documented arrow-key model instead of all becoming Tab stops.
- Buttons: Enter and Space. Links: Enter. Checkboxes: Space. Radio groups: arrows. Tabs and other composites: follow the widget's documented keys (often Left/Right, Home/End).
- No keyboard traps (2.1.2). Load `references/topics/dialogs-and-overlays.md` for modal focus containment and close behavior.
- Never `tabindex` greater than 0. Avoid `tabindex="-1"` on items that users must reach by Tab unless you implement roving tabindex correctly.
- Visible focus at all times (2.4.7). Do not remove outlines unless replacing with a `:focus-visible` indicator at 3:1 contrast. Preserve the design system's focus styling when one is present.
- Focus must not be entirely hidden by sticky chrome (2.4.11).
- When focused content disappears, focus a logical surviving item, owning region, or initiating control. Never leave focus on `body`.
- Provide bypass navigation when composing a page with substantial repeated content (2.4.1). Design-system-specific skip APIs belong in the installed component skill.
- A target is at least 24 by 24 CSS pixels, or spaced so a 24 CSS-pixel-diameter circle centered on its bounding box does not intersect another target or such a circle around it (2.5.8). Inline, user-agent-controlled, equivalent, and essential targets may use the criterion’s exceptions.
- Dragging has a click/tap and keyboard alternative (2.5.7). Multipoint or path-based gestures have a single-pointer alternative unless essential (2.5.1).
- Trigger actions on pointer release so users can cancel or undo pointer input, unless an exception in 2.5.2 applies.
- Functionality activated by device motion also works through a control and allows motion activation to be disabled (2.5.4).
- Single-character shortcuts can be turned off, remapped, or active only on focus unless an exception applies (2.1.4).
