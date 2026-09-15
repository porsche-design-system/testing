# Finding Schema

The shared shape every accessibility finding must take before it reaches the report, the CSV export, or the fixer. Load this once at the start of an audit; every domain skill's output is normalized to this schema.

Unstructured prose causes misinterpretation — one reader's "severe issue" is another's "moderate finding." These fields keep severity, location, and confidence unambiguous for humans and for downstream tooling.

## Finding fields

Every finding MUST include:

| Field | Values / format |
|-------|-----------------|
| `rule_id` | axe rule id (`color-contrast`), WCAG id (`WCAG-1.1.1`), or skill-specific id |
| `severity` | `critical` \| `serious` \| `moderate` \| `minor` |
| `confidence` | `confirmed` \| `high` \| `medium` \| `low` |
| `location` | file path + line, and/or element selector + page URL |
| `description` | one sentence: what is wrong |
| `impact` | one sentence: who is affected and how |
| `remediation` | one sentence: how to fix it |
| `wcag` | criterion id + name + level, when applicable |
| `source` | `axe` \| `agent-review` \| `lighthouse` \| `playwright` (list when multiple) |
| `help_url` | from [help-urls.md](help-urls.md), when available |
| `phase` | the audit phase that produced it |

`source` drives the confidence upgrades defined in `SKILL.md` — record every source that independently found the issue, not just the first.

## Score fields

Every scored page or component MUST include:

- `score` — 0–100 integer, computed by `SKILL.md` only
- `grade` — `A` | `B` | `C` | `D` | `F`
- `counts` — issue counts by severity
- `verdict` — pass/fail against the target standard, with a short reason

## Fix result fields

Every state-changing fix MUST report:

- `action` — what was done
- `target` — file and line, or selector
- `result` — `success` | `failure` | `skipped`
- `reason` — required when the result is failure or skipped
- `verification` — `PASS` | `FAIL` | `SKIPPED` | `NOT_AVAILABLE`

## Mode constraints

**Audit mode** (default): read files, fetch URLs, run non-destructive scanners, produce findings and reports. Do not modify source until the user opts into fix mode.

**Fix mode** (via `a11y-issue-fixer`): edit source only for agreed issues. Auto-fixable changes may apply in batch when the user selects that mode; human-judgment fixes need per-item approval. Re-scan after fixing to verify.

If a request falls outside web accessibility audit scope (for example Office or PDF document remediation), state the limitation and continue with web-only guidance.

## Validate before reporting

Before writing the report or exporting CSV/JSON, confirm:

1. Every finding carries severity, confidence, location, description, and remediation.
2. Scores came from `SKILL.md`, not from an ad-hoc formula.
3. Duplicate findings across skills and scanners were merged, preserving all contributing `source` values.
4. Help URLs are attached wherever [help-urls.md](help-urls.md) provides one.

If a skill pass returns incomplete findings, re-apply that skill with the missing fields named explicitly rather than guessing values.
