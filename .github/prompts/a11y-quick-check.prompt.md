---
name: a11y-quick-check
description: Quick accessibility triage of a web page. Runtime axe-core scan only - no code review. Fast pass/fail verdict with score.
mode: agent
agent: a11y-audit
tools:
  - askQuestions
  - readFile
  - listDirectory
  - runInTerminal
  - getTerminalOutput
---

# Quick Web Accessibility Check

Fast triage - run axe-core against a live URL and get a pass/fail verdict. No code review, no screenshots. Fastest way to check a page.

## Page to check

**URL:** `${input:pageUrl}`

## Settings

- **Audit method:** Runtime scan only (axe-core)
- **Thoroughness:** Quick profile — phases **0 (pre-configured) → 1 → 11** only
- **Target standard:** WCAG 2.2 AA
- **Report:** Inline (no separate file)

## Instructions

When the target provides the **a11y-audit** agent, use it. Otherwise execute this prompt directly with the installed `a11y-*` skills and preserve the workflow order and safety requirements below.

Use the **quick** profile:

1. Complete Phase 0 setup without discovery questions — settings are pre-configured above. Create `$RUN` (`.a11y/runs/<YYYY-MM-DD-HHMMSS>`) and `$SCRATCH` (`mktemp -d`) before Phase 1.
2. Run axe-core against the URL as the first and only testing phase (Phase 1). For a public page:

   ```bash
   npx @axe-core/cli ${input:pageUrl} --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa --save $SCRATCH/scan-axe.json
   ```

   For an authenticated page, follow `a11y-web-scanning`'s authenticated Phase 1 procedure and use the shipped `a11y-playwright` scanner with `--mode axe --storage-state <file> --out $SCRATCH/scan-axe.json`. Verify the intended page loaded; do not scan an authenticated route with `@axe-core/cli`.

3. Mark Phases 2–10 `SKIPPED` one at a time in numerical order because the quick profile omits domain and behavioral testing.
4. Parse results, score with `a11y-severity-scoring`, and report inline in Phase 11:

```text
Quick Check: ${input:pageUrl}
Score: [0-100] ([grade])
Violations: [count]
Critical / Serious / Moderate / Minor: [counts]
Top issues: [up to 5 rule ids + short descriptions]
Verdict: Pass / Needs work / Fail
```

5. Offer a full standard or deep-dive audit if the user wants remediation depth.

Use the standard progress marker for every phase, including skipped phases, for example:

`[A11Y AUDIT · Phase 1/12 · START] Automated baseline — running axe-core`
