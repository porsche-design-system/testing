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

1. Complete Phase 0 setup without discovery questions — use the settings above, create `$RUN` and `$SCRATCH`, load the finding schema, and Read `a11y-framework` if the stack is detectable.
2. Phase 1 is the first test. For a public page, run axe-core against the URL before any other scanner or code-review pass:

   ```bash
   npx @axe-core/cli ${input:pageUrl} --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa --save $SCRATCH/scan-axe.json
   ```

   If the page requires authentication, follow `a11y-web-scanning`'s authenticated Phase 1 procedure instead: establish storage state, verify the intended page loaded, and run the shipped `a11y-playwright` scanner with `--mode axe --storage-state <file>`. Do not run `@axe-core/cli` against an authenticated route.

3. Run code-review phases 2–9 one at a time by Reading domain skills and applying their checklists:
   - 2: `a11y-alt-text-headings`, `a11y-text-quality` (+ `a11y-media` if media present)
   - 3: `a11y-keyboard` (+ `a11y-modal` if overlays)
   - 4: `a11y-forms`
   - 5: `a11y-contrast` (+ `a11y-design-system` if tokens)
   - 6: `a11y-live-regions`
   - 7: `a11y-aria`
   - 8: `a11y-tables` (skip if none)
   - 9: `a11y-links`
4. Phase 10: Read `a11y-playwright` and run CLI behavioral scans when Playwright is available
5. Phase 11: Read `a11y-severity-scoring` (and its `references/help-urls.md` for finding help links); write `$RUN/ACCESSIBILITY-AUDIT.md`
6. Offer Phase 12 interactive fix mode via `a11y-issue-fixer`

## Progress Transparency

Use the agent's phase gate. Announce every transition with the current phase and status:

- **Start:** `[A11Y AUDIT · Phase N/12 · START] [phase name] — [what runs now]`
- **Completion:** `[A11Y AUDIT · Phase N/12 · DONE] [phase name] — [issue count and severity breakdown, or concise outcome]`
- **Skip/failure:** Use `SKIPPED` or `FAILED`, include the reason, and identify the next phase.

Do not batch multiple numbered phases under one announcement. Finish and summarize each phase before starting the next.
