#!/usr/bin/env python3
"""Export normalized accessibility findings to shareable formats.

Reads the findings.json produced by a11y-severity-scoring/scripts/normalize-findings.py
and emits CSV, SARIF, or a self-contained HTML report. Every format is a
deterministic transform of the same data, so exports never disagree with the
audit report or with each other.

Every format shares one base name so it is obvious they are the same report
rendered differently, and so they sort together next to the markdown report.

Usage:
    export-findings.py <findings.json> --format {csv,sarif,html,all} [options]

Options:
    --format {csv,sarif,html,all}  What to emit (default: all)
    --out-dir <dir>                Where to write (default: current directory)
    --basename <name>              Shared base name (default: ACCESSIBILITY-AUDIT)
    --title <text>                 Title for the HTML report
    --repo-root <path>             Strip this prefix from file paths in SARIF

Outputs, alongside ACCESSIBILITY-AUDIT.md:
    summary -> ACCESSIBILITY-AUDIT-summary.md      (numbers to paste into the report)
    html    -> ACCESSIBILITY-AUDIT.html            (single file, no assets)
    sarif   -> ACCESSIBILITY-AUDIT.sarif           (SARIF 2.1.0, code scanning)
    csv     -> ACCESSIBILITY-AUDIT-findings.csv
               ACCESSIBILITY-AUDIT-scorecard.csv
               ACCESSIBILITY-AUDIT-remediation.csv

All summary numbers are recomputed from the findings list rather than read from
the file, and a findings file whose declared counts disagree with its findings is
rejected outright. No export can silently disagree with the data behind it.

Exit codes: 0 written (including a clean zero-finding report), 2 bad or inconsistent input.
"""

import argparse
import csv
import html
import json
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone

SEVERITY_ORDER = ["critical", "serious", "moderate", "minor"]
SEVERITY_WEIGHT = {"critical": 10, "serious": 7, "moderate": 3, "minor": 1}

# SARIF has three levels; map our four severities onto them.
SARIF_LEVEL = {"critical": "error", "serious": "error",
               "moderate": "warning", "minor": "note"}

# Mirrors the auto-fixable table in a11y-issue-fixer. Drives effort and priority.
AUTO_FIXABLE = {
    "html-has-lang", "html-lang-valid", "meta-viewport", "tabindex",
    "label", "label-title-only", "form-field-multiple-labels",
    "autocomplete-valid", "th-has-data-cells", "scope-attr-valid",
    "button-name", "input-button-name", "focus-not-visible",
}

# Changing these implies coordinated edits across HTML, JS, and CSS.
HIGH_EFFORT = {
    "aria-roles", "aria-allowed-role", "aria-required-children",
    "aria-required-parent", "heading-order", "page-has-heading-one",
    "reflow", "interactive-not-focusable", "keyboard-trap",
}


def estimate_effort(rule_id):
    if rule_id in AUTO_FIXABLE:
        return "Low"
    if rule_id in HIGH_EFFORT:
        return "High"
    return "Medium"


def assign_priority(severity, pattern_type):
    if severity == "critical":
        return "Immediate"
    if severity == "serious":
        return "Immediate" if pattern_type in ("Systemic", "Template") else "Soon"
    if severity == "moderate":
        return "Soon" if pattern_type == "Systemic" else "When Possible"
    return "When Possible"


def classify_pattern(rule_id, pages_with_rule, total_pages):
    if total_pages <= 1:
        return "Page-specific"
    if pages_with_rule == total_pages:
        return "Systemic"
    if pages_with_rule > 1:
        return "Template"
    return "Page-specific"


def load(path):
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict) or "findings" not in data:
        raise ValueError("input is not a normalized findings file "
                         "(run normalize-findings.py first)")
    if not isinstance(data["findings"], list):
        raise ValueError("'findings' must be a list")
    return data


def recount(data):
    """Recompute every summary number from the findings themselves.

    Summaries are derived, never trusted. A hand-edited findings file whose
    declared counts disagree with its findings previously rendered a summary of
    all zeros above a table of 21 rows; now the disagreement is an error.
    """
    findings = data["findings"]
    unknown = sorted({f.get("severity") for f in findings} - set(SEVERITY_ORDER))
    if unknown:
        raise ValueError(f"findings contain unknown severities: {', '.join(map(str, unknown))}")

    computed = {s: sum(1 for f in findings if f.get("severity") == s) for s in SEVERITY_ORDER}
    overall = data.setdefault("overall", {})
    declared = overall.get("counts")

    if declared and {k: declared.get(k, 0) for k in SEVERITY_ORDER} != computed:
        raise ValueError(
            "findings file is internally inconsistent — "
            f"declared counts {({k: declared.get(k, 0) for k in SEVERITY_ORDER})} "
            f"do not match the {len(findings)} findings {computed}. "
            "Regenerate it with normalize-findings.py instead of editing it by hand.")

    overall["counts"] = computed
    overall["finding_count"] = len(findings)
    if "score" not in overall:
        raise ValueError("findings file has no overall score; regenerate it with "
                         "normalize-findings.py")

    for page in data.get("pages", []):
        url = page.get("url")
        page_counts = {s: sum(1 for f in findings
                              if f.get("severity") == s
                              and (f.get("location") or {}).get("url") == url)
                       for s in SEVERITY_ORDER}
        stated = page.get("counts")
        if stated and {k: stated.get(k, 0) for k in SEVERITY_ORDER} != page_counts:
            raise ValueError(
                f"page {url} declares counts {({k: stated.get(k, 0) for k in SEVERITY_ORDER})} "
                f"but its findings are {page_counts}. Regenerate with normalize-findings.py.")
        page["counts"] = page_counts
    return data


def enrich(data):
    """Attach pattern type, priority, effort, and ROI to every finding."""
    findings = data["findings"]
    total_pages = max(1, len(data.get("pages", [])))

    pages_per_rule = defaultdict(set)
    instances_per_rule = defaultdict(int)
    for finding in findings:
        rule = finding.get("rule_id")
        pages_per_rule[rule].add((finding.get("location") or {}).get("url"))
        instances_per_rule[rule] += 1

    for index, finding in enumerate(findings, start=1):
        rule = finding.get("rule_id")
        pattern = classify_pattern(rule, len(pages_per_rule[rule]), total_pages)
        finding["_id"] = f"WEB-{index:03d}"
        finding["_pattern"] = pattern
        finding["_priority"] = assign_priority(finding["severity"], pattern)
        finding["_effort"] = estimate_effort(rule)
        finding["_auto_fixable"] = "Yes" if rule in AUTO_FIXABLE else "No"
        finding["_instances"] = instances_per_rule[rule]
        finding["_roi"] = instances_per_rule[rule] * SEVERITY_WEIGHT.get(finding["severity"], 1)
    return data


def location_text(finding):
    """Most specific location available: source file, then selector, then page."""
    loc = finding.get("location") or {}
    if loc.get("file"):
        return f'{loc["file"]}:{loc["line"]}' if loc.get("line") else loc["file"]
    return loc.get("selector") or loc.get("url") or ""


def fix_text(finding):
    """Remediation text with a single 'Fix:' prefix.

    axe failure summaries already start with 'Fix any of the following',
    so prefixing unconditionally produces 'Fix: Fix any of...'.
    """
    remediation = (finding.get("remediation") or "").strip()
    if not remediation:
        return ""
    return remediation if remediation.lower().startswith("fix") else f"Fix: {remediation}"


# --- CSV -------------------------------------------------------------------

