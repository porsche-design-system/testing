---
name: a11y-export
description: "Export accessibility audit findings to CSV, SARIF, and self-contained HTML for spreadsheets, CI code scanning, and stakeholder sharing."
user-invocable: false
---

# A11y Export

## Audit phase role

The `a11y-audit` agent owns phase numbering. Summary export runs in **Phase 11**. CSV, SARIF, and HTML exports run in **Phase 12** only when the user requests them. Run the script, return the artifact paths, and stop.

Procedure module for `a11y-audit`. Turns the audit's canonical `findings.json` into whichever format the audience needs.

**Run `scripts/export-findings.py`. Do not hand-write CSV, SARIF, or HTML.** Every format is a deterministic transform of the same data, so a script cannot introduce the transcription errors and drift that hand-authored exports do.

## Prerequisite

Exports read the normalized findings file produced by `a11y-severity-scoring`:

```bash
python3 <a11y-severity-scoring>/scripts/normalize-findings.py \
  $SCRATCH/scan-axe-page-1.json $SCRATCH/scan-playwright-page-1.json --out $RUN/findings.json
```

If `findings.json` does not exist yet, produce it first. Never export from the markdown report — it is a rendering of the findings, not the source of truth.

## Running the exporter

```bash
# Always, in Phase 11: the report's numbers, to paste verbatim
python3 scripts/export-findings.py $RUN/findings.json --format summary --out-dir $SCRATCH

# Then only what the user asked for — do not emit formats nobody requested
python3 scripts/export-findings.py $RUN/findings.json --format html --out-dir $RUN --title "Home Page Audit"
python3 scripts/export-findings.py $RUN/findings.json --format sarif --out-dir $RUN --repo-root .
python3 scripts/export-findings.py $RUN/findings.json --format csv --out-dir $RUN
```

### `--format summary` is not optional

It emits the score, counts, top-three-by-ROI, scorecard, dismissal table, and baseline delta as markdown. Paste it into the report unchanged. The agent writes prose; the script owns every number. This is the only thing that keeps the markdown report, the HTML export, and `findings.json` from disagreeing — and they have disagreed, badly, when numbers were retyped.

### The exporter validates its input

Summary figures are recomputed from the findings list, never read from the file. If a findings file's declared counts contradict its own findings, the export fails with exit code 2 and names the discrepancy rather than rendering it. A summary reading "0 Critical, 0 Serious" above a table of 21 findings is not a possible output any more. When you see that error, the file was hand-edited: re-run `normalize-findings.py`.

| Option | Purpose |
|--------|---------|
| `--format` | `summary`, `csv`, `sarif`, `html`, or `all` (default) |
| `--out-dir` | Destination directory — use `$RUN`, the current run directory |
| `--basename` | Shared base name, default `ACCESSIBILITY-AUDIT` |
| `--title` | Heading for the HTML report |
| `--repo-root` | Makes SARIF file paths repo-relative so GitHub can annotate diffs |

**Export only the formats the user asked for.** `--format all` writes five files; running it by default is how a run directory turns into clutter. Ask which audience the export is for, then emit that one.

## Choosing a format

Every format shares the report's base name, so it is obvious they are one report rendered for different audiences:

| File | Give it to | Why |
|------|-----------|-----|
| `ACCESSIBILITY-AUDIT.md` | Developers, code review | Written in Phase 11; diffable and renders in GitHub |
| `ACCESSIBILITY-AUDIT.sarif` | CI / GitHub Security tab | Findings appear as annotations on the pull request diff, where developers already are |
| `ACCESSIBILITY-AUDIT.html` | Designers, PMs, external stakeholders | Single file, no assets, opens anywhere, filterable |
| `ACCESSIBILITY-AUDIT-findings.csv` | Jira, Azure DevOps, spreadsheets | One row per instance, ready to import as tickets |
| `ACCESSIBILITY-AUDIT-scorecard.csv` | Reporting, trend tracking | One row per page with score, grade, and counts |
| `ACCESSIBILITY-AUDIT-remediation.csv` | Planning a fix sprint | One row per rule, sorted by ROI, with effort and priority |

Offer SARIF whenever the project has CI. Offer HTML whenever the audience is not a developer.

## Derived fields

The exporter computes four fields the raw findings do not carry:

- **Pattern type** — `Systemic` (every page), `Template` (several pages), or `Page-specific`. Systemic issues are the cheapest to fix per unit of benefit.
- **Priority** — `Immediate`, `Soon`, or `When Possible`, from severity crossed with pattern type.
- **Effort** — `Low` for auto-fixable rules, `High` for ARIA role and structural changes that ripple through JS and CSS, `Medium` otherwise.
- **ROI score** — instances × severity weight (Critical 10, Serious 7, Moderate 3, Minor 1). `REMEDIATION.csv` is sorted by it, so the top row is the best next thing to fix.

Effort is a heuristic from the rule id, not an estimate of the specific codebase. Present it as a starting point for planning, and correct it when you have seen the actual code.

## SARIF in CI

```yaml
- name: Upload accessibility findings
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: accessibility.sarif
    category: accessibility
```

Severity maps to SARIF levels as critical and serious → `error`, moderate → `warning`, minor → `note`. Findings carry a stable `partialFingerprints` value so GitHub tracks one alert across runs instead of re-opening it whenever line numbers shift.

**Limitation worth stating in the report:** GitHub can only anchor an annotation to a diff line when the finding has a source file and line. Runtime findings from a URL scan upload and appear in the Security tab, but without a line anchor. Code-review findings annotate properly. Pass `--repo-root` so paths resolve relative to the repository.

## Conventions

- Write exports into `$RUN`, the run directory for this audit — not the project root, and not a nested `exports/` folder.
- CSV is UTF-8 with BOM and CRLF line endings so Excel opens it correctly on Windows; every field is quoted.
- The HTML report is itself accessible — landmarks, table headers with `scope`, visible focus, non-colour severity indicators, and a `role="status"` filter count. If you edit the template, re-run `a11y-playwright` against the output and keep it at zero findings.
- Help URLs come from `a11y-severity-scoring` → [help-urls.md](../../../apm_modules/porsche-design-system/skills/packages/web-accessibility-audit/.apm/skills/a11y-severity-scoring/references/help-urls.md). Do not maintain a second URL table here.

## Reliability

This skill does not edit source files and does not re-score. It reads `findings.json` and writes export files.

Return to `a11y-audit`:

- `files_written` — list of paths created
- `findings_exported` — count written
- `formats` — which formats were produced
- `status` — `success` | `partial` (with reason) | `failed` (with error)

Announce start as "Exporting [N] findings to [formats]" and completion with the written paths.
