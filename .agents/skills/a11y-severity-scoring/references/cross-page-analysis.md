# Cross-Page Analysis

Load this reference when an audit covers more than one page or component and you need pattern classification, structural diffing, or remediation tracking against a baseline.

Scoring itself stays in `SKILL.md` — this reference never redefines weights or grades.

## Pattern Detection

- Identify issues that repeat on **every** audited page (systemic — usually layout or navigation).
- Detect issues shared by pages using the same template or layout component (template-level).
- Isolate issues unique to individual pages (page-specific).
- Flag the highest-ROI fixes: systemic issues, because one change clears every page.

## Pattern Classification

| Pattern type | Definition | Remediation ROI |
|--------------|-----------|-----------------|
| Systemic | Same issue on every audited page | Highest — usually layout/nav, fix once |
| Template | Same issue on pages sharing a component | High — fix the shared component |
| Page-specific | Unique to one page | Normal — fix individually |

## Accessibility Tree Diffing

When Playwright accessibility tree snapshots are available from `a11y-playwright`, compare structural consistency across pages:

1. **Landmark consistency** — verify the same landmark roles (banner, navigation, main, contentinfo) appear on every page. Flag pages missing a landmark that exists on all others.
2. **Heading level consistency** — detect when the same content type uses different heading levels across pages (page title is H1 on the homepage but H2 on subpages).
3. **ARIA label consistency** — flag inconsistent labelling of the same landmark (`aria-label="Main navigation"` on some pages, `aria-label="Nav"` on others).
4. **Role drift** — detect components with different roles on different pages (`role="navigation"` on the homepage but `role="list"` elsewhere for the same nav).

Tree diffing produces a **structural consistency score** (0–100) reported alongside the severity score. 100 means all pages share identical landmark, heading, and role structure. This score is descriptive; it does not feed the severity deduction.

## Keyboard Flow Comparison

When Playwright keyboard scan results are available, compare tab-order sequences across pages:

1. **Navigation order consistency** — shared elements (header nav, skip links, footer links) should hold the same relative tab order everywhere.
2. **Trap aggregation** — keyboard traps on multiple pages classify as systemic; a single page is page-specific.
3. **Tab count variance** — flag pages whose tab-stop count differs sharply from the mean, which suggests hidden interactive elements or excessive tabbable items.
4. **Focus management patterns** — compare route-change focus handling (moved to main content vs left on nav vs lost entirely).

## Remediation Tracking

### Change classification

| Status | Definition |
|--------|-----------|
| Fixed | Present in the previous report, absent now |
| New | Not in the previous report, appears now |
| Persistent | Remains from the previous report |
| Regressed | Previously fixed, has returned |

### Progress metrics

- **Issue reduction:** `(fixed / previous_total) * 100`
- **Score change:** `current_score - previous_score`
- **Pages improved:** count of pages scoring higher than the previous audit
- **Trend:** improving (up 5+), stable (within 5), declining (down 5+)

### Normalized trend metric

When audit scope changes between runs, compare using a normalized score:

```text
normalized_score = raw_score - scope_variance_penalty
scope_variance_penalty = min(10, abs(previous_pages - current_pages) * 0.8)
```

Use the normalized score for trend charts and the raw score for release gates.

## Output

Return to the orchestrating audit:

- `patterns` — each with frequency, severity, affected pages, and classification (`systemic` | `template` | `page-specific`)
- `scorecard` — page URL, score, grade, issue counts by severity (scored via `SKILL.md`)
- `remediation_delta` — fixed / new / persistent / regressed counts, when a baseline was provided
- `tree_diff` — structural consistency score plus landmark, heading, and role inconsistencies, when Playwright data exists
- `keyboard_comparison` — tab-order consistency, trap aggregation, focus management patterns, when Playwright data exists
