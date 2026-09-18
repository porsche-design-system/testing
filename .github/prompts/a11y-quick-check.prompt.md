---
name: a11y-quick-check
description: Quick accessibility triage of a web page. Runtime axe-core, structure, and coverage scan; no code review. Fast pass/fail verdict with score.
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

# Quick Web Accessibility Check

Fast triage — run the deterministic Phase 1 scanner against a live URL and get
a scoped verdict. No code review or screenshots.

## Page to check

**URL:** `${input:pageUrl}`

## Settings

- **Audit method:** Runtime scan only (axe-core)
- **Thoroughness:** Quick profile — phases **0 (pre-configured) → 1 → 11** only
- **Target standard:** WCAG 2.2 AA
- **Report:** Standard run artifacts plus an inline summary

## Instructions

When the target provides the **a11y-audit** agent, use it. Otherwise execute this prompt directly with the installed `a11y-*` skills and preserve the workflow order and safety requirements below.

Use the **quick** profile:

1. Complete Phase 0 setup without discovery questions — settings are
   pre-configured above. Create `$RUN`
   (`.a11y/runs/<YYYY-MM-DD-HHMMSS>`) and `$SCRATCH` (`mktemp -d`), then read
   the finding schema and rule catalog before Phase 1.
2. Run axe-core against the URL as the first and only testing phase (Phase 1):

   ```bash
   node <a11y-playwright>/scripts/a11y-scan.mjs \
     --url ${input:pageUrl} --mode axe,tree,coverage \
     --out $SCRATCH/scan-axe-page-1.json
   ```

   For an authenticated page, add `--storage-state <file>`. Do not use `@axe-core/cli`
   as the primary Phase 1 path.
   If `scans.axe.status` is not `ok` on a public page, run the CLI fallback
   without overwriting the primary scan:

   ```bash
   npx --yes @axe-core/cli axe \
     ${input:pageUrl} --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa \
     --save $SCRATCH/scan-axe-cli-page-1.json
   ```

   Normalize both files.

3. Mark Phases 2–10 `SKIPPED` one at a time in numerical order because the quick profile omits domain and behavioral testing.
4. Normalize `$SCRATCH/scan-axe-page-1.json` and, when created, `$SCRATCH/scan-axe-cli-page-1.json` into `$RUN/findings.json`, run
   `export-findings.py --format summary`, and write
   `$RUN/ACCESSIBILITY-AUDIT.md`. Paste the generated numeric block unchanged
   as the inline Phase 11 summary. Add prose about scope, but do not restate any
   number or invent a second pass/fail formula.

5. Offer a full standard or deep-dive audit if the user wants remediation depth.
6. Retain the trimmed scan under `$RUN/raw/`, delete `$SCRATCH`, and print the
   report path.

Use the standard progress marker for every phase, including skipped phases, for example:

`[A11Y AUDIT · Phase 1/12 · START] Automated baseline — running axe-core`