def write_csv(data, out_dir, basename):
    findings = data["findings"]
    written = []

    def open_csv(suffix, columns):
        path = os.path.join(out_dir, f"{basename}-{suffix}.csv")
        # utf-8-sig and CRLF keep Excel happy on Windows.
        handle = open(path, "w", newline="", encoding="utf-8-sig")
        writer = csv.DictWriter(handle, fieldnames=columns, quoting=csv.QUOTE_ALL,
                                lineterminator="\r\n")
        writer.writeheader()
        written.append(path)
        return handle, writer

    handle, writer = open_csv("findings", [
        "finding_id", "page_url", "severity", "confidence", "wcag_criteria",
        "wcag_level", "rule_id", "issue_summary", "element", "source_line",
        "pattern_type", "priority", "estimated_effort", "auto_fixable",
        "sources", "fix_suggestion", "help_url",
    ])
    for finding in findings:
        loc = finding.get("location") or {}
        writer.writerow({
            "finding_id": finding["_id"],
            "page_url": loc.get("url", ""),
            "severity": finding["severity"].capitalize(),
            "confidence": finding["confidence"].capitalize(),
            "wcag_criteria": finding.get("wcag") or "",
            "wcag_level": finding.get("wcag_level") or "",
            "rule_id": finding.get("rule_id") or "",
            "issue_summary": finding.get("description") or "",
            "element": loc.get("selector") or "",
            "source_line": f'{loc.get("file", "")}:{loc.get("line", "")}' if loc.get("file") else "",
            "pattern_type": finding["_pattern"],
            "priority": finding["_priority"],
            "estimated_effort": finding["_effort"],
            "auto_fixable": finding["_auto_fixable"],
            "sources": ", ".join(finding.get("corroborated_by") or finding.get("sources") or []),
            "fix_suggestion": finding.get("remediation") or "",
            "help_url": finding.get("help_url") or "",
        })
    handle.close()

    handle, writer = open_csv("scorecard", [
        "page_url", "score", "grade", "critical_count", "serious_count",
        "moderate_count", "minor_count", "total_issues", "audit_date",
    ])
    audit_date = datetime.now(timezone.utc).isoformat(timespec="seconds")
    for page in data.get("pages", []):
        counts = page["counts"]
        writer.writerow({
            "page_url": page["url"], "score": page["score"], "grade": page["grade"],
            "critical_count": counts["critical"], "serious_count": counts["serious"],
            "moderate_count": counts["moderate"], "minor_count": counts["minor"],
            "total_issues": sum(counts.values()), "audit_date": audit_date,
        })
    handle.close()

    handle, writer = open_csv("remediation", [
        "priority", "rule_id", "issue_summary", "affected_pages", "total_instances",
        "pattern_type", "wcag_criteria", "severity", "estimated_effort",
        "auto_fixable", "fix_guidance", "help_url", "roi_score",
    ])
    by_rule = {}
    for finding in findings:
        rule = finding.get("rule_id")
        entry = by_rule.setdefault(rule, {
            "finding": finding,
            "pages": set(),
        })
        entry["pages"].add((finding.get("location") or {}).get("url"))
    rows = []
    for rule, entry in by_rule.items():
        finding = entry["finding"]
        rows.append({
            "priority": finding["_priority"], "rule_id": rule or "",
            "issue_summary": finding.get("description") or "",
            "affected_pages": len(entry["pages"]),
            "total_instances": finding["_instances"],
            "pattern_type": finding["_pattern"],
            "wcag_criteria": finding.get("wcag") or "",
            "severity": finding["severity"].capitalize(),
            "estimated_effort": finding["_effort"],
            "auto_fixable": finding["_auto_fixable"],
            "fix_guidance": finding.get("remediation") or "",
            "help_url": finding.get("help_url") or "",
            "roi_score": finding["_roi"],
        })
    for row in sorted(rows, key=lambda r: -r["roi_score"]):
        writer.writerow(row)
    handle.close()

    return written


# --- SARIF -----------------------------------------------------------------

def write_sarif(data, out_dir, basename, repo_root):
    findings = data["findings"]
    rules, rule_index = [], {}

    for finding in findings:
        rule = finding.get("rule_id") or "accessibility-finding"
        if rule in rule_index:
            continue
        rule_index[rule] = len(rules)
        criterion = finding.get("wcag")
        tags = ["accessibility", f'severity/{finding["severity"]}']
        if criterion:
            tags.append(f"WCAG{criterion}")
        if finding.get("wcag_level"):
            tags.append(f'WCAG-Level-{finding["wcag_level"]}')
        rules.append({
            "id": rule,
            "name": rule.replace("-", " ").title().replace(" ", ""),
            "shortDescription": {"text": finding.get("description") or rule},
            "fullDescription": {"text": finding.get("impact") or finding.get("description") or rule},
            "helpUri": finding.get("help_url") or "https://www.w3.org/WAI/WCAG22/quickref/",
            "help": {"text": finding.get("remediation") or "See the linked guidance."},
            "defaultConfiguration": {"level": SARIF_LEVEL.get(finding["severity"], "warning")},
            "properties": {"tags": tags, "problem.severity": finding["severity"]},
        })

    results = []
    for finding in findings:
        rule = finding.get("rule_id") or "accessibility-finding"
        loc = finding.get("location") or {}

        file_path = loc.get("file")
        if file_path and repo_root:
            file_path = os.path.relpath(file_path, repo_root)
        # GitHub annotates a diff only when a real repo-relative file is known.
        # Runtime-only findings still upload; they appear without a line anchor.
        physical = {
            "artifactLocation": {"uri": file_path.replace(os.sep, "/")
                                 if file_path else (loc.get("url") or "unknown")},
        }
        if loc.get("line"):
            physical["region"] = {"startLine": int(loc["line"])}

        location = {"physicalLocation": physical}
        if loc.get("selector"):
            location["logicalLocations"] = [{"name": loc["selector"], "kind": "element"}]

        message = finding.get("description") or rule
        remediation = fix_text(finding)
        if remediation:
            message += f" {remediation}"
        if finding.get("wcag"):
            message += f' (WCAG {finding["wcag"]}'
            message += f' Level {finding["wcag_level"]})' if finding.get("wcag_level") else ")"

        results.append({
            "ruleId": rule,
            "ruleIndex": rule_index[rule],
            "level": SARIF_LEVEL.get(finding["severity"], "warning"),
            "message": {"text": message},
            "locations": [location],
            # Keeps GitHub from re-opening the same alert when line numbers shift.
            "partialFingerprints": {
                "a11yFindingV1": f'{rule}:{loc.get("url", "")}:{loc.get("selector", "")}'
            },
            "properties": {
                "severity": finding["severity"],
                "confidence": finding["confidence"],
                "sources": finding.get("corroborated_by") or finding.get("sources") or [],
                "priority": finding["_priority"],
                "effort": finding["_effort"],
            },
        })

    sarif = {
        "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {"driver": {
                "name": "a11y-audit",
                "informationUri": "https://github.com/porsche-design-system/skills",
                "version": data.get("scoring", {}).get("model", "a11y-severity-scoring-v2"),
                "rules": rules,
            }},
            "results": results,
        }],
    }

    path = os.path.join(out_dir, f"{basename}.sarif")
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(sarif, handle, indent=2)
    return [path]


