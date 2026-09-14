---
description: Audit multiple web pages and compare their accessibility scores. Generates
  a scorecard showing which pages need the most attention.
---

# Multi-Page Web Accessibility Comparison

Audit multiple pages of a web application and generate a comparative scorecard. Identifies systemic issues (shared across pages) vs page-specific issues.

## Instructions

When the target provides the **a11y-audit** agent, use it. Otherwise execute this prompt directly with the installed `a11y-*` skills and preserve the workflow order and safety requirements below.

Use the phase map 0–12:

1. Complete Phase 0 setup: create `$RUN` (`.a11y/runs/<YYYY-MM-DD-HHMMSS>`) and `$SCRATCH` (`mktemp -d`) before any scan or report write. Prefer askQuestions when available; otherwise ask the same structured options in chat:
   - "What is the base URL of your application?"
   - "Which pages should I audit? List the paths (e.g., /, /login, /dashboard, /settings)"
   - "What framework/tech stack?" - Options: React, Vue, Angular, Next.js, Svelte, Vanilla HTML/CSS/JS
   - "Audit method?" - Options: Runtime scan only, Code review only, Both
   - "Thoroughness?" - Quick / Standard / Deep dive

2. Advance the audit phases globally across the page set; do not restart phase numbering for each page:
   - **Automated baseline (Phase 1, runtime or both):** For every public page, run `npx @axe-core/cli <URL> --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa --save $SCRATCH/scan-axe-page-<N>.json` before Phase 2 starts on any page
   - **Authenticated baseline (Phase 1, runtime or both):** Follow `a11y-web-scanning`'s authenticated procedure and use the shipped `a11y-playwright` scanner with `--mode axe --storage-state <file> --out $SCRATCH/scan-axe-page-<N>.json`; verify each intended page loaded and never scan an authenticated route with `@axe-core/cli`
   - **Code review (Phases 2–9, code review or both):** For each phase, Read its domain skills and apply that phase to every page before advancing
   - **Behavioral (Phase 10, runtime or both):** Read `a11y-playwright` (CLI), write `$SCRATCH/scan-playwright-page-<N>.json` for every eligible page, and finish all pages before Phase 11
   - Mark profile-omitted or inapplicable phases `SKIPPED` in their numerical position

3. Compute per-page severity scores (0-100) and letter grades via **`a11y-severity-scoring` only**

4. Generate the comparative report to `$RUN/ACCESSIBILITY-AUDIT.md` including:
   - **Page Scorecard** - side-by-side comparison table
   - **Systemic Issues** - problems found on every page (layout/nav issues)
   - **Template Issues** - problems from shared components (fix once, fix everywhere)
   - **Page-Specific Issues** - unique to individual pages
   - **Remediation Priority** - ordered by ROI (systemic fixes first)

5. Ask: "Would you like me to fix the systemic issues that affect all pages?" (Phase 12 / `a11y-issue-fixer`)

## Progress Transparency

Announce each transition:

- **Before a page pass:** `[A11Y AUDIT · Phase X/12 · Page N/total · PAGE START] [phase name] — [URL]`
- **After a page pass:** Use `PAGE DONE` with that page's finding counts
- **On page failure:** Use `PAGE FAILED` with the reason and continue within the current phase
- **After all pages:** Emit one global `DONE`, `SKIPPED`, or `FAILED` status for the phase, then advance

Never batch several numbered phases into one status update.