#!/usr/bin/env python3
"""Normalize scanner output into audit findings and score them.

Turns raw scanner JSON into the shape defined in references/finding-schema.md,
merges findings that several sources agree on, and applies the scoring formula
from SKILL.md. Running this instead of doing the arithmetic by hand keeps scores
reproducible across audits.

Usage:
    normalize-findings.py <file> [<file> ...] [options]

Accepted inputs (auto-detected):
    - axe-core CLI  (`npx @axe-core/cli --save out.json`)
    - @axe-core/playwright results
    - a11y-scan.mjs output from the a11y-playwright skill
    - a11y-finding-batch objects produced by code review or other scanners
    - a previously normalized findings file (for --baseline)

Options:
    --profile {balanced,strict,advisory}   Scoring profile (default balanced)
    --baseline <file>   Previous normalized output; adds remediation delta
    --out <file>        Write normalized JSON here
    --format {json,markdown}  Output format (default json)

Exit codes: 0 scored, 1 no findings could be parsed, 2 bad input.
"""

import argparse
import json
import os
import re
import sys
from collections import defaultdict

# --- Scoring model: the executable form of the table in SKILL.md ------------
# Keep these values in sync with "Severity Scoring Formula" in SKILL.md.

BASE_DEDUCTIONS = {
    ("critical", "confirmed"): 18,
    ("critical", "high", 2): 15,
    ("critical", "high", 1): 10,
    ("critical", "medium"): 7,
    ("critical", "low"): 3,
    ("serious", "high"): 7,
    ("serious", "medium"): 5,
    ("serious", "low"): 2,
    ("moderate", "high"): 3,
    ("moderate", "medium"): 2,
    ("moderate", "low"): 1,
    ("minor", None): 1,
}

CONFIRMED_MULTIPLIER = 1.2

PROFILE_MULTIPLIERS = {"balanced": 1.0, "strict": 1.15, "advisory": 0.8}

CALIBRATION = {
    "keyboard": 1.1,
    "forms": 1.05,
    "semantics": 1.0,
    "links": 0.9,
    "content": 0.85,
}

GRADE_BANDS = [(90, "A"), (75, "B"), (50, "C"), (25, "D"), (0, "F")]

# Maps axe rule id prefixes to the calibration families above.
RULE_FAMILIES = {
    "keyboard": ("focus", "tabindex", "keyboard", "skip-link", "accesskeys", "bypass"),
    "forms": ("label", "form", "autocomplete", "input", "select", "required-attr"),
    "links": ("link", "anchor"),
    "content": ("image-alt", "alt-text", "area-alt", "object-alt", "input-image-alt",
                "role-img-alt", "svg-img-alt"),
}


def rule_family(rule_id):
    lowered = (rule_id or "").lower()
    for family, prefixes in RULE_FAMILIES.items():
        if any(token in lowered for token in prefixes):
            return family
    return "semantics"


def wcag_from_tags(tags):
    """Extract criterion numbers from axe tags such as 'wcag143' -> '1.4.3'."""
    criteria = []
    for tag in tags or []:
        match = re.fullmatch(r"wcag(\d)(\d)(\d+)", tag)
        if match:
            criteria.append(".".join(match.groups()))
    return sorted(set(criteria))


def level_from_tags(tags):
    tags = set(tags or [])
    if any(t.endswith("aaa") for t in tags):
        return "AAA"
    if any(t.endswith("aa") for t in tags):
        return "AA"
    if any(re.fullmatch(r"wcag\d+a", t) for t in tags):
        return "A"
    return None


def make_finding(**kwargs):
    finding = {
        "rule_id": None, "severity": "moderate", "confidence": "medium",
        "location": None, "description": None, "impact": None,
        "remediation": None, "wcag": None, "wcag_level": None,
        "sources": [], "help_url": None, "phase": None,
    }
    finding.update(kwargs)
    return finding


# --- Parsers ---------------------------------------------------------------

def parse_axe_violations(violations, url, source, phase):
    findings = []
    for violation in violations or []:
        tags = violation.get("tags", [])
        criteria = wcag_from_tags(tags)
        for node in violation.get("nodes", [{}]):
            target = node.get("target") or []
            selector = target[0] if target else None
            if isinstance(selector, list):  # shadow DOM targets nest
                selector = " >> ".join(selector)
            findings.append(make_finding(
                rule_id=violation.get("id"),
                severity=violation.get("impact") or "moderate",
                confidence="high",
                location={"url": url, "selector": selector, "html": node.get("html")},
                description=violation.get("help") or violation.get("description"),
                impact=violation.get("description"),
                remediation=(node.get("failureSummary") or "").replace("\n", " ").strip() or None,
                wcag=criteria[0] if criteria else None,
                wcag_level=level_from_tags(tags),
                sources=[source],
                help_url=violation.get("helpUrl"),
                phase=phase,
            ))
    return findings


def parse_behavioural(scans, url):
    """Convert a11y-scan.mjs behavioural results into findings.

    Only measurements become findings. Colour contrast is axe-core's job and is
    never re-derived here, and focus-indicator visibility is not inferred from
    computed styles — both produced false positives on shadow-DOM components.
    What the scanner could not judge is carried in `notChecked` instead.
    """
    findings = []

    keyboard = scans.get("keyboard", {})
    if keyboard.get("status") == "ok":
        for trap in keyboard.get("keyboardTraps", []):
            findings.append(make_finding(
                rule_id="keyboard-trap", severity="critical", confidence="high",
                location={"url": url, "selector": trap.get("element")},
                description="Focus is trapped: repeated Tab presses do not move focus onward.",
                impact="Keyboard and screen reader users cannot leave this element.",
                remediation="Ensure Tab moves focus out, or provide a documented Escape route.",
                wcag="2.1.2", wcag_level="A", sources=["playwright"],
                help_url="https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html",
                phase="10",
            ))
    viewport = scans.get("viewport", {})
    if viewport.get("status") == "ok":
        # One finding for the page, not one per viewport — it is a single layout defect.
        widths = viewport.get("reflowFailures", [])
        if widths:
            listed = ", ".join(f"{w}px" for w in widths)
            findings.append(make_finding(
                rule_id="reflow", severity="serious", confidence="high",
                location={"url": url, "selector": "document"},
                description=f"Horizontal scrolling required at {listed}.",
                impact="Users who zoom or use small screens must scroll in two dimensions.",
                remediation="Use responsive layout so content reflows to a single column.",
                wcag="1.4.10", wcag_level="AA", sources=["playwright"],
                help_url="https://www.w3.org/WAI/WCAG22/Understanding/reflow.html",
                phase="10",
            ))
        seen_targets = set()
        for entry in viewport.get("viewports", []):
            for target in entry.get("undersizedTargets", []):
                key = f'{target.get("tag")}#{target.get("id") or ""}{target.get("name")}'
                if key in seen_targets:
                    continue
                seen_targets.add(key)
                # Medium: the scanner applies the inline and spacing exceptions,
                # but "essential" and "equivalent control" need human judgement.
                findings.append(make_finding(
                    rule_id="target-size", severity="moderate", confidence="medium",
                    location={"url": url, "selector": key},
                    description=(f'Target "{target.get("name")}" is '
                                 f'{target.get("width")}x{target.get("height")}px, below 24x24, '
                                 "and is neither inline nor spaced clear of other targets."),
                    impact="Users with motor impairments may miss or mis-tap this control.",
                    remediation="Increase the target to at least 24x24 CSS pixels, or add spacing.",
                    wcag="2.5.8", wcag_level="AA", sources=["playwright"],
                    help_url="https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html",
                    phase="10",
                ))

    tree = scans.get("tree", {})
    if tree.get("status") == "ok":
        if tree.get("h1Count", 1) == 0:
            findings.append(make_finding(
                rule_id="page-has-heading-one", severity="moderate", confidence="high",
                location={"url": url, "selector": "document"},
                description="Page has no H1 heading.",
                impact="Screen reader users lose the primary landmark for page topic.",
                remediation="Add exactly one H1 describing the page.",
                wcag="1.3.1", wcag_level="A", sources=["playwright"],
                help_url="https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html",
                phase="10",
            ))
        for skip in tree.get("skippedHeadingLevels", []):
            findings.append(make_finding(
                rule_id="heading-order", severity="moderate", confidence="high",
                location={"url": url, "selector": f'heading "{skip["to"]["name"]}"'},
                description=(f'Heading level jumps from H{skip["from"]["level"]} '
                             f'to H{skip["to"]["level"]}.'),
                impact="Screen reader users navigating by heading perceive a gap in structure.",
                remediation="Use sequential heading levels; style visually rather than skipping.",
                wcag="1.3.1", wcag_level="A", sources=["playwright"],
                help_url="https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html",
                phase="10",
            ))
        for role in tree.get("missingLandmarks", []):
            findings.append(make_finding(
                rule_id="landmark-missing", severity="minor", confidence="medium",
                location={"url": url, "selector": "document"},
                description=f'No "{role}" landmark on the page.',
                impact="Screen reader users lose a navigation shortcut to this region.",
                remediation=f'Add the appropriate element or role="{role}".',
                wcag="1.3.1", wcag_level="A", sources=["playwright"],
                help_url="https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html",
                phase="10",
            ))
    return findings


def parse_file(path, not_checked=None):
    """Detect the input shape and return [(url, findings)].

    `not_checked` collects the criteria a scanner declined to judge, so the
    report can state its coverage gaps rather than implying full coverage.
    """
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)

    def record_gaps(entries):
        if not_checked is None:
            return
        for entry in entries or []:
            if entry not in not_checked:
                not_checked.append(entry)

    # Previously normalized output
    if isinstance(data, dict) and "findings" in data and "pages" in data:
        record_gaps(data.get("coverage", {}).get("not_checked"))
        return [(p["url"], [f for f in data["findings"] if f.get("location", {}).get("url") == p["url"]])
                for p in data["pages"]]

    # Shared finding batch from agent review or a scanner without a native parser.
    if isinstance(data, dict) and data.get("type") == "a11y-finding-batch":
        url = data.get("url", path)
        source = data.get("source")
        findings = []
        for index, raw in enumerate(data.get("findings", [])):
            if not isinstance(raw, dict) or not raw.get("rule_id"):
                raise ValueError(f"finding batch entry {index}: 'rule_id' is required")
            finding = make_finding()
            finding.update(raw)
            location = finding.get("location")
            if isinstance(location, str):
                location = {"selector": location}
            elif not isinstance(location, dict):
                location = {}
            finding["location"] = dict(location, url=location.get("url") or url)
            item_source = finding.pop("source", None) or source
            sources = finding.get("sources")
            if not sources:
                sources = item_source if isinstance(item_source, list) else ([item_source] if item_source else [])
            if isinstance(sources, str):
                sources = [sources]
            if not sources:
                raise ValueError(f"finding batch entry {index}: 'source' or 'sources' is required")
            finding["sources"] = sorted(set(sources))
            finding["phase"] = str(finding["phase"]) if finding.get("phase") is not None else None
            findings.append(finding)
        record_gaps(data.get("not_checked"))
        return [(url, findings)]

    # a11y-scan.mjs
    if isinstance(data, dict) and "scans" in data:
        url = data.get("url", path)
        findings = parse_behavioural(data["scans"], url)
        record_gaps(data.get("coverage", {}).get("notChecked"))
        axe = data["scans"].get("axe", {})
        if axe.get("status") == "ok":
            findings += parse_axe_violations(axe.get("violations"), url, "axe", "1")
        return [(url, findings)]

    # axe CLI: a list of page results
    if isinstance(data, list):
        pages = []
        for entry in data:
            url = entry.get("url", path)
            pages.append((url, parse_axe_violations(entry.get("violations"), url, "axe", "1")))
        return pages

    # @axe-core/playwright: single result object
    if isinstance(data, dict) and "violations" in data:
        url = data.get("url", path)
        return [(url, parse_axe_violations(data["violations"], url, "axe", "1"))]

    raise ValueError(f"unrecognised scanner output: {path}")


# --- Merge and score -------------------------------------------------------

SEVERITY_ORDER = ["minor", "moderate", "serious", "critical"]


def merge_findings(findings):
    """Collapse duplicates, then correlate agreement across sources.

    Two passes are needed because scanners describe the same element with
    different selectors — axe emits a short CSS selector, the behavioural
    scanner emits a tag/id pair — so exact-location matching alone would
    leave genuine agreement undetected.

    Pass 1 merges findings that share rule, page, and location exactly.
    Pass 2 correlates by rule and page: when independent sources flag the same
    rule on the same page, every instance of that rule gains confidence, per
    the source correlation rule in SKILL.md.
    """
    buckets = defaultdict(list)
    for finding in findings:
        location = finding.get("location") or {}
        buckets[(finding.get("rule_id"), location.get("url"), location.get("selector"))].append(finding)

    merged = []
    for group in buckets.values():
        primary = dict(group[0])
        primary["sources"] = sorted({s for f in group for s in f.get("sources", [])})
        primary["severity"] = max((f["severity"] for f in group),
                                  key=lambda s: SEVERITY_ORDER.index(s) if s in SEVERITY_ORDER else 0)
        merged.append(primary)

    sources_by_rule = defaultdict(set)
    for finding in merged:
        key = (finding.get("rule_id"), (finding.get("location") or {}).get("url"))
        sources_by_rule[key].update(finding.get("sources", []))

    for finding in merged:
        key = (finding.get("rule_id"), (finding.get("location") or {}).get("url"))
        corroborating = sources_by_rule[key]
        finding["source_count"] = len(corroborating)
        finding["corroborated_by"] = sorted(corroborating)
        if len(corroborating) >= 3:
            finding["confidence"] = "confirmed"
        elif len(corroborating) == 2 and finding["confidence"] != "confirmed":
            finding["confidence"] = "high"

    return merged


def deduction_for(finding):
    severity = finding["severity"]
    confidence = finding["confidence"]
    sources = finding.get("source_count", 1)

    if severity == "minor":
        base = BASE_DEDUCTIONS[("minor", None)]
    elif severity == "critical":
        if confidence == "confirmed":
            base = BASE_DEDUCTIONS[("critical", "confirmed")]
        elif confidence == "high":
            base = BASE_DEDUCTIONS[("critical", "high", 2 if sources >= 2 else 1)]
        else:
            base = BASE_DEDUCTIONS[("critical", confidence)]
    else:
        lookup = "high" if confidence == "confirmed" else confidence
        base = BASE_DEDUCTIONS.get((severity, lookup), 1)

    if confidence == "confirmed":
        base *= CONFIRMED_MULTIPLIER
    return base * CALIBRATION[rule_family(finding.get("rule_id"))]


def grade_for(score):
    return next(grade for threshold, grade in GRADE_BANDS if score >= threshold)


def score_page(findings, profile):
    score = 100.0
    for finding in findings:
        score = max(0.0, score - deduction_for(finding) * PROFILE_MULTIPLIERS[profile])
    return round(score)


def remediation_delta(current, baseline):
    def key(f):
        location = f.get("location") or {}
        return (f.get("rule_id"), location.get("url"), location.get("selector"))

    now, before = {key(f) for f in current}, {key(f) for f in baseline}
    return {
        "fixed": len(before - now),
        "new": len(now - before),
        "persistent": len(now & before),
        "previous_total": len(before),
        "current_total": len(now),
    }


def to_markdown(report):
    lines = ["## Accessibility Scorecard", "",
             "| Page | Score | Grade | Critical | Serious | Moderate | Minor |",
             "|------|-------|-------|----------|---------|----------|-------|"]
    for page in report["pages"]:
        counts = page["counts"]
        lines.append(f'| {page["url"]} | {page["score"]} | {page["grade"]} | '
                     f'{counts["critical"]} | {counts["serious"]} | '
                     f'{counts["moderate"]} | {counts["minor"]} |')
    overall = report["overall"]
    lines.append(f'| **Average** | **{overall["score"]}** | **{overall["grade"]}** | '
                 f'{overall["counts"]["critical"]} | {overall["counts"]["serious"]} | '
                 f'{overall["counts"]["moderate"]} | {overall["counts"]["minor"]} |')
    if report.get("remediation_delta"):
        delta = report["remediation_delta"]
        lines += ["", "## Remediation Progress", "",
                  f'- Fixed: {delta["fixed"]}', f'- New: {delta["new"]}',
                  f'- Persistent: {delta["persistent"]}']
    return "\n".join(lines)


def load_dismissals(path):
    """Read the dismissal file that records verified false positives.

    Schema — a list of rules, each needing an explicit reason:

        [{"rule_id": "focus-not-visible",
          "selector": "p-button",        # optional substring match
          "url": "http://...",           # optional substring match
          "reason": "PDS renders the focus ring in shadow DOM; verified by Tab"}]

    A dismissal without a reason is rejected: an unexplained dismissal is
    indistinguishable from a missed issue when someone reviews the audit later.
    """
    with open(path, encoding="utf-8") as handle:
        entries = json.load(handle)
    if isinstance(entries, dict):
        entries = entries.get("dismissals", [])
    if not isinstance(entries, list):
        raise ValueError("dismissal file must be a list, or an object with a 'dismissals' list")

    for index, entry in enumerate(entries):
        if not isinstance(entry, dict) or not entry.get("rule_id"):
            raise ValueError(f"dismissal {index}: 'rule_id' is required")
        if not (entry.get("reason") or "").strip():
            raise ValueError(f"dismissal {index} ({entry['rule_id']}): 'reason' is required")
    return entries


