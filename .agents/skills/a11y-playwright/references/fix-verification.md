# Fix Verification

Load this reference in Phase 12, after `a11y-issue-fixer` has applied changes and you need to confirm they worked without regressions.

Verification never edits source. It re-measures and returns a verdict.

## Step 1: Receive fix context

From `a11y-issue-fixer`, each fix arrives with:

- `fix_number` — position in the batch
- `rule_id` — axe rule id (`color-contrast`, `button-name`) or WCAG criterion
- `selector` — CSS selector of the changed element
- `url` — dev server URL
- `fix_type` — `contrast` | `keyboard` | `aria` | `structure` | `state` | `viewport`

Without a URL, verification is not possible: report `NOT_AVAILABLE` and stop. Do not claim a fix is verified from source inspection alone.

## Step 2: Run the targeted scan

Map the fix type to the narrowest scan that proves it, using `scripts/a11y-scan.mjs`:

| Fix type | Command | What proves the fix |
|----------|---------|---------------------|
| `contrast` | `--mode axe --selector "<sel>"` | Relevant axe contrast violation is absent; manually verify scanner coverage gaps |
| `keyboard` | `--mode keyboard` | Element appears in `tabSequence`; no new entry in `keyboardTraps`; visible focus is manually verified |
| `aria` / `structure` | `--mode tree,axe --selector "<sel>"` | Correct role and name; heading/landmark structure resolved |
| `state` | `--mode axe --selector "<sel>"` after the interaction (see [scan-patterns.md](scan-patterns.md)) | Revealed content is clean |
| `viewport` | `--mode viewport` | Element absent from `undersizedTargets`; width absent from `reflowFailures` |

Run the same scan mode that originally produced the finding, so the before/after comparison is like for like.

## Step 3: Determine the verdict

| Verdict | Condition |
|---------|-----------|
| `PASS` | Original violation is gone and no new violations appeared in the scanned scope |
| `FAIL` | Original violation is still present |
| `REGRESSION` | Original violation is gone but new violations appeared |

A `REGRESSION` is more serious than a `FAIL`. Report it immediately and offer the revert-first path from `a11y-issue-fixer`.

## Step 4: Report

```text
FIX VERIFICATION #{fix_number}
Rule:     {rule_id}
Selector: {selector}
Scan:     {mode used}
Verdict:  {PASS | FAIL | REGRESSION}
Detail:   {before value -> after value, or new violation ids}
```

Batch summary once all fixes are checked:

```text
VERIFICATION SUMMARY
Total fixes:          {n}
PASS:                 {n}
FAIL:                 {n}
REGRESSION:           {n}
Skipped (no URL/tool): {n}
```

Feed these verdicts back into `a11y-severity-scoring` so the post-fix score reflects verified state rather than assumed state.

## Regression tests

After a verified `PASS`, offer to generate a Playwright regression test so the issue cannot silently return. Use the AxeBuilder and keyboard patterns in [scan-patterns.md](scan-patterns.md), and [ci-integration.md](ci-integration.md) for wiring the suite into CI.
