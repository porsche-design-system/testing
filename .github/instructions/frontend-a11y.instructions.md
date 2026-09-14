---
description: Accessibility guardrails for frontend code targeting WCAG 2.2 AA and applicable EN 301 549 requirements.
applyTo: "**/*.{html,css,scss,js,ts,tsx,jsx,vue,astro,mdx}"
---

# Frontend accessibility

These guardrails apply whenever generating or modifying frontend code.

Before changing UI markup or behavior, read the `accessible-frontend` skill and load the smallest matching topic set. For styling or copy-only edits, load only the relevant topic. If the user has separately installed a `pds-knowledge-*` skill, load it for PDS component facts; do not install or configure PDS skills from this package.

## Core requirements

1. Prefer semantic HTML or an installed accessible component primitive. Do not recreate a widget that the project or design system already provides.
2. Keep every interaction keyboard-operable, with logical focus order, visible focus, no unintended keyboard trap, and a safe focus destination after content is removed or replaced.
3. Give controls correct names, roles, states, labels, instructions, and recoverable error associations. Use ARIA only when native semantics or the installed component API cannot express the behavior.
4. Preserve meaning and operation across themes, forced colors, 200% text zoom, 320 CSS-pixel reflow, text spacing, reduced motion, orientation, pointer, and touch input.
5. Announce meaningful dynamic changes without duplicate speech. Keep live-region hosts stable and use busy/progress semantics when users need status.

Target WCAG 2.2 AA and applicable EN 301 549 requirements. Generation guidance does not prove conformance; verify the result with tests and an accessibility audit.

## Before finishing

- Source-review semantics, relationships, state synchronization, error paths, and responsive code.
- Runtime-test the affected keyboard/focus path, accessibility-tree names/roles/states, announcements, contrast/geometry, zoom/reflow/text spacing, forced colors, orientation, and pointer/touch behavior. Do not claim checks that were not run.
- Use the installed `web-accessibility-audit` package when available; otherwise add focused project tests and list the remaining manual or assistive-technology checks.
- If a PDS knowledge skill is already available, take component APIs and limitations from it, never from memory. Otherwise keep the output generic and do not guess PDS APIs.
