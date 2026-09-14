---
name: accessible-frontend
description: Use when generating or modifying HTML, CSS/SCSS, JavaScript/TypeScript, JSX/TSX, Vue SFC, Astro, or MDX frontend UI (pages, forms, dialogs, tables, navigation). Targets WCAG 2.2 AA and applicable EN 301 549 requirements. Use separately installed design-system skills for component APIs when available. Svelte is not currently supported.
---

# Accessible frontend

Apply these guardrails whenever generating or modifying UI. They target WCAG 2.2 AA and applicable EN 301 549 requirements; they do not prove conformance.

## Choose a loading tier

1. **Minimal** — styling or copy-only change: load exactly one matching topic.
2. **Component** — markup, state, or interaction for one UI piece: load the most specific matching Pattern or Composition topic; add keyboard/focus when the component is interactive; add only other affected topics.
3. **Page or feature** — route, flow, or several patterns: load the required page bundle and every applicable addition.

Read the tier matrix and categorized topic index in `INDEX.md` to select exact files. Escalate tiers if the task grows.

## Workflow

1. Identify the affected UI pieces, states, routes, inputs, and output changes.
2. Load the tier’s matching topic files.
3. Resolve the active framework. If the user has separately installed a design-system skill and it is available, load it before using component APIs.
4. For PDS, use an already-available `pds-knowledge-*` skill for component-specific APIs and limitations. Do not install, link, discover in `node_modules`, or configure PDS skills; direct the user to the official PDS skill documentation when setup is required.
5. Prefer native HTML or an installed accessible primitive. Preserve an existing non-PDS library unless the task requires replacing it. Never add ARIA that duplicates native or component semantics.
6. Separate source review from runtime evidence using the verification boundary below.
7. Mention accessibility decisions only when the implementation uses non-obvious ARIA, focus, keyboard, live-region, or structural behavior. Do not add a checklist to routine copy or styling edits.

## Verification boundary

- **Source review:** inspect semantics, relationships, state synchronization, error paths, event handling, and responsive code.
- **Runtime and assistive technology:** execute keyboard/focus behavior; inspect computed names, roles, values, states, and errors; verify announcements, contrast and target geometry, focus visibility/obscuration, zoom/reflow/text spacing, forced colors, orientation, themes, pointer/touch, media synchronization, and complete processes.
- Do not claim runtime or screen-reader verification from source inspection. If `web-accessibility-audit` is installed, use it after generation; otherwise run focused project tests and identify remaining manual checks.

## Universal rules

- Semantic HTML first. Do not add a role that the native element already has.
- Every control exposes its name, role, value/state, instructions, and errors where applicable. The accessible name contains the visible label (2.5.3).
- Focus order preserves meaning and operation. Never use positive `tabindex`; recover focus when focused content disappears.
- Use visible persistent labels. Placeholders are not labels. Prefer the design system’s error API; use native ARIA relationships only where they work.
- Text contrast is 4.5:1 (3:1 for large text); UI and meaningful graphics are 3:1. Do not use color alone. Support forced colors, text spacing, 200% text zoom, and 320 CSS-pixel reflow.
- Keep dynamic status hosts stable and update their content only when an announcement helps the user.
- Add bypass mechanisms for substantial repeated content when composing a full page (2.4.1).

## Authoritative docs

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- EN 301 549: see `references/topics/en-301-549.md`
- PDS component accessibility: separately installed PDS knowledge skills; setup is owned by https://designsystem.porsche.com/v4/skills/introduction/general/
- Verification: external to this package; use installed `web-accessibility-audit`, project tests, and manual assistive-technology checks