# --- HTML ------------------------------------------------------------------

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<style>
  :root {{
    --bg: #ffffff; --fg: #1a1a1a; --muted: #595959; --line: #d4d4d4;
    --critical: #a4262c; --serious: #ba4a00; --moderate: #7d6608; --minor: #4a4a4a;
    --ok: #0f6132;
  }}
  @media (prefers-color-scheme: dark) {{
    :root {{
      --bg: #101216; --fg: #f2f2f2; --muted: #b8b8b8; --line: #3a3f47;
      --critical: #ff9a9e; --serious: #ffbe8a; --moderate: #ecd07a; --minor: #c9c9c9;
      --ok: #7ee2a8;
    }}
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; padding: 2rem 1.25rem; background: var(--bg); color: var(--fg);
    font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif;
  }}
  @media (max-width: 30rem) {{ body {{ padding: 1rem .75rem; }} }}
  header, main, footer {{ max-width: 68rem; margin-inline: auto; }}
  h1 {{ font-size: 1.9rem; margin: 0 0 .25rem; }}
  h2 {{ font-size: 1.3rem; margin: 2.5rem 0 .75rem; }}
  .meta {{ color: var(--muted); margin: 0 0 2rem; }}
  .cards {{ display: flex; flex-wrap: wrap; gap: .75rem; margin-bottom: 1rem; }}
  .card {{
    border: 1px solid var(--line); border-radius: .5rem; padding: .75rem 1rem;
    min-width: 8.5rem; flex: 1 1 8.5rem;
  }}
  .card .num {{ font-size: 1.8rem; font-weight: 700; display: block; }}
  .card .lbl {{ color: var(--muted); font-size: .85rem; }}
  /* Wide data tables scroll inside a focusable region so the page itself
     never needs horizontal scrolling at 320px (WCAG 1.4.10). */
  .table-wrap {{ overflow-x: auto; }}
  .table-wrap:focus-visible {{ outline: 3px solid currentColor; outline-offset: 2px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: .5rem; min-width: 40rem; }}
  caption {{ text-align: left; color: var(--muted); padding-bottom: .5rem; }}
  th, td {{
    text-align: left; padding: .55rem .6rem; border-bottom: 1px solid var(--line);
    vertical-align: top;
  }}
  /* Keep in-table links at the 24x24 minimum target size (WCAG 2.5.8). */
  td a {{ display: inline-block; min-width: 24px; min-height: 24px; padding: .1rem .25rem; }}
  th {{ font-size: .85rem; text-transform: uppercase; letter-spacing: .03em; }}
  tbody tr:hover {{ background: color-mix(in srgb, var(--fg) 6%, transparent); }}
  code {{
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .85em;
    background: color-mix(in srgb, var(--fg) 8%, transparent);
    padding: .1em .35em; border-radius: .25rem; word-break: break-all;
  }}
  /* Severity uses a text label and a shape, never colour alone. */
  .sev {{ font-weight: 700; white-space: nowrap; }}
  .sev::before {{ margin-right: .35rem; }}
  .sev-critical {{ color: var(--critical); }} .sev-critical::before {{ content: "\\25C6"; }}
  .sev-serious  {{ color: var(--serious); }}  .sev-serious::before  {{ content: "\\25B2"; }}
  .sev-moderate {{ color: var(--moderate); }} .sev-moderate::before {{ content: "\\25A0"; }}
  .sev-minor    {{ color: var(--minor); }}    .sev-minor::before    {{ content: "\\25CF"; }}
  .grade {{ font-size: 2rem; font-weight: 700; }}
  .controls {{ display: flex; flex-wrap: wrap; gap: 1rem; align-items: end; margin: 1rem 0; }}
  label {{ display: block; font-size: .85rem; color: var(--muted); margin-bottom: .2rem; }}
  select, input[type="search"] {{
    font: inherit; padding: .4rem .5rem; border: 1px solid var(--line);
    border-radius: .3rem; background: var(--bg); color: var(--fg); min-height: 2.5rem;
  }}
  :focus-visible {{ outline: 3px solid currentColor; outline-offset: 2px; }}
  .sr-only {{
    position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
    overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0;
  }}
  footer {{ margin-top: 3rem; color: var(--muted); font-size: .85rem; }}
  a {{ color: inherit; }}
