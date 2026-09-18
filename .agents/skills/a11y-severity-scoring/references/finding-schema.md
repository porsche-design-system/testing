# Finding Schema

The shared shape every accessibility finding must take before it reaches the report, the CSV export, or the fixer. Load this once at the start of an audit; every domain skill's output is normalized to this schema.

Unstructured prose causes misinterpretation — one reader's "severe issue" is another's "moderate finding." These fields keep severity, location, and confidence unambiguous for humans and for downstream tooling.

## Finding fields

Domain batch input must include `rule_id`, `location`, `description`, `impact`,
and `remediation`. `normalize-findings.py` supplies and validates the generated
fields below before anything reaches a report:

| Field | Values / format |
|-------|-----------------|
| `rule_id` | Agent batches: catalog id from [rule-catalog.json](rule-catalog.json) only. Axe scanner/CLI findings may use the installed engine's rule id; catalog metadata is applied when that id is known. Never a free WCAG string (`WCAG-1.1.1`) or an invented kebab-case name in agent review. |
| `severity` | generated: `critical` \| `serious` \| `moderate` \| `minor` — taken from the catalog, not chosen per run |
| `confidence` | generated: `confirmed` \| `high` \| `medium` \| `low` — catalog default, then source correlation |
| `location` | `url` plus either `selector` or `file` (catalog `location_key`). Line numbers may appear in prose, never as the identity key. |
| `description` | one sentence: what is wrong |
| `impact` | one sentence: who is affected and how |
| `remediation` | one sentence: how to fix it |
| `wcag` | generated criterion id from the catalog |
| `sources` | generated array containing `axe`, `agent-review`, and/or `playwright` |
| `help_url` | from [help-urls.md](help-urls.md), when available |
| `phase` | generated from the catalog |

`sources` drives confidence upgrades. Axe, Playwright, and agent-review are
independent families. They must not be aliases of one another.

Identity for merge, scoring, and run-to-run comparison is `(rule_id, url, canonical_location)` where `canonical_location` is the selector, the file path, or `document` — never `file:line`. See [finding-batch.md](finding-batch.md) for the JSON agents must write.

## Score fields

Every scored page or component MUST include:

- `score` — 0–100 integer, computed by `SKILL.md` only
- `grade` — `A` | `B` | `C` | `D` | `F`
- `counts` — issue counts by severity

Scores describe only the checks that ran. Do not add a conformance verdict from
the score alone.

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

1. Every finding carries a catalog `rule_id`, severity, confidence, location, description, and remediation.
2. Scores came from `SKILL.md` via `normalize-findings.py`, not from an ad-hoc formula.
3. Duplicate findings across skills and scanners were merged by `(rule_id, url, canonical_location)`, preserving all contributing `sources` values.
4. Help URLs are attached wherever [help-urls.md](help-urls.md) provides one.

If a skill pass returns incomplete findings, re-apply that skill with the missing fields named explicitly rather than guessing values.
