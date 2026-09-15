# Rule catalog

Canonical `rule_id` set for scored findings. The executable copy is
[rule-catalog.json](rule-catalog.json). `normalize-findings.py` rejects unknown
IDs and overwrites severity, confidence baseline, phase, and WCAG from this
file. It drops agent copies of scanner-owned rules only when that scanner
actually completed for the page.

**Version:** `2026-q3` (recorded on every `findings.json` as `scoring.catalogVersion`).

## Owners

| Owner | Who may emit | Typical source |
|-------|----------------|----------------|
| `axe` | axe-core only | Phase 1 `a11y-scan.mjs --mode axe` |
| `playwright` | behavioural scanner only | Phase 1 tree / Phase 10 keyboard+viewport |
| `agent-review` | domain skills and `static-review.py` | Phases 2–9 JSON batches |

Do not invent a `rule_id`. If a checklist item is scanner-owned, do not emit it
after that scanner ran. Code-review-only mode may use its exact catalog ID for
definitive source evidence.

## Agent-review rules

Emit only when the catalog `emit_if` predicate is true. Location identity is `selector` or `file` — never a line number.

| Rule ID | Phase | Severity | Predicate (summary) |
|---------|-------|----------|---------------------|
| `alt-text-quality` | 2 | moderate | generic alt or filename-as-alt |
| `accessible-name-quality` | 2 | serious | template syntax, exact placeholder token, or dotted identifier |
| `language-of-parts` | 2 | moderate | foreign passage without `lang` |
| `audio-description-missing` | 2 | serious | video with no AD / alternative |
| `transcript-missing` | 2 | serious | audio-only with no transcript |
| `spa-focus-on-route-change` | 3 | serious | SPA route change does not move focus |
| `modal-focus-return` | 3 | serious | dialog does not restore trigger focus |
| `modal-escape` | 3 | serious | modal has no Escape close path |
| `placeholder-only-label` | 4 | serious | placeholder is the only label |
| `error-not-associated` | 4 | serious | error text not programmatically tied |
| `autocomplete-missing` | 4 | moderate | identity/payment field lacks `autocomplete` |
| `wizard-step-focus` | 4 | moderate | step change does not move focus |
| `color-only-meaning` | 5 | serious | state conveyed by color alone |
| `prefers-reduced-motion` | 5 | moderate | motion with no reduced-motion fallback |
| `live-region-missing` | 6 | serious | status/filter update with no live region |
| `apg-widget-incomplete` | 7 | serious | custom widget missing APG state/keys |
| `table-caption-missing` | 8 | minor | data table has no accessible name |
| `table-layout` | 8 | moderate | layout table not `presentation`/`none` |
| `link-name-ambiguous` | 9 | moderate | name in `lists.ambiguous_link_names` |
| `timeout-no-warning` | 4 | serious | timeout with no warning or extend |
| `accessible-auth` | 4 | serious | auth blocks paste / password manager |

Closed lists live under `lists` in the JSON (`ambiguous_link_names`, `generic_alt`, `placeholder_names`).

## Playwright rules

`keyboard-trap`, `reflow`, `target-size-measured`,
`page-has-heading-one`, `heading-order`, `landmark-missing`.

## Axe rules

The `scanner` block is the parity contract: wrapper
`@axe-core/playwright@4.10.2`, exact engine `axe-core@4.10.3`, supported tags,
disabled rules, and all 69 rule IDs selected by those tags. Package tests fail
when any configured rule is absent from the catalog.