def apply_dismissals(findings, dismissals):
    """Split findings into kept and dismissed. Dismissed ones carry their reason."""
    if not dismissals:
        return findings, []

    kept, dismissed = [], []
    for finding in findings:
        location = finding.get("location") or {}
        match = None
        for entry in dismissals:
            if entry["rule_id"] != finding.get("rule_id"):
                continue
            if entry.get("selector") and entry["selector"] not in (location.get("selector") or ""):
                continue
            if entry.get("url") and entry["url"] not in (location.get("url") or ""):
                continue
            match = entry
            break
        if match:
            finding = dict(finding, dismissed=True, dismissal_reason=match["reason"].strip())
            dismissed.append(finding)
        else:
            kept.append(finding)
    return kept, dismissed


def main():
    parser = argparse.ArgumentParser(description="Normalize and score accessibility scanner output.")
    parser.add_argument("files", nargs="+")
    parser.add_argument("--profile", choices=list(PROFILE_MULTIPLIERS), default="balanced")
    parser.add_argument("--baseline")
    parser.add_argument("--dismiss", metavar="FILE",
                        help="JSON file of verified false positives, each with a reason")
    parser.add_argument("--out")
    parser.add_argument("--format", choices=["json", "markdown"], default="json")
    args = parser.parse_args()

    dismissals = []
    if args.dismiss:
        try:
            dismissals = load_dismissals(args.dismiss)
        except (OSError, json.JSONDecodeError, ValueError) as error:
            print(f"Error reading {args.dismiss}: {error}", file=sys.stderr)
            return 2

    by_page = defaultdict(list)
    not_checked = []
    for path in args.files:
        if not os.path.exists(path):
            print(f"Error: no such file: {path}", file=sys.stderr)
            return 2
        try:
            for url, findings in parse_file(path, not_checked):
                by_page[url].extend(findings)
        except (ValueError, json.JSONDecodeError, KeyError) as error:
            print(f"Error parsing {path}: {error}", file=sys.stderr)
            return 2

    if not by_page:
        print("No findings could be parsed from the given files.", file=sys.stderr)
        return 1

    pages, all_findings, all_dismissed = [], [], []
    for url, findings in by_page.items():
        merged = merge_findings(findings)
        # Dismissals are applied before counting and scoring, so counts, score,
        # and the findings list can never disagree about what is active.
        merged, dismissed = apply_dismissals(merged, dismissals)
        all_findings.extend(merged)
        all_dismissed.extend(dismissed)
        counts = {s: sum(1 for f in merged if f["severity"] == s)
                  for s in ("critical", "serious", "moderate", "minor")}
        score = score_page(merged, args.profile)
        pages.append({"url": url, "score": score, "grade": grade_for(score),
                      "counts": counts, "finding_count": len(merged),
                      "dismissed_count": len(dismissed)})

    average = round(sum(p["score"] for p in pages) / len(pages))
    totals = {s: sum(p["counts"][s] for p in pages)
              for s in ("critical", "serious", "moderate", "minor")}

    report = {
        "scoring": {
            "model": "a11y-severity-scoring-v2",
            "profile": args.profile,
            "sources": sorted({s for f in all_findings for s in f.get("sources", [])}),
        },
        # The score reflects what was measured. Criteria listed here were not,
        # so a high score does not mean the page conforms.
        "coverage": {"not_checked": not_checked},
        "pages": sorted(pages, key=lambda p: p["score"]),
        "overall": {"score": average, "grade": grade_for(average), "counts": totals,
                    "finding_count": len(all_findings),
                    "dismissed_count": len(all_dismissed)},
        "findings": sorted(all_findings,
                           key=lambda f: ["critical", "serious", "moderate", "minor"].index(f["severity"])),
        "dismissed": all_dismissed,
    }

    # The invariant every downstream artifact relies on. If this ever trips, the
    # file is malformed and must not be exported or quoted in a report.
    assert sum(totals.values()) == len(all_findings), (
        f"internal error: counts {totals} do not sum to {len(all_findings)} findings")

    if args.baseline:
        try:
            with open(args.baseline, encoding="utf-8") as handle:
                previous = json.load(handle)
            report["remediation_delta"] = remediation_delta(all_findings, previous.get("findings", []))
        except (OSError, json.JSONDecodeError) as error:
            print(f"Warning: could not read baseline: {error}", file=sys.stderr)

    output = to_markdown(report) if args.format == "markdown" else json.dumps(report, indent=2)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            handle.write(output if args.format == "markdown" else json.dumps(report, indent=2))
        dismissed_note = f', {len(all_dismissed)} dismissed' if all_dismissed else ''
        print(f'Wrote {args.out}: {len(all_findings)} active findings{dismissed_note} '
              f'across {len(pages)} page(s), overall {average}/100 ({grade_for(average)})')
    else:
        print(output)

    return 0


if __name__ == "__main__":
    sys.exit(main())