</style>
</head>
<body>
<header>
  <h1>{title}</h1>
  <p class="meta">Generated {generated} &middot; {page_count} page(s) audited &middot;
     scoring profile <code>{profile}</code></p>
</header>
<main>
  <h2>Summary</h2>
  <div class="cards">
    <div class="card"><span class="num grade">{grade}</span><span class="lbl">Overall grade ({score}/100)</span></div>
    <div class="card"><span class="num">{critical}</span><span class="lbl">Critical</span></div>
    <div class="card"><span class="num">{serious}</span><span class="lbl">Serious</span></div>
    <div class="card"><span class="num">{moderate}</span><span class="lbl">Moderate</span></div>
    <div class="card"><span class="num">{minor}</span><span class="lbl">Minor</span></div>
  </div>

  <h2>Scorecard</h2>
  <div class="table-wrap" role="region" aria-label="Scorecard table, scrollable" tabindex="0">
    <table>
      <caption>Score per audited page, lowest first.</caption>
      <thead><tr>
        <th scope="col">Page</th><th scope="col">Score</th><th scope="col">Grade</th>
        <th scope="col">Critical</th><th scope="col">Serious</th>
        <th scope="col">Moderate</th><th scope="col">Minor</th>
      </tr></thead>
      <tbody>{scorecard_rows}</tbody>
    </table>
  </div>

  <h2 id="findings-heading">Findings</h2>
  <div class="controls">
    <div>
      <label for="filter-severity">Filter by severity</label>
      <select id="filter-severity">
        <option value="">All severities</option>
        <option value="critical">Critical</option>
        <option value="serious">Serious</option>
        <option value="moderate">Moderate</option>
        <option value="minor">Minor</option>
      </select>
    </div>
    <div>
      <label for="filter-text">Search findings</label>
      <input type="search" id="filter-text" placeholder="rule, page, or text">
    </div>
  </div>
  <p id="result-count" role="status">{finding_count} findings shown.</p>
  <div class="table-wrap" role="region" aria-label="Findings table, scrollable" tabindex="0">
    <table id="findings">
      <caption>All findings, most severe first.</caption>
      <thead><tr>
        <th scope="col">ID</th><th scope="col">Severity</th><th scope="col">Issue</th>
        <th scope="col">Location</th><th scope="col">WCAG</th>
        <th scope="col">Priority</th><th scope="col">Effort</th><th scope="col">Sources</th>
      </tr></thead>
      <tbody>{finding_rows}</tbody>
    </table>
  </div>

  {dismissed_section}
  {coverage_section}
</main>
<footer>
  <p>Produced by the <code>a11y-audit</code> agent. Automated testing detects a
  subset of accessibility barriers; manual keyboard and screen reader testing is
  still required for a conformance claim.</p>
