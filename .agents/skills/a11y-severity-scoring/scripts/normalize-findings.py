#!/usr/bin/env python3
"""Normalize scanner output into audit findings and score them.

Turns raw scanner JSON into the shape defined in references/finding-schema.md,
merges findings that several sources agree on, and applies the scoring formula
from SKILL.md. Rule ids, severities, and WCAG criteria come from
references/rule-catalog.json so identical inputs score identically. Agent
review IDs must be in the catalog; axe engine IDs that are not yet catalogued
are scored from scanner evidence.

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
import posixpath
import re
import sys
from collections import defaultdict
from urllib.parse import urlsplit, urlunsplit

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

SEVERITY_RANK = ["critical", "serious", "moderate", "minor"]
VALID_CONFIDENCE = {"confirmed", "high", "medium", "low"}
VALID_SOURCES = {"axe", "agent-review", "playwright"}
CODE_REVIEW_ONLY_GAPS = (
    {
        "criterion": "Runtime semantics, names, and rendered contrast",
        "reason": "Code review cannot compute the browser accessibility tree or rendered colors.",
        "verifyBy": "Run Phase 1 axe, tree, and coverage scans on the rendered page.",
    },
    {
        "criterion": "Keyboard behavior, focus, reflow, and target geometry",
        "reason": "Static source does not prove runtime interaction or layout behavior.",
        "verifyBy": "Run Phase 10 keyboard and viewport scans, then test focus visibility manually.",
    },
)

CATALOG_PATH = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "references", "rule-catalog.json"))

LINE_SUFFIX = re.compile(r":\d+(?::\d+)?$")


def load_catalog(path=CATALOG_PATH):
    try:
        with open(path, encoding="utf-8") as handle:
            catalog = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        raise ValueError(f"could not read rule catalog {path}: {error}") from error
    if not isinstance(catalog, dict) or not isinstance(catalog.get("rules"), dict):
        raise ValueError(f"rule catalog {path} is missing a 'rules' object")
    required = {
        "rule_id", "owner", "severity", "confidence", "wcag", "wcag_level",
        "phase", "location_key", "emit_if", "check",
    }
    for rule_id, rule in catalog["rules"].items():
        missing_fields = sorted(required - set(rule))
        if missing_fields:
            raise ValueError(
                f"rule catalog {path}: {rule_id} missing {', '.join(missing_fields)}")
        if rule["rule_id"] != rule_id:
            raise ValueError(f"rule catalog {path}: key/id mismatch for {rule_id}")
        if rule["confidence"] not in VALID_CONFIDENCE:
            raise ValueError(
                f"rule catalog {path}: {rule_id} has invalid confidence")
        if rule["severity"] not in SEVERITY_RANK:
            raise ValueError(
                f"rule catalog {path}: {rule_id} has invalid severity")
        if rule["location_key"] not in {"selector", "file", "document"}:
            raise ValueError(
                f"rule catalog {path}: {rule_id} has invalid location_key")
    scanner = catalog.get("scanner") or {}
    missing = sorted(set(scanner.get("axe_rule_ids") or []) - set(catalog["rules"]))
    if missing:
        raise ValueError(
            f"rule catalog {path} is missing configured axe rules: {', '.join(missing)}")
    disabled = set(scanner.get("disabled_axe_rules") or [])
    wrong_owner = sorted(
        rule_id for rule_id in scanner.get("axe_rule_ids") or []
        if rule_id not in disabled and catalog["rules"][rule_id].get("owner") != "axe"
    )
    if wrong_owner:
        raise ValueError(
            f"configured axe rules have a non-axe owner: {', '.join(wrong_owner)}")
    return catalog


def canonical_url(value):
    """Normalize scheme/host/default port while preserving route state exactly."""
    value = (value or "").strip()
    if not value:
        return value
    parts = urlsplit(value)
    if not parts.scheme:
        return value
    scheme = parts.scheme.lower()
    hostname = (parts.hostname or "").lower()
    port = parts.port
    if port and not ((scheme == "http" and port == 80) or (scheme == "https" and port == 443)):
        hostname = f"{hostname}:{port}"
    path = parts.path or "/"
    return urlunsplit((scheme, hostname, path, parts.query, parts.fragment))


def canonical_file(value):
    value = LINE_SUFFIX.sub("", (value or "").replace("\\", "/").strip())
    if not value:
        return value
    normalized = posixpath.normpath(value)
    return normalized[2:] if normalized.startswith("./") else normalized


def canonical_location(finding, catalog):
    """Stable identity fragment: selector, file path, or 'document' — never a line number."""
    meta = (catalog.get("rules") or {}).get(finding.get("rule_id") or "", {})
    key = meta.get("location_key") or "selector"
    location = finding.get("location") or {}
    if key == "document":
        return "document"
    if key == "file":
        path = canonical_file(location.get("file"))
        return f"file:{path}" if path else "document"
    selector = (location.get("selector") or "").strip()
    if selector:
        return f"selector:{selector}"
    path = canonical_file(location.get("file"))
    return f"file:{path}" if path else "document"


def identity_key(finding, catalog):
    location = finding.get("location") or {}
    return (finding.get("rule_id"), location.get("url"), canonical_location(finding, catalog))


def is_axe_sourced(finding):
    return "axe" in (finding.get("sources") or [])


def synthesized_axe_rule(finding):
    """Score an engine rule that is not yet in the catalog from axe evidence."""
    severity = finding.get("severity")
    if severity not in SEVERITY_RANK:
        severity = "moderate"
    level = finding.get("wcag_level")
    if level not in {"A", "AA", "AAA"}:
        level = "AA"
    return {
        "severity": severity,
        "wcag": finding.get("wcag") or "unmapped",
        "wcag_level": level,
        "confidence": "high",
        "phase": "1",
        "location_key": "selector",
    }


def catalog_rule(finding, catalog):
    rid = finding.get("rule_id")
    meta = (catalog.get("rules") or {}).get(rid)
    if meta:
        return meta
    if is_axe_sourced(finding) and rid:
        return synthesized_axe_rule(finding)
    return {}


def apply_catalog(finding, catalog):
    rid = finding.get("rule_id")
    meta = catalog_rule(finding, catalog)
    if not meta:
        raise ValueError(f"unknown rule_id: {rid!r}")
    finding["severity"] = meta["severity"]
    finding["wcag"] = meta["wcag"]
    finding["wcag_level"] = meta["wcag_level"]
    finding["confidence"] = meta["confidence"]
    finding["phase"] = str(meta["phase"])
    for field in ("description", "impact", "remediation"):
        value = finding.get(field)
        if not isinstance(value, str) or not value.strip():
            if is_agent_only(finding):
                raise ValueError(f"finding {rid!r}: {field!r} is required")
            finding[field] = (
                f"Review {rid} scanner evidence and follow its help URL."
                if field == "remediation"
                else finding.get("description") or rid
            )
    location = finding.get("location")
    if not isinstance(location, dict):
        raise ValueError(f"finding {rid!r}: 'location' must be an object")
    location.pop("line", None)
    location["url"] = canonical_url(location.get("url"))
    if location.get("file"):
        location["file"] = canonical_file(location["file"])
    location_key = meta.get("location_key")
    if location_key == "document":
        location["selector"] = location.get("selector") or "document"
    elif not (location.get(location_key) or
              (is_agent_only(finding) and (location.get("selector") or location.get("file")))):
        raise ValueError(
            f"finding {rid!r}: location requires {location_key!r}")
    finding["location"] = location
    return finding


def is_agent_only(finding):
    sources = [s for s in (finding.get("sources") or []) if s]
    return sources == ["agent-review"]


def drop_agent_scanner_duplicates(findings, catalog, executed_checks):
    """Drop agent re-scores only when the authoritative scanner actually ran."""
    kept = []
    for finding in findings:
        meta = (catalog.get("rules") or {}).get(finding.get("rule_id") or "", {})
        owner = meta.get("owner")
        if (is_agent_only(finding) and owner in ("axe", "playwright")
                and meta.get("check") in executed_checks):
            continue
        kept.append(finding)
    return kept

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
                selector = target.get("selector")
                if not selector or selector in seen_targets:
                    continue
                seen_targets.add(selector)
                findings.append(make_finding(
                    rule_id="target-size-measured", severity="moderate", confidence="medium",
                    location={"url": url, "selector": selector},
                    description=(f'Target "{target.get("name")}" is '
                                 f'{target.get("width")}x{target.get("height")} CSS pixels, '
                                 "below 24x24 with no inline or spacing exception."),
                    impact="Users with motor impairments may miss or mistap this control.",
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
                phase="1",
            ))
        for skip in tree.get("skippedHeadingLevels", []):
            findings.append(make_finding(
                rule_id="heading-order", severity="moderate", confidence="high",
                location={"url": url, "selector": skip["to"].get("selector")
                          or f'heading "{skip["to"]["name"]}"'},
                description=(f'Heading level jumps from H{skip["from"]["level"]} '
                             f'to H{skip["to"]["level"]}.'),
                impact="Screen reader users navigating by heading perceive a gap in structure.",
                remediation="Use sequential heading levels; style visually rather than skipping.",
                wcag="1.3.1", wcag_level="A", sources=["playwright"],
                help_url="https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html",
                phase="1",
            ))
        for role in tree.get("missingLandmarks", []):
            findings.append(make_finding(
                rule_id="landmark-missing", severity="minor", confidence="medium",
                location={"url": url, "selector": f'document[missing-landmark="{role}"]'},
                description=f'No "{role}" landmark on the page.',
                impact="Screen reader users lose a navigation shortcut to this region.",
                remediation=f'Add the appropriate element or role="{role}".',
                wcag="1.3.1", wcag_level="A", sources=["playwright"],
                help_url="https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html",
                phase="1",
            ))
    return findings


def parse_file(path, not_checked=None, execution=None, executed_checks=None,
               scanner_metadata=None, reviewed_phases=None):
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

    def mark(url, source, check):
        if execution is not None:
            execution[canonical_url(url)].add(source)
        if executed_checks is not None:
            executed_checks[canonical_url(url)].add(check)

    def record_scanner(data):
        if scanner_metadata is None:
            return
        metadata = {
            "url": canonical_url(data.get("url")),
            "runner": "a11y-scan",
            "catalogVersion": data.get("catalogVersion"),
            "axeStatus": ((data.get("scans") or {}).get("axe") or {}).get("status"),
            "axeCoreVersion": data.get("axeCoreVersion"),
            "axePlaywrightVersion": data.get("axePlaywrightVersion"),
            "playwrightVersion": data.get("playwrightVersion"),
            "browserVersion": data.get("browserVersion"),
            "modes": data.get("modes"),
            "tags": data.get("tags"),
            "selector": data.get("selector"),
            "storageState": data.get("storageState"),
            "colorScheme": data.get("colorScheme"),
            "canvasWorkaround": ((data.get("scans") or {}).get("axe") or {}).get(
                "canvasWorkaround"
            ),
            "viewports": data.get("viewports"),
            "maxTabs": data.get("maxTabs"),
            "timeout": data.get("timeout"),
            "loadDelay": data.get("loadDelay"),
            "readiness": data.get("readiness"),
        }
        if metadata not in scanner_metadata:
            scanner_metadata.append(metadata)

    # Previously normalized output
    if isinstance(data, dict) and "findings" in data and "pages" in data:
        record_gaps(data.get("coverage", {}).get("not_checked"))
        scoring = data.get("scoring") or {}
        if execution is not None:
            for page_url, sources in (scoring.get("executedSourcesByPage") or {}).items():
                execution[canonical_url(page_url)].update(sources)
        if executed_checks is not None:
            for page_url, checks in (scoring.get("executedChecksByPage") or {}).items():
                executed_checks[canonical_url(page_url)].update(checks)
        if reviewed_phases is not None:
            for page_url, phases in (scoring.get("reviewedPhasesByPage") or {}).items():
                reviewed_phases[canonical_url(page_url)].update(str(phase) for phase in phases)
        if scanner_metadata is not None:
            for metadata in scoring.get("scannerMetadata") or []:
                if metadata not in scanner_metadata:
                    scanner_metadata.append(metadata)
        return [(canonical_url(p["url"]),
                 [f for f in data["findings"]
                  if canonical_url(f.get("location", {}).get("url")) == canonical_url(p["url"])])
                for p in data["pages"]]

    # Shared finding batch from agent review or a scanner without a native parser.
    if isinstance(data, dict) and data.get("type") == "a11y-finding-batch":
        url = canonical_url(data.get("url", path))
        source = data.get("source")
        if source not in VALID_SOURCES:
            raise ValueError(f"finding batch has unknown source: {source!r}")
        if source == "agent-review" and data.get("phase") is not None and reviewed_phases is not None:
            reviewed_phases[url].add(str(data["phase"]))
        findings = []
        for index, raw in enumerate(data.get("findings", [])):
            if not isinstance(raw, dict) or not raw.get("rule_id"):
                raise ValueError(f"finding batch entry {index}: 'rule_id' is required")
            for field in ("location", "description", "impact", "remediation"):
                if not raw.get(field):
                    raise ValueError(
                        f"finding batch entry {index}: {field!r} is required")
            if "source" in raw or "sources" in raw:
                raise ValueError(
                    f"finding batch entry {index}: per-item 'source'/'sources' is not allowed; "
                    "use the batch-level 'source' only")
            finding = make_finding()
            finding.update(raw)
            location = finding.get("location")
            if isinstance(location, str):
                location = {"selector": location}
            elif not isinstance(location, dict):
                location = {}
            finding["location"] = dict(location, url=location.get("url") or url)
            finding.pop("source", None)
            finding.pop("sources", None)
            finding["sources"] = [source]
            finding["phase"] = str(finding["phase"]) if finding.get("phase") is not None else None
            findings.append(finding)
        record_gaps(data.get("not_checked"))
        return [(url, findings)]

    # a11y-scan.mjs
    if isinstance(data, dict) and "scans" in data:
        url = canonical_url(data.get("url", path))
        record_scanner(data)
        findings = parse_behavioural(data["scans"], url)
        record_gaps(data.get("coverage", {}).get("notChecked"))
        axe = data["scans"].get("axe", {})
        if axe.get("status") == "ok":
            mark(url, "axe", "axe")
            findings += parse_axe_violations(axe.get("violations"), url, "axe", "1")
        for mode in ("tree", "keyboard", "viewport", "coverage"):
            if (data["scans"].get(mode) or {}).get("status") == "ok":
                mark(url, "playwright", mode)
        return [(url, findings)]

    # axe CLI: a list of page results
    if isinstance(data, list):
        pages = []
        for entry in data:
            url = canonical_url(entry.get("url", path))
            mark(url, "axe", "axe")
            if scanner_metadata is not None:
                scanner_metadata.append({
                    "url": url,
                    "runner": "axe-cli",
                    "axeStatus": "ok",
                    "axeCoreVersion": (entry.get("testEngine") or {}).get("version"),
                    "modes": ["axe"],
                })
            pages.append((url, parse_axe_violations(entry.get("violations"), url, "axe", "1")))
        return pages

    # @axe-core/playwright: single result object
    if isinstance(data, dict) and "violations" in data:
        url = canonical_url(data.get("url", path))
        mark(url, "axe", "axe")
        if scanner_metadata is not None:
            scanner_metadata.append({
                "url": url,
                "runner": "axe-playwright-raw",
                "axeStatus": "ok",
                "axeCoreVersion": (data.get("testEngine") or {}).get("version"),
                "modes": ["axe"],
            })
        return [(url, parse_axe_violations(data["violations"], url, "axe", "1"))]

    raise ValueError(f"unrecognised scanner output: {path}")


# --- Merge and score -------------------------------------------------------

SEVERITY_ORDER = ["minor", "moderate", "serious", "critical"]


def merge_findings(findings, catalog):
    """Collapse exact identities and derive confidence without input-order effects."""
    buckets = defaultdict(list)
    for finding in findings:
        buckets[identity_key(finding, catalog)].append(finding)

    merged = []
    for identity in sorted(buckets, key=lambda item: tuple(value or "" for value in item)):
        group = buckets[identity]
        primary = dict(min(
            group,
            key=lambda finding: (
                ",".join(finding.get("sources") or []),
                finding.get("description") or "",
                finding.get("impact") or "",
                finding.get("remediation") or "",
            ),
        ))
        sources = sorted({source for finding in group
                          for source in finding.get("sources", [])})
        confidence_sources = set(sources)
        meta = catalog_rule(primary, catalog)
        confidence = meta.get("confidence") or primary.get("confidence") or "high"
        if len(confidence_sources) >= 3:
            confidence = "confirmed"
        elif len(confidence_sources) >= 2:
            confidence = "high"
        primary["sources"] = sources
        primary["source_count"] = len(confidence_sources)
        primary["corroborated_by"] = sources
        primary["confidence"] = confidence
        merged.append(primary)

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


def remediation_delta(current, baseline, catalog):
    now = {identity_key(f, catalog) for f in current}
    before = {identity_key(f, catalog) for f in baseline}
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


def finding_sort_key(finding, catalog):
    severity = finding.get("severity")
    rank = SEVERITY_RANK.index(severity) if severity in SEVERITY_RANK else len(SEVERITY_RANK)
    location = finding.get("location") or {}
    return (rank, finding.get("rule_id") or "", location.get("url") or "",
            canonical_location(finding, catalog))


def main():
    parser = argparse.ArgumentParser(description="Normalize and score accessibility scanner output.")
    parser.add_argument("files", nargs="+")
    parser.add_argument("--profile", choices=list(PROFILE_MULTIPLIERS), default="balanced")
    parser.add_argument("--baseline")
    parser.add_argument("--dismiss", metavar="FILE",
                        help="JSON file of verified false positives, each with a reason")
    parser.add_argument("--catalog", metavar="FILE", default=CATALOG_PATH,
                        help="rule catalog JSON (default: packaged references/rule-catalog.json)")
    parser.add_argument("--out")
    parser.add_argument("--format", choices=["json", "markdown"], default="json")
    args = parser.parse_args()

    try:
        catalog = load_catalog(args.catalog)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    dismissals = []
    if args.dismiss:
        try:
            dismissals = load_dismissals(args.dismiss)
        except (OSError, json.JSONDecodeError, ValueError) as error:
            print(f"Error reading {args.dismiss}: {error}", file=sys.stderr)
            return 2

    by_page = defaultdict(list)
    execution_by_page = defaultdict(set)
    executed_checks_by_page = defaultdict(set)
    reviewed_phases_by_page = defaultdict(set)
    scanner_metadata = []
    not_checked = []
    for path in args.files:
        if not os.path.exists(path):
            print(f"Error: no such file: {path}", file=sys.stderr)
            return 2
        try:
            for url, findings in parse_file(
                    path, not_checked, execution_by_page, executed_checks_by_page,
                    scanner_metadata,
                    reviewed_phases_by_page):
                url = canonical_url(url)
                prepared = []
                for finding in findings:
                    apply_catalog(finding, catalog)
                    prepared.append(finding)
                by_page[url].extend(prepared)
        except (ValueError, json.JSONDecodeError, KeyError) as error:
            print(f"Error parsing {path}: {error}", file=sys.stderr)
            return 2

    if not by_page:
        print("No findings could be parsed from the given files.", file=sys.stderr)
        return 1
    for metadata in scanner_metadata:
        scanner_catalog = metadata.get("catalogVersion")
        if scanner_catalog and scanner_catalog != catalog.get("version"):
            print(
                f"Error: scanner catalog {scanner_catalog} does not match "
                f"normalizer catalog {catalog.get('version')}",
                file=sys.stderr,
            )
            return 2

    pages, all_findings, all_dismissed = [], [], []
    for url, findings in by_page.items():
        merged = merge_findings(
            drop_agent_scanner_duplicates(
                findings, catalog, executed_checks_by_page.get(url, set())),
            catalog,
        )
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
    pages.sort(key=lambda page: (page["score"], page["url"]))

    average = round(sum(p["score"] for p in pages) / len(pages))
    totals = {s: sum(p["counts"][s] for p in pages)
              for s in ("critical", "serious", "moderate", "minor")}
    for url in reviewed_phases_by_page:
        checks = executed_checks_by_page.get(url, set())
        missing_gaps = []
        if "axe" not in checks:
            missing_gaps.append(CODE_REVIEW_ONLY_GAPS[0])
        if not {"keyboard", "viewport"}.issubset(checks):
            missing_gaps.append(CODE_REVIEW_ONLY_GAPS[1])
        for gap in missing_gaps:
            not_checked.append({
                **gap,
                "reason": f'[{url}] {gap["reason"]}',
            })

    report = {
        "scoring": {
            "model": "a11y-severity-scoring-v2",
            "profile": args.profile,
            "catalogVersion": catalog.get("version"),
            "executedSourcesByPage": {
                url: sorted(sources)
                for url, sources in sorted(execution_by_page.items())
            },
            "executedChecksByPage": {
                url: sorted(checks)
                for url, checks in sorted(executed_checks_by_page.items())
            },
            "reviewedPhasesByPage": {
                url: sorted(phases, key=lambda value: int(value))
                for url, phases in sorted(reviewed_phases_by_page.items())
            },
            "scannerMetadata": sorted(
                scanner_metadata,
                key=lambda item: json.dumps(item, sort_keys=True),
            ),
            "sources": sorted(
                {source for finding in all_findings
                 for source in finding.get("sources", [])}
                | {source for sources in execution_by_page.values() for source in sources}
                | ({"agent-review"} if reviewed_phases_by_page else set())
            ),
        },
        # The score reflects what was measured. Criteria listed here were not,
        # so a high score does not mean the page conforms.
        "coverage": {"not_checked": sorted(
            {json.dumps(item, sort_keys=True): item for item in not_checked}.values(),
            key=lambda item: (
                item.get("criterion") or "",
                item.get("reason") or "",
                item.get("verifyBy") or "",
            ),
        )},
        "pages": pages,
        "overall": {"score": average, "grade": grade_for(average), "counts": totals,
                    "finding_count": len(all_findings),
                    "dismissed_count": len(all_dismissed)},
        "findings": sorted(all_findings, key=lambda f: finding_sort_key(f, catalog)),
        "dismissed": sorted(all_dismissed, key=lambda f: finding_sort_key(f, catalog)),
    }

    # The invariant every downstream artifact relies on. If this ever trips, the
    # file is malformed and must not be exported or quoted in a report.
    assert sum(totals.values()) == len(all_findings), (
        f"internal error: counts {totals} do not sum to {len(all_findings)} findings")

    if args.baseline:
        try:
            with open(args.baseline, encoding="utf-8") as handle:
                previous = json.load(handle)
            report["remediation_delta"] = remediation_delta(
                all_findings, previous.get("findings", []), catalog)
        except (OSError, json.JSONDecodeError) as error:
            print(f"Warning: could not read baseline: {error}", file=sys.stderr)

    output = to_markdown(report) if args.format == "markdown" else json.dumps(report, indent=2, sort_keys=True)

    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            handle.write(output if args.format == "markdown" else json.dumps(report, indent=2, sort_keys=True))
        dismissed_note = f', {len(all_dismissed)} dismissed' if all_dismissed else ''
        print(f'Wrote {args.out}: {len(all_findings)} active findings{dismissed_note} '
              f'across {len(pages)} page(s), overall {average}/100 ({grade_for(average)})')
    else:
        print(output)

    return 0


if __name__ == "__main__":
    sys.exit(main())
