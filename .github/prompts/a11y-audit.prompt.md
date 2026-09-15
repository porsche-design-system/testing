---
name: a11y-audit
description: Run a full web accessibility audit on a single page URL using axe-core runtime scanning and agent code review. Produces a scored report with remediation steps.
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

# Web Page Accessibility Audit

Run a comprehensive accessibility audit on a single web page. Combines axe-core runtime scanning with agent-driven code review.

## Page to audit

**URL:** `${input:pageUrl}`

## Settings

- **Audit method:** Both (axe-core runtime scan + code review)
- **Thoroughness:** Standard review (phases 0–11; discovery answers are pre-configured below)
- **Target standard:** WCAG 2.2 AA
- **Screenshots:** No
- **Report path:** `$RUN/ACCESSIBILITY-AUDIT.md` (inside this run's directory; no copy at the project root unless asked)
- **Include:** Severity scoring via `a11y-severity-scoring`, confidence levels, framework-specific notes

## Instructions

When the target provides the **a11y-audit** agent, use it. Otherwise execute this prompt directly with the installed `a11y-*` skills and preserve the workflow order and safety requirements below.

Use the single phase map (phases 0–12). Execute phases in numerical order:

1. Complete Phase 0 setup without discovery questions — use the settings above,
   create `$RUN` and `$SCRATCH`, load the finding schema, rule catalog, and
   finding-batch contract, and Read `a11y-framework` if the stack is detectable.
2. Phase 1 is the first test. Run the shipped scanner (public or authenticated; add `--storage-state` when needed):

   ```bash
   node <a11y-playwright>/scripts/a11y-scan.mjs \
     --url ${input:pageUrl} --mode axe,tree,coverage \
     --out $SCRATCH/scan-axe-page-1.json
   ```

   Skip later phases from the scan's `inventory` flags. Do not run unpinned `@axe-core/cli`.
   If `scans.axe.status` is not `ok` on a public page, run the pinned CLI and
   engine to `$SCRATCH/scan-axe-cli-page-1.json` (never overwrite the primary
   scan):

   ```bash
   npx --yes --package=@axe-core/cli@4.10.2 --package=axe-core@4.10.3 axe \
     ${input:pageUrl} --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa \
     --save $SCRATCH/scan-axe-cli-page-1.json
   ```

   Do not use this unauthenticated fallback for an authenticated route.

3. Run code-review phases 2–9 one at a time by Reading domain skills and
   applying catalog `rule_id`s only. Domain skills return objects; the
   orchestrator writes one immutable
   `$SCRATCH/findings-agent-phase-<N>-page-1.json` batch after each selected
   phase, including empty batches. Never invent a `rule_id`. Since Phase 1 ran,
   do not emit axe- or Playwright-owned rules.
   - 2: `a11y-alt-text-headings`, `a11y-text-quality` (+ `a11y-media` if `inventory.hasMedia`)
   - 3: `a11y-keyboard` (+ `a11y-modal` if `inventory.hasDialogs`)
   - 4: `a11y-forms` (skip if not `inventory.hasForms`)
   - 5: `a11y-contrast` (+ `a11y-design-system` if tokens)
   - 6: `a11y-live-regions` (skip if no live regions or async UI)
   - 7: `a11y-aria` (skip if not `inventory.hasCustomWidgets`)
   - 8: `a11y-tables` (skip if not `inventory.hasTables`)
   - 9: `a11y-links`
4. Phase 10: Read `a11y-playwright` and run `--mode keyboard,viewport` into
   `$SCRATCH/scan-playwright-page-1.json` when Playwright is available. Do not
   re-run axe.
5. Phase 11: Read `a11y-severity-scoring` (catalog + `references/help-urls.md`); run `static-review.py`; write `$RUN/ACCESSIBILITY-AUDIT.md`. Do not write `dismissals.json` unless the user supplied one.
6. Offer Phase 12 interactive fix mode via `a11y-issue-fixer`

## Progress Transparency

Use the agent's phase gate. Announce every transition with the current phase and status:

- **Start:** `[A11Y AUDIT · Phase N/12 · START] [phase name] — [what runs now]`
- **Completion:** `[A11Y AUDIT · Phase N/12 · DONE] [phase name] — [issue count and severity breakdown, or concise outcome]`
- **Skip/failure:** Use `SKIPPED` or `FAILED`, include the reason, and identify the next phase.

Do not batch multiple numbered phases under one announcement. Finish and summarize each phase before starting the next.
