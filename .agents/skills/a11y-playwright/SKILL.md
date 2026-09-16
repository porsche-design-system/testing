---
name: a11y-playwright
description: Browser behavioural accessibility testing using Playwright and @axe-core/playwright. Focus order, keyboard traps, viewport reflow, target geometry, accessibility tree snapshots, coverage gaps, and post-fix verification.
user-invocable: false
---

# Playwright Accessibility Testing

## Audit phase role

The `a11y-audit` agent owns phase numbering. In **Phase 1**, every public or
authenticated page runs `--mode axe,tree,coverage`. In **Phase 10**, run
`--mode keyboard,viewport`; never re-run axe. Complete only the requested
modes, return findings, and stop.

Procedure module for `a11y-audit`. Behavioural testing catches what static review cannot: real tab order, keyboard traps, reflow at narrow widths, and target geometry as rendered.

The numbered instructions below are local steps, not audit phases. Return scanner status, completed modes, artifact path, finding counts, behavioral confidence, and coverage gaps before the agent advances.

It is scoped by one rule: **the scanner never reimplements an axe-core check, and never guesses at what it cannot measure.** axe-core runs inside the same page and owns colour contrast, ARIA validity and name computation. The scanner owns what it can measure directly. Anything neither can settle is reported as an explicit coverage gap rather than as a finding — see [Coverage and its limits](#coverage-and-its-limits).

**Run the shipped scanner. Do not write a new scan script.** `scripts/a11y-scan.mjs` implements all five scans, degrades gracefully, and returns one JSON shape the rest of the audit already understands.

## Authoritative Sources

- **WCAG 2.2 Specification** — https://www.w3.org/TR/WCAG22/
- **Playwright Accessibility** — https://playwright.dev/docs/accessibility-testing
- **@axe-core/playwright** — https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright
- **axe-core Rules** — https://github.com/dequelabs/axe-core/tree/develop/lib/rules

## Execution order

1. **Detect.** Verify the exact supported scanner dependencies below. If that fails, skip to Graceful degradation.
2. **Run the scanner** from the project root, so it resolves the project's own `playwright` install.
3. **Parse the JSON** through `normalize-findings.py`; do not hand-convert it.
4. **Merge** Phase 1, immutable Phase 2–9 batches, and Phase 10 in one
   normalization call. Only exact catalog identities correlate.

Optional MCP `run_playwright_*` tools may substitute for the equivalent scan mode when they exist in the tool list. Their absence is never a failure — the CLI is the primary path.

## Setup

```bash
npm install -D playwright@1.63.0 @axe-core/playwright@4.10.2 axe-core@4.10.3
npx playwright install chromium
```

The scanner records Playwright and browser versions in its JSON. Axe execution
requires exactly `@axe-core/playwright@4.10.2` with `axe-core@4.10.3`; it fails
fast on another version because the rule catalog is versioned against that
engine. The viewport pass does not run axe a second time.

## Running the scanner

```bash
# Phase 1 baseline (axe + structure + coverage)
node scripts/a11y-scan.mjs --url http://localhost:3000 --mode axe,tree,coverage --out $SCRATCH/scan-axe-page-1.json

# Phase 10 behavioural (do not re-run axe)
node scripts/a11y-scan.mjs --url http://localhost:3000 --mode keyboard,viewport --out $SCRATCH/scan-playwright-page-1.json

# One scan type
node scripts/a11y-scan.mjs --url http://localhost:3000 --mode keyboard

# Late-hydrating apps
node scripts/a11y-scan.mjs --url http://localhost:3000 --load-delay 3000 --out $SCRATCH/scan-axe-page-1.json

# Scoped to a component
node scripts/a11y-scan.mjs --url http://localhost:3000 --mode axe --selector ".modal"

# Auth-gated page (see a11y-web-scanning for capturing the state file)
node scripts/a11y-scan.mjs --url http://localhost:3000/dashboard --mode axe,tree,coverage --storage-state .auth/state.json
```
## Web components and shadow DOM

The scanner traverses shadow roots, so landmarks, headings, roles, tab stops and target sizes inside custom elements are found rather than missed. Focus stops report `inShadowDom`, and axe-core reports shadow nodes as a nested target path such as `[["p-link-pure", "a"]]`.

Traversal alone is not enough, though, and the reason is worth understanding before you interpret any component-library result. Two things about shadow DOM cannot be resolved from computed styles:

**Focus indicators are usually invisible to style inspection.** Component libraries paint rings with `::before`, `::after` or `::part()`, and `getComputedStyle(element)` returns none of those. A check that looks for `outline` or `box-shadow` therefore reports *every* component as having no focus ring. That produced 6 false failures in one real run and 0 true ones. The scanner no longer attempts a verdict; `2.4.7` is listed under `coverage.notChecked` for a human to confirm by pressing Tab.

**Slotted text can defeat contrast analysis entirely.** Given `<p-heading>Region</p-heading>`, the text node lives in the light DOM, so its computed colour is the host's — but it *renders* in whatever colour the shadow root's `<slot>` applies. In a controlled fixture this made axe-core itself report `#000000` on `#010205` for text that renders near-white. **This is not a bug this scanner can fix; it affects every computed-style engine.** So the scanner detects the pattern instead: when a component colours slotted text through its `<slot>`, the `coverage` scan names it, and contrast results for that text must be verified with a colour picker before being reported or dismissed.

If a result still looks implausible, re-scan with `--load-delay 3000` first — components that hydrate late are measured before they finish rendering. Only then consider a dismissal, with evidence.

> `$RUN` is the timestamped run directory the `a11y-audit` agent creates in Phase 0 (`.a11y/runs/<YYYY-MM-DD-HHMMSS>`); `$SCRATCH` is a `mktemp -d` directory for intermediates, which are never written into the project. Running standalone, substitute any directories.


| Option | Default | Purpose |
|--------|---------|---------|
| `--url` | required | Page to scan |
| `--mode` | `all` | `axe`, `keyboard`, `tree`, `viewport`, `coverage`, or a comma-separated subset |
| `--out` | stdout | Write full JSON here and print only the summary |
| `--tags` | WCAG 2.0–2.2 A/AA | axe tag list |
| `--selector` | whole page | Scope the axe scan to a subtree |
| `--storage-state` | none | Playwright storageState file for authenticated pages |
| `--color-scheme` | `light` | Playwright `colorScheme`: `light`, `dark`, or `no-preference` |
| `--viewports` | `320,768,1024,1440` | Widths for the reflow and target-size scan |
| `--max-tabs` | `100` | Tab presses during keyboard traversal |
| `--timeout` | `30000` | Navigation/readiness timeout |
| `--load-delay` | `2000` | Milliseconds to wait after `load` before measuring |
| `--ready-selector` | none | Element that must exist before measurement |
| `--stability-window` | `500` | Mutation-free DOM window before measurement |
| `--best-effort-readiness` | false | Continue after the 5s stability ceiling; recorded as `maximum-time-reached` |

Exit code `0` means the scan ran (violations may still exist); `1` means it could not run.

Every mode navigates independently and records whether the DOM became stable.
Without `--best-effort-readiness`, reaching the stability ceiling fails that
mode instead of silently measuring an arbitrary state.

## What each mode reports

| Mode | Key output fields | WCAG criteria |
|------|-------------------|---------------|
| `keyboard` | `tabStopCount`, `keyboardTraps`, `tabSequence` | 2.1.2, 2.4.3 |
| `coverage` | `notChecked[]` — criteria no automated pass here can settle, plus limits detected on this page | — |
| `viewport` | `reflowFailures`, per-width `undersizedTargets`, per-width axe counts | 1.4.10, 2.5.5, 2.5.8 |
| `tree` | `landmarks`, `headings`, `h1Count`, `skippedHeadingLevels`, `missingLandmarks`, `ariaSnapshot` | 1.3.1, 2.4.6, 4.1.2 |
| `axe` | `violations[]` with rule id, impact, helpUrl, nodes | Broad automated coverage |

`behavioralConfidence` is `High` when every requested scan completed, `Medium` at 60% or more, `Low` below that. Report it alongside findings so the reader knows how much of the behavioural surface was actually exercised.

Contrast appears only under `axe`. Before `analyze()`, the scanner sets a transparent `html`/`body` background to the CSS `Canvas` system colour so axe-core does not treat it as `#ffffff` under `color-scheme: dark` ([axe-core#3605](https://github.com/dequelabs/axe-core/issues/3605), [#4608](https://github.com/dequelabs/axe-core/issues/4608)). The inline patch is restored afterwards. Nested colour-scheme islands without an opaque background remain an axe limitation. Target size is reported after applying SC 2.5.8's inline and spacing exceptions, so a small inline link in a sentence is correctly not a finding; the remaining exceptions ("essential" and "equivalent control") need human judgement, which is why those findings carry `medium` confidence.

## Coverage and its limits

The `coverage` scan returns `notChecked[]`, each entry naming a criterion, why it cannot be automated, and how to verify it by hand. Two entries are always present — focus indicator visibility (2.4.7) and per-control keyboard operability (2.1.1) — and a third appears when slot-styled text is detected.

Carry this into the report verbatim; `normalize-findings.py` copies it to `coverage.not_checked` in `findings.json`, and the exporter renders it as **Not Verified by This Audit** in both the markdown summary and the HTML. Do not delete it because the score looks good. A high score with an unstated gap is the one output that actively misleads.

Two patterns are deliberately *not* findings, because both are correct practice: `tabindex="-1"` (roving tabindex in carousels and tablists, redundant links, programmatic focus targets), and small inline links inside a sentence (SC 2.5.8's inline exception).

## Dynamic states

The scanner tests the page as loaded. Content behind a click (menus, accordions, modals, tabs) needs an interaction first — use the patterns in [scan-patterns.md](references/scan-patterns.md) to open the state, then scan the revealed subtree.

## Graceful degradation

| Playwright | @axe-core/playwright | Available |
|------------|---------------------|-----------|
| Yes | Yes | All five scans |
| Yes | No | keyboard, tree, coverage, viewport geometry — but **no contrast or ARIA coverage**, since that is axe's |
| No | — | None — fall back to code review plus axe-core CLI from `a11y-web-scanning` |

When unavailable, say so plainly and give the install command. Never present a skipped behavioural scan as a pass, and never infer tab order or rendered contrast from source alone.

```text
Playwright is not installed, so behavioural testing (keyboard traversal, viewport
reflow, accessibility tree) did not run. Findings in this report come from code
review and axe-core CLI only.

Install: npm install -D playwright@1.63.0 @axe-core/playwright@4.10.2 axe-core@4.10.3 && npx playwright install chromium
```

## Reliability

This skill does not edit source files. It returns structured findings to the orchestrating audit. If the URL is unreachable, report `unreachable` with the URL and continue the audit rather than aborting it.

## Progressive disclosure

Read only what the current task needs. The scanner covers standard cases without any of these.

- [Scan patterns](references/scan-patterns.md) — custom AxeBuilder scopes, interaction-then-scan sequences, hand-written keyboard and focus tests; only when the shipped scanner does not fit
- [Fix verification](references/fix-verification.md) — Phase 12 post-fix verification workflow and verdicts
- [CI integration](references/ci-integration.md) — GitHub Actions workflow and Playwright config for committed regression tests
