---
description: Fix accessibility issues from an audit report. Applies auto-fixable changes
  and walks human-judgment fixes through approval, with framework-correct syntax and
  optional re-scan verification.
---

# Fix Web Accessibility Issues

Apply fixes from a completed audit. `a11y-issue-fixer` is the **sole fix policy** — read it first and follow its categories, safety rules, and output contract. Do not restate or invent a second auto-fix table here.

## Input

**Audit report:** `${input:auditFile}` (default: `ACCESSIBILITY-AUDIT.md` in the newest `.a11y/runs/` directory)

## Instructions

When the target provides the **a11y-audit** agent, use it. Otherwise execute this prompt directly with the installed `a11y-*` skills and preserve the workflow order and safety requirements below.

Run Phase 12 of the audit workflow.

### Step 1: Confirm scope

Ask (via `askQuestions`):

1. **Report path** — default: the report in the newest `.a11y/runs/` directory
2. **Fix mode**
   - Auto-fixable batch — preview the batch, then ask once before applying it
   - One by one — show every fix for approve / skip / edit
   - Specific issues — user picks by issue number
3. **Verification URL** — dev server URL, or none

### Step 2: Load context

1. Resolve the report's sibling `findings.json`; stop if it is missing or
   inconsistent. Treat it as `$BASELINE`.
2. Create a new `$RUN=.a11y/runs/<timestamp>` and `$SCRATCH=$(mktemp -d)`.
   Never overwrite the baseline run.
3. Read `$BASELINE.scoring`: `profile`, `executedChecksByPage`,
   `reviewedPhasesByPage`, and the `scannerMetadata` list. These define the
   verification work that must be repeated.
4. Parse active findings from `findings.json`: rule ID, severity, WCAG,
   file/selector location, and remediation.
5. Detect the framework (Read `a11y-framework` when the stack is known) so edits use correct syntax.
6. Read `a11y-issue-fixer` and classify every finding using **its** tables — auto-fixable vs human-judgment.

### Step 3: Apply fixes

Follow `a11y-issue-fixer`. Non-negotiables from that skill:

- Show the complete proposed batch and obtain confirmation before any edit.
- Never auto-add `alt=""` to an image whose purpose is unknown.
- Never change an ARIA role without first searching all JS/CSS selectors that reference it.
- Every human-judgment fix needs explicit approval before the edit.

For each fix, report `Applied` / `Skipped (reason)` / `Needs approval` with before/after snippets.

### Step 4: Verify

1. Run the project linter and confirm the app still builds.
2. `scannerMetadata` is a list. For each page, use only entries with
   `runner: a11y-scan`; CLI fallback entries are evidence, not configuration.
   Select the entry whose `modes` contains `axe`. If multiple entries differ on
   any replay option, stop and ask which configuration is authoritative instead
   of choosing by list order. If `executedChecksByPage` contains `axe`, re-run
   Phase 1 with that entry's `tags`, `selector`, `storageState`, `colorScheme`,
   `timeout`, `loadDelay`,
   `readiness.readySelector`, `readiness.stabilityWindow`, and
   `readiness.bestEffort` policy:

   ```bash
   node <a11y-playwright>/scripts/a11y-scan.mjs \
     --url <URL> --mode axe,tree,coverage \
     --tags <baseline-tags> [--selector <baseline-selector>] \
     [--storage-state <baseline-storage-state>] \
     --color-scheme <baseline-color-scheme> \
     --timeout <baseline-timeout> \
     --load-delay <baseline-load-delay> \
     --stability-window <baseline-stability-window> \
     [--ready-selector <baseline-ready-selector>] \
     [--best-effort-readiness] \
     --out $SCRATCH/scan-axe-page-<M>.json
   ```

   If the replayed `scans.axe.status` is not `ok` and the baseline metadata for
   this page contains `runner: axe-cli`, also repeat the CLI fallback to
   `$SCRATCH/scan-axe-cli-page-<M>.json` and include it in normalization.

3. From the page's metadata entries, union `modes`. If that set contains
   `keyboard` or `viewport`, select the matching `runner: a11y-scan` entry using
   the same no-ambiguity rule. Re-run exactly those Phase 10 modes with its
   `storageState`, `loadDelay`, readiness options, `viewports`, `maxTabs`, and
   `timeout` to
   `$SCRATCH/scan-playwright-page-<M>.json`.
4. Re-run every phase in `reviewedPhasesByPage` and write immutable
   `$SCRATCH/findings-agent-phase-<N>-page-<M>.json` batches. Run
   `static-review.py` when Phase 1 ran.
5. Reuse the baseline run's `dismissals.json` unchanged when it exists.
6. Pass the complete rebuilt input set to `normalize-findings.py` with the
   baseline profile, `--baseline $BASELINE`, and `--dismiss` when applicable.
   Write `$RUN/findings.json`.
7. Run `export-findings.py --format summary`; never calculate the delta or
   counts manually.

### Step 5: Report

Write `$RUN/ACCESSIBILITY-AUDIT.md` with the generated summary and a
**Fixes Applied** section. Summarize inline:

```text
Fixes applied: [count] ([auto] auto, [approved] approved)
Skipped: [count]
Verified by re-scan: [passed] / [attempted]
Score: [previous] -> [current] ([+/-] points)
Remaining: [count] requiring manual attention
```

Retain raw scans, delete `$SCRATCH`, and print the new report path.

## Progress transparency

- **Before starting:** "Applying [N] fixes across [N] files ([N] auto-fixable, [N] need approval)"
- **Per fix:** issue, before/after, status
- **On completion:** "Fix pass complete: [N] applied, [N] skipped, [N] pending approval"
- **On failure:** "Fix failed for [file]:[line]: [reason]. File left unchanged."