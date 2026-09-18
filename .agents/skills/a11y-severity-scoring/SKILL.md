---
name: a11y-severity-scoring
description: Compute web accessibility scores (0-100, A-F grades) with severity scoring, confidence levels, and remediation tracking across audits.
user-invocable: false
---

# Web Severity Scoring

This skill is the **sole scoring authority** for `a11y-audit`. Do not use a different formula from memory, from the agent body, or from any other skill.

Before collecting findings, read [finding-schema.md](references/finding-schema.md) and [rule-catalog.md](references/rule-catalog.md) — scoring depends on every finding carrying a catalog `rule_id`, a `severity`, a `confidence`, and a complete `source` list.

During a full audit, scoring and report assembly run in **Phase 11** only, after every selected testing phase has a `DONE`, `SKIPPED`, or `FAILED` status. Complete normalization, deduplication, scoring, and summary export before returning counts to the agent; partial phase results must not be presented as the final score.

## Computing scores

Prefer the script. `scripts/normalize-findings.py` parses scanner output into the finding schema, merges duplicates, applies source correlation, and computes scores using exactly the formula below:

```bash
# Score one or more scanner outputs (axe CLI, @axe-core/playwright, or a11y-scan.mjs)
python3 scripts/normalize-findings.py $SCRATCH/scan-axe-page-1.json $SCRATCH/scan-playwright-page-1.json --out $RUN/findings.json

# Scorecard ready to paste into the report
python3 scripts/normalize-findings.py *.json --format markdown

# Compare against a previous audit
python3 scripts/normalize-findings.py $SCRATCH/scan-axe-page-1.json --baseline .a11y/runs/<previous>/findings.json
```
## Dismissing false positives

Scanners misjudge web-component design systems in predictable ways. When you have **verified** a finding is wrong, record it in a dismissal file and re-run — never edit `findings.json`, and never resolve it in the report's prose only:

```json
[{"rule_id": "focus-not-visible",
  "selector": "p-button",
  "reason": "Focus ring rendered in shadow DOM; verified visible on Tab."}]
```

```bash
python3 scripts/normalize-findings.py $SCRATCH/scan-*.json \
  --dismiss $RUN/dismissals.json --out $RUN/findings.json
```

`selector` and `url` are optional substring filters; omit both to dismiss the rule for the whole page. Every entry needs a `reason` or the script exits with an error. Dismissals are applied **before** counting and scoring, so `overall.counts`, the per-page counts, the score, and the findings list are always consistent, and dismissed findings are preserved under `dismissed` with their reasons for the report.

> `$RUN` is the timestamped run directory the `a11y-audit` agent creates in Phase 0 (`.a11y/runs/<YYYY-MM-DD-HHMMSS>`); `$SCRATCH` is a `mktemp -d` directory for intermediates, which are never written into the project. Running standalone, substitute any directories.


It accepts `--profile balanced|strict|advisory` and emits per-page scores, grades, severity counts, merged findings, and a remediation delta. Hand-computed scores drift between runs; the script does not.

Closed-list code-review findings (ambiguous link names, generic alt, template names) come from `scripts/static-review.py` so those identities do not depend on the model:

```bash
python3 scripts/static-review.py $SCRATCH/scan-axe-page-1.json --out $SCRATCH/findings-static-page-1.json
```

For code review or a scanner without a native parser, write an intermediate batch under `$SCRATCH` and pass it to the same script:

```json
{
  "type": "a11y-finding-batch",
  "url": "https://example.test/page",
  "source": "agent-review",
  "phase": "2",
  "findings": [
    {
      "rule_id": "heading-order",
      "severity": "moderate",
      "confidence": "high",
      "location": {"selector": "main h3"},
      "description": "Heading level skips from h1 to h3.",
      "impact": "Screen-reader heading navigation does not reflect the page hierarchy.",
      "remediation": "Use an h2 for the section heading.",
      "wcag": "1.3.1",
      "wcag_level": "A"
    }
  ]
}
```

Use `source: agent-review` for code-review batches. Scanner JSON from
`a11y-scan.mjs` or the axe-core CLI fallback is parsed directly; do not wrap it in a
finding batch. Never calculate a code-review-only score by hand.

## Severity Scoring Formula

The script is the executable form of this table. If you change one, change both.

```text
Page Score = 100 - (sum of weighted findings)

Weights:
  Critical (confirmed, three source families): -18 points
  Critical (high confidence, both sources):  -15 points
  Critical (high confidence, single source): -10 points
  Critical (medium confidence):               -7 points
  Critical (low confidence):                  -3 points
  Serious (high confidence):                  -7 points
  Serious (medium confidence):                -5 points
  Serious (low confidence):                   -2 points
  Moderate (high confidence):                 -3 points
  Moderate (medium confidence):               -2 points
  Moderate (low confidence):                  -1 point
  Minor:                                      -1 point

Floor: 0 (minimum score)
```

### Scoring Profiles

Use a profile to tune strictness by context while keeping comparable grade bands:

| Profile | Intended Use | Multiplier |
|---------|--------------|------------|
| balanced (default) | Standard product delivery | 1.0 |
| strict | Regulated/public-sector releases | 1.15 |
| advisory | Early design and prototyping | 0.8 |

Apply the profile multiplier to each final deduction after confidence handling.

### Formula

```pseudocode
page_score = 100
for each finding:
    base = lookup(severity, confidence_level, source_count)  // from table above
    multiplier = 1.2 if confidence_level == "confirmed" else 1.0
    deduction = base × multiplier
    page_score = max(0, page_score - deduction)
```

The values in the lookup table above are **base deductions** (pre-multiplier).
"Confirmed" findings (validated by three independent source families on one
exact catalog identity) apply an additional 1.2× multiplier.

**Example:** One Critical finding at confirmed confidence = 18 (base) × 1.2 = **21.6 points** deducted → page score 78.

### Calibration Layer (v2)

To reduce false-positive inflation and stabilize trends, apply a calibration coefficient by rule family:

```text
calibrated_deduction = deduction × calibration_coefficient(rule_family)
```

Recommended initial coefficients:

| Rule Family | Coefficient | Rationale |
|-------------|-------------|-----------|
| Keyboard/focus | 1.1 | High functional impact at runtime |
| Forms/labels/errors | 1.05 | High completion risk for core tasks |
| Semantics/structure | 1.0 | Baseline scoring |
| Link text/context | 0.9 | Higher context variance |
| Content quality (alt/link clarity) | 0.85 | Needs human review more often |

Update coefficients quarterly from confirmed outcomes. Avoid changing coefficients more than +/-0.1 per cycle.

## Score Grades

| Score | Grade | Meaning |
|-------|-------|---------|
| 90-100 | A | Minor or no issues in the checks that ran; not a conformance claim |
| 75-89 | B | Some measured issues; manual checks still required |
| 50-74 | C | Multiple measured issues need work |
| 25-49 | D | Poor - significant accessibility barriers |
| 0-24 | F | Failing - critical barriers, likely unusable with AT |

## Confidence Levels

| Level | Weight | When to Use |
|-------|--------|-------------|
| Confirmed | 120% | Same exact catalog identity validated by three independent source families |
| High | 100% | Catalog default for definitive checks, or two independent source families |
| Medium | 70% | Found by one source, likely issue (heading edge cases, questionable ARIA, possible keyboard traps) |
| Low | 30% | Possible issue, needs human review (alt text quality, reading order, context-dependent link text) |

### Source Correlation

Correlation applies only to the same `(rule_id, URL, canonical location)`.
Different instances of one rule never upgrade each other.

Axe, Playwright, and agent-review are independent source families. Agent
duplicates of scanner-owned rules are dropped when that scanner ran, so
optional LLM repetition cannot change a score. Otherwise two independent
families upgrade to **high** and three upgrade to **confirmed**. Input order
never affects this reduction.

### Confidence Drift Guard

Track predicted confidence versus post-triage outcome and compute drift:

```text
drift = abs(predicted_confidence_score - observed_confirmation_rate)
```

Operational guideline:

- drift <= 0.10: stable
- drift 0.11-0.20: tune coefficients and source mapping
- drift > 0.20: freeze profile changes and run rule-level review

## Scorecard Format

### Single Page

```markdown
## Accessibility Score

| Metric | Value |
|--------|-------|
| Page | [URL] |
| Score | [0-100] |
| Grade | [A-F] |
| Critical | [count] |
| Serious | [count] |
| Moderate | [count] |
| Minor | [count] |
```

### Multi-Page

```markdown
## Accessibility Scorecard

| Page | Score | Grade | Critical | Serious | Moderate | Minor |
|------|-------|-------|----------|---------|----------|-------|
| / | 82 | B | 0 | 2 | 3 | 1 |
| /login | 91 | A | 0 | 0 | 2 | 1 |
| /dashboard | 45 | D | 2 | 4 | 3 | 2 |
| **Average** | **72.7** | **C** | **2** | **6** | **8** | **4** |
```

## Output Metadata (Recommended)

Include these fields in generated score artifacts for reproducibility:

```yaml
scoring:
  model: a11y-severity-scoring-v2
  profile: balanced
  catalogVersion: 2026-q3
  confidenceSources:
    - axe-core
    - agent-review
    - playwright
  failThresholds:
    critical: 1
    score: 75
```

This metadata allows deterministic re-runs and audit-to-audit comparisons.

## Issue Severity Categories

### Critical

- No keyboard access to essential functionality
- Missing form labels on required fields
- Images conveying critical information have no alt text
- Color is the sole means of conveying information
- Keyboard traps with no escape

### Serious

- Missing skip navigation
- Poor heading hierarchy (skipped levels)
- Focus not visible on interactive elements
- Form errors not programmatically associated
- Missing ARIA on custom widgets

### Moderate

- Redundant ARIA on semantic elements
- Suboptimal heading structure (multiple H1s)
- Missing autocomplete on identity fields
- Links to new tabs without warning
- Missing table captions

### Minor

- Redundant title attributes
- Suboptimal button text
- Missing landmark roles where semantic elements exist
- Decorative images with non-empty alt text

## Reliability

### Role

This skill is a procedure module for `a11y-audit` and the single place scores are computed. It does not edit source files and does not re-scan pages — it consumes findings and returns scores, grades, and scorecards.

### Output Contract

Your output MUST include:

- `scores`: per-page score (0-100) and grade (A-F)
- `overall_score`: average score and grade
- `scorecard`: table with page URL, score, grade, issue counts by severity
- `scoring_metadata`: profile, calibration version, and confidence sources used

For multi-page audits, [cross-page-analysis.md](references/cross-page-analysis.md) adds `patterns`, `remediation_delta`, `tree_diff`, and `keyboard_comparison`.

### Progress Transparency

When used by the a11y-audit agent:
- **Announce start:** "Scoring [N] findings across [N] pages"
- **Announce completion:** "Scoring complete: overall [score]/100 ([grade])"
- **On failure:** "Scoring incomplete: received findings from [N] of [M] expected pages. Proceeding with available data."

Return structured findings to the orchestrating audit agent.

## Progressive disclosure

Read only the reference files needed for the current reporting step. Do not load every reference by default.

- [Finding schema](references/finding-schema.md) — required fields for findings, scores, and fix results; read once at audit start before collecting findings
- [Rule catalog](references/rule-catalog.md) — allowed `rule_id` values, owners, default severity; read before writing any finding batch
- [Finding batch](references/finding-batch.md) — JSON agents must write under `$SCRATCH`
- [Help URL reference](references/help-urls.md) — map findings to Accessibility Insights / WCAG Understanding help URLs (Phase 11 reporting, CSV export)
- [Cross-page analysis](references/cross-page-analysis.md) — pattern classification, tree diffing, keyboard flow comparison, remediation tracking; multi-page audits and baseline comparisons only
- [WCAG guide](references/wcag-guide.md) — criterion explanations when the user asks “why?” or on deep-dive audits
- [VPAT / ACR export](references/vpat-acr.md) — conformance report table when the user asks for a VPAT or accessibility conformance report
