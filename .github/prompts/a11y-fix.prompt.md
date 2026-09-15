---
name: a11y-fix
description: Fix accessibility issues from an audit report. Applies auto-fixable changes and walks human-judgment fixes through approval, with framework-correct syntax and optional re-scan verification.
mode: agent
agent: a11y-audit
tools:
  - askQuestions
  - readFile
  - listDirectory
  - createFile
  - replaceStringInFile
  - multiReplaceStringInFile
  - runInTerminal
  - getTerminalOutput
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
   - Auto-fixable only — apply safe fixes without asking
   - One by one — show every fix for approve / skip / edit
   - Specific issues — user picks by issue number
3. **Verification URL** — dev server URL, or none

### Step 2: Load context

1. Parse findings from the report: issue number, rule ID, severity, WCAG criterion, file/selector location, recommended fix.
2. Detect the framework (Read `a11y-framework` when the stack is known) so edits use correct syntax.
3. Read `a11y-issue-fixer` and classify every finding using **its** tables — auto-fixable vs human-judgment.

### Step 3: Apply fixes

Follow `a11y-issue-fixer`. Non-negotiables from that skill:

- Never auto-add `alt=""` to an image whose purpose is unknown.
- Never change an ARIA role without first searching all JS/CSS selectors that reference it.
- Every human-judgment fix needs explicit approval before the edit.

For each fix, report `Applied` / `Skipped (reason)` / `Needs approval` with before/after snippets.

### Step 4: Verify

1. Run the project linter and confirm the app still builds.
2. If a URL was provided, re-scan:

   ```bash
   npx @axe-core/cli <URL> --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa
   ```

3. For keyboard, focus, or contrast fixes, Read `a11y-playwright` and run its verification procedures (CLI primary).
4. Re-score with `a11y-severity-scoring` so the delta uses the same formula as the original audit.

### Step 5: Report

Append a **Fixes Applied** section to the audit report and summarize inline:

```text
Fixes applied: [count] ([auto] auto, [approved] approved)
Skipped: [count]
Verified by re-scan: [passed] / [attempted]
Score: [previous] -> [current] ([+/-] points)
Remaining: [count] requiring manual attention
```

## Progress transparency

- **Before starting:** "Applying [N] fixes across [N] files ([N] auto-fixable, [N] need approval)"
- **Per fix:** issue, before/after, status
- **On completion:** "Fix pass complete: [N] applied, [N] skipped, [N] pending approval"
- **On failure:** "Fix failed for [file]:[line]: [reason]. File left unchanged."