</footer>
<script>
(function () {{
  var severity = document.getElementById('filter-severity');
  var text = document.getElementById('filter-text');
  var count = document.getElementById('result-count');
  var rows = Array.prototype.slice.call(
    document.querySelectorAll('#findings tbody tr'));

  function apply() {{
    var sev = severity.value;
    var query = text.value.toLowerCase();
    var shown = 0;
    rows.forEach(function (row) {{
      var matchSev = !sev || row.dataset.severity === sev;
      var matchText = !query || row.textContent.toLowerCase().indexOf(query) !== -1;
      var visible = matchSev && matchText;
      row.hidden = !visible;
      if (visible) shown++;
    }});
    count.textContent = shown + ' of ' + rows.length + ' findings shown.';
  }}

  severity.addEventListener('change', apply);
  text.addEventListener('input', apply);
}})();
</script>
</body>
</html>
"""


def write_html(data, out_dir, basename, title):
    def esc(value):
        return html.escape(str(value if value is not None else ""))

    scorecard_rows = "".join(
        f'<tr><th scope="row">{esc(p["url"])}</th><td>{p["score"]}</td>'
        f'<td>{esc(p["grade"])}</td><td>{p["counts"]["critical"]}</td>'
        f'<td>{p["counts"]["serious"]}</td><td>{p["counts"]["moderate"]}</td>'
        f'<td>{p["counts"]["minor"]}</td></tr>'
        for p in data.get("pages", [])
    )

    finding_rows = []
    for finding in data["findings"]:
        where = location_text(finding)
        wcag = finding.get("wcag") or ""
        if wcag and finding.get("help_url"):
            # Many rows link to the same criterion, so the visible "1.4.3" needs a
            # distinguishing accessible name for anyone listing links out of context.
            label = f'WCAG {wcag} guidance for {finding.get("rule_id") or "this finding"}'
            wcag_cell = (f'<a href="{esc(finding["help_url"])}" '
                         f'aria-label="{esc(label)}">{esc(wcag)}</a>')
        else:
            wcag_cell = esc(wcag)
        description = esc(finding.get("description"))
        remediation = fix_text(finding)
        if remediation:
            description += f'<br><span class="lbl">{esc(remediation)}</span>'
        severity = finding["severity"]
        finding_rows.append(
            f'<tr data-severity="{esc(severity)}">'
            f'<th scope="row">{esc(finding["_id"])}</th>'
            f'<td><span class="sev sev-{esc(severity)}">{esc(severity.capitalize())}</span></td>'
            f'<td>{description}</td>'
            f'<td><code>{esc(where)}</code></td>'
            f'<td>{wcag_cell}</td>'
            f'<td>{esc(finding["_priority"])}</td>'
            f'<td>{esc(finding["_effort"])}</td>'
            f'<td>{esc(", ".join(finding.get("corroborated_by") or finding.get("sources") or []))}</td>'
            f'</tr>'
        )

    # Dismissals stay visible. An audit that silently drops scanner findings is
    # indistinguishable from one that missed them.
    dismissed = data.get("dismissed") or []
    if dismissed:
        rows = "".join(
            f'<tr><th scope="row"><code>{esc(f.get("rule_id"))}</code></th>'
            f'<td><code>{esc(location_text(f))}</code></td>'
            f'<td>{esc(f.get("dismissal_reason"))}</td></tr>'
            for f in dismissed
        )
        dismissed_section = (
            '<h2>Dismissed Findings</h2>'
            f'<p>{len(dismissed)} scanner finding(s) were verified as false positives '
            'and excluded from the score. Each reason is recorded below.</p>'
            '<div class="table-wrap" role="region" aria-label="Dismissed findings table, scrollable" tabindex="0">'
            '<table><caption>Findings excluded from the score, with the reason.</caption>'
            '<thead><tr><th scope="col">Rule</th><th scope="col">Location</th>'
            '<th scope="col">Reason</th></tr></thead>'
            f'<tbody>{rows}</tbody></table></div>'
        )
    else:
        dismissed_section = ""

    # Stated in the export itself, so the score is never read as a conformance
    # claim once the file is shared outside the run folder.
    not_checked = (data.get("coverage") or {}).get("not_checked") or []
    if not_checked:
        rows = "".join(
            f'<tr><th scope="row">{esc(gap.get("criterion"))}</th>'
            f'<td>{esc(gap.get("reason"))}</td>'
            f'<td>{esc(gap.get("verifyBy"))}</td></tr>'
            for gap in not_checked
        )
        coverage_section = (
            '<h2>Not Verified by This Audit</h2>'
            f'<p>{len(not_checked)} criterion/criteria could not be judged automatically. '
            'A clean result above does not cover them; confirm each one manually '
            'before making a conformance claim.</p>'
            '<div class="table-wrap" role="region" aria-label="Unverified criteria table, scrollable" tabindex="0">'
            '<table><caption>Criteria outside this audit\'s automated coverage.</caption>'
            '<thead><tr><th scope="col">Criterion</th><th scope="col">Why not automated</th>'
            '<th scope="col">How to verify</th></tr></thead>'
            f'<tbody>{rows}</tbody></table></div>'
        )
    else:
        coverage_section = ""

    overall = data.get("overall", {})
    counts = overall.get("counts", {})
    rendered = HTML_TEMPLATE.format(
        dismissed_section=dismissed_section,
        coverage_section=coverage_section,
        title=esc(title),
        generated=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        page_count=len(data.get("pages", [])),
        profile=esc(data.get("scoring", {}).get("profile", "balanced")),
        grade=esc(overall.get("grade", "?")),
        score=overall.get("score", 0),
        critical=counts.get("critical", 0), serious=counts.get("serious", 0),
        moderate=counts.get("moderate", 0), minor=counts.get("minor", 0),
        scorecard_rows=scorecard_rows,
        finding_count=len(data["findings"]),
        finding_rows="".join(finding_rows),
    )

    path = os.path.join(out_dir, f"{basename}.html")
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(rendered)
    return [path]


def write_summary(data, out_dir, basename):
    """Emit the report's numeric blocks as markdown, ready to paste verbatim.

    The model writes prose; every number comes from here. That is what keeps the
    markdown report, the HTML export, and findings.json telling the same story.
    """
    overall = data["overall"]
    counts = overall["counts"]
    findings = data["findings"]
    dismissed = data.get("dismissed") or []

    not_checked = (data.get("coverage") or {}).get("not_checked") or []

    lines = [
        "<!-- Generated by export-findings.py. Do not edit these numbers by hand. -->",
        "",
        f'- **Score / grade:** {overall["score"]} / 100 — **{overall["grade"]}** '
        f'(reflects what was measured; see Not Verified)',
        f'- **Total active issues:** {len(findings)} — '
        f'**Critical:** {counts["critical"]} | **Serious:** {counts["serious"]} | '
        f'**Moderate:** {counts["moderate"]} | **Minor:** {counts["minor"]}',
    ]
    if dismissed:
        lines.append(f'- **Dismissed as false positives:** {len(dismissed)} '
                     f'(listed under Dismissed Findings, with reasons)')
    lines += ["", "### Fix these three first", "",
              "| # | Issue | Instances | Pages | Severity | Effort | ROI |",
              "|---|-------|-----------|-------|----------|--------|-----|"]

    by_rule = {}
    for finding in findings:
        rule = finding.get("rule_id")
        entry = by_rule.setdefault(rule, {"finding": finding, "pages": set()})
        entry["pages"].add((finding.get("location") or {}).get("url"))
    ranked = sorted(by_rule.items(), key=lambda kv: -kv[1]["finding"]["_roi"])[:3]
    for index, (rule, entry) in enumerate(ranked, start=1):
        finding = entry["finding"]
        lines.append(f'| {index} | {finding.get("description") or rule} | '
                     f'{finding["_instances"]} | {len(entry["pages"])} | '
                     f'{finding["severity"].capitalize()} | {finding["_effort"]} | '
                     f'{finding["_roi"]} |')
    if not ranked:
        lines.append("| — | No active findings | 0 | 0 | — | — | 0 |")

    lines += ["", "### Accessibility Scorecard", "",
              "| Page | Score | Grade | Critical | Serious | Moderate | Minor |",
              "|------|-------|-------|----------|---------|----------|-------|"]
    for page in data.get("pages", []):
        page_counts = page["counts"]
        lines.append(f'| {page["url"]} | {page["score"]} | {page["grade"]} | '
                     f'{page_counts["critical"]} | {page_counts["serious"]} | '
                     f'{page_counts["moderate"]} | {page_counts["minor"]} |')

    scoring = data.get("scoring") or {}
    executed = scoring.get("executedSourcesByPage") or {}
    checks = scoring.get("executedChecksByPage") or {}
    reviewed = scoring.get("reviewedPhasesByPage") or {}
    metadata = scoring.get("scannerMetadata") or []
    lines += [
        "",
        "### Reproducibility",
        "",
        f'- **Scoring model:** `{scoring.get("model") or "unknown"}`',
        f'- **Profile:** `{scoring.get("profile") or "unknown"}`',
        f'- **Rule catalog:** `{scoring.get("catalogVersion") or "unknown"}`',
        "",
        "| Page | Executed checks | Reviewed phases | Modes | Axe | Playwright | Browser | Readiness |",
        "|------|-----------------|-----------------|-------|-----|------------|---------|-----------|",
    ]
    metadata_by_url = defaultdict(list)
    for entry in metadata:
        metadata_by_url[entry.get("url")].append(entry)
    for page in data.get("pages", []):
        url = page.get("url")
        entries = metadata_by_url.get(url) or [{}]
        modes = sorted({mode for entry in entries for mode in (entry.get("modes") or [])})
        axe_versions = sorted({entry.get("axeCoreVersion") for entry in entries
                               if entry.get("axeCoreVersion")})
        playwright_versions = sorted({entry.get("playwrightVersion") for entry in entries
                                      if entry.get("playwrightVersion")})
        browser_versions = sorted({entry.get("browserVersion") for entry in entries
                                   if entry.get("browserVersion")})
        readiness_values = []
        for entry in entries:
            readiness = entry.get("readiness") or {}
            readiness_states = sorted({
                state
                for states in (readiness.get("results") or {}).values()
                for state in states
            })
            readiness_values.append(
                f'delay={entry.get("loadDelay", "n/a")}ms, '
                f'stable={readiness.get("stabilityWindow", "n/a")}ms, '
                f'selector={readiness.get("readySelector") or "none"}, '
                f'result={",".join(readiness_states) or "n/a"}'
            )
        values = [
            url or "",
            ", ".join(checks.get(url) or executed.get(url) or []) or "none",
            ", ".join(reviewed.get(url) or []) or "none",
            ", ".join(modes) or "none",
            ", ".join(axe_versions) or "n/a",
            ", ".join(playwright_versions) or "n/a",
            ", ".join(browser_versions) or "n/a",
            "; ".join(sorted(set(readiness_values))) or "n/a",
        ]
        values = [str(value).replace("|", "\\|").replace("\n", " ") for value in values]
        lines.append("| " + " | ".join(values) + " |")

    if dismissed:
        lines += ["", "### Dismissed Findings", "",
                  "| Rule | Location | Reason |", "|------|----------|--------|"]
        for finding in dismissed:
            lines.append(f'| `{finding.get("rule_id")}` | `{location_text(finding)}` | '
                         f'{finding.get("dismissal_reason", "")} |')

    if not_checked:
        lines += ["", "### Not Verified by This Audit", "",
                  "A clean result above does **not** cover the following. "
                  "Confirm each one manually before claiming conformance.", "",
                  "| Criterion | Why not automated | How to verify |",
                  "|-----------|-------------------|---------------|"]
        for gap in not_checked:
            lines.append(f'| {gap.get("criterion")} | {gap.get("reason")} | '
                         f'{gap.get("verifyBy", "")} |')

    delta = data.get("remediation_delta")
    if delta:
        lines += ["", "### Change Since Last Audit", "",
                  f'**Fixed:** {delta.get("fixed", 0)} · '
                  f'**Persistent:** {delta.get("persistent", 0)} · '
                  f'**New:** {delta.get("new", 0)}']

    path = os.path.join(out_dir, f"{basename}-summary.md")
    with open(path, "w", encoding="utf-8") as handle:
        handle.write("\n".join(lines) + "\n")
    return [path]


def main():
    parser = argparse.ArgumentParser(description="Export normalized accessibility findings.")
    parser.add_argument("findings")
    parser.add_argument("--format",
                        choices=["csv", "sarif", "html", "summary", "all"], default="all")
    parser.add_argument("--out-dir", default=".")
    parser.add_argument("--basename", default="ACCESSIBILITY-AUDIT")
    parser.add_argument("--title", default="Accessibility Audit Report")
    parser.add_argument("--repo-root")
    args = parser.parse_args()

    try:
        data = enrich(recount(load(args.findings)))
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"Error reading {args.findings}: {error}", file=sys.stderr)
        return 2

    os.makedirs(args.out_dir, exist_ok=True)
    basename = args.basename.rstrip("-_. ") or "ACCESSIBILITY-AUDIT"

    written = []
    if args.format in ("csv", "all"):
        written += write_csv(data, args.out_dir, basename)
    if args.format in ("sarif", "all"):
        written += write_sarif(data, args.out_dir, basename, args.repo_root)
    if args.format in ("html", "all"):
        written += write_html(data, args.out_dir, basename, args.title)
    if args.format in ("summary", "all"):
        written += write_summary(data, args.out_dir, basename)

    for path in written:
        print(path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
