---
name: a11y-audit-multi-page
description: Audit multiple web pages and compare their accessibility scores. Generates a scorecard showing which pages need the most attention.
mode: agent
agent: a11y-audit
tools:
  - askQuestions
  - readFile
  - listDirectory
  - createFile
  - runInTerminal
  - getTerminalOutput
---

# Multi-Page Web Accessibility Comparison

Audit multiple pages of a web application and generate a comparative scorecard. Identifies systemic issues (shared across pages) vs page-specific issues.

## Instructions

When the target provides the **a11y-audit** agent, use it. Otherwise execute this prompt directly with the installed `a11y-*` skills and preserve the workflow order and safety requirements below.

Use the phase map 0–12:

1. Complete Phase 0 setup: create `$RUN`
   (`.a11y/runs/<YYYY-MM-DD-HHMMSS>`) and `$SCRATCH` (`mktemp -d`) before any
   scan or report write. Read the finding schema, rule catalog, and batch
   contract. Prefer askQuestions when available; otherwise ask the same
   structured options in chat:
   - "What is the base URL of your application?"
   - "Which pages should I audit? List the paths (e.g., /, /login, /dashboard, /settings)"
   - "What framework/tech stack?" - Options: React, Vue, Angular, Next.js, Svelte, Vanilla HTML/CSS/JS
   - "Audit method?" - Options: Runtime scan only, Code review only, Both
   - "Thoroughness?" - Quick / Standard / Deep dive

2. Advance the audit phases globally across the page set; do not restart phase numbering for each page:
   - **Automated baseline (Phase 1, runtime or both):** For every page, run `node <a11y-playwright>/scripts/a11y-scan.mjs --url <URL> --mode axe,tree,coverage --out $SCRATCH/scan-axe-page-<N>.json` (add `--storage-state` when authenticated) before Phase 2 starts on any page. If a public page's axe mode is non-OK, run `npx --yes @axe-core/cli axe <URL> --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa --save $SCRATCH/scan-axe-cli-page-<N>.json` without overwriting the primary scan. Skip later phases from each page's `inventory`.
   - **Code review (Phases 2–9, code review or both):** For each phase, Read its domain skills and apply that phase to every page before advancing. Skills return objects; the orchestrator writes immutable `$SCRATCH/findings-agent-phase-<N>-page-<M>.json` batches, including empty batches.
   - **Behavioral (Phase 10, runtime or both):** Read `a11y-playwright`, run `--mode keyboard,viewport`, write `$SCRATCH/scan-playwright-page-<N>.json` for every eligible page, and finish all pages before Phase 11
   - Mark profile-omitted or inapplicable phases `SKIPPED` in their numerical position

3. Pass all scanner and immutable batch files to `normalize-findings.py`, write
   `$RUN/findings.json`, and compute per-page scores and grades via
   **`a11y-severity-scoring` only**. Run `export-findings.py --format summary`
   and copy its numbers unchanged.

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
