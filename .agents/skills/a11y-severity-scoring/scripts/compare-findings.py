#!/usr/bin/env python3
"""Compare two findings.json files by catalog identity.

Compares identity plus every score-affecting field and scanner metadata. Exit 0
only when two runs are scoring-equivalent; exit 1 when they differ.

Usage:
    compare-findings.py <run-a/findings.json> <run-b/findings.json>
"""

import argparse
import importlib.util
import json
import os
import sys

sys.dont_write_bytecode = True
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SPEC = importlib.util.spec_from_file_location(
    "normalize_findings", os.path.join(SCRIPT_DIR, "normalize-findings.py"))
normalize_findings = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(normalize_findings)

canonical_location = normalize_findings.canonical_location
identity_key = normalize_findings.identity_key
load_catalog = normalize_findings.load_catalog
CATALOG_PATH = normalize_findings.CATALOG_PATH


def sorted_keys(values):
    return sorted(values, key=lambda item: tuple(value or "" for value in item))


def load_findings(path):
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    required = {"findings", "pages", "overall", "scoring", "coverage", "dismissed"}
    if not isinstance(data, dict) or not required.issubset(data):
        missing = sorted(required - set(data if isinstance(data, dict) else {}))
        raise ValueError(
            f"{path} is not a normalized findings.json; missing {', '.join(missing)}")
    scoring = data.get("scoring") or {}
    if not scoring.get("model") or not scoring.get("catalogVersion"):
        raise ValueError(f"{path} has incomplete scoring metadata")
    return data


def index_findings(findings, catalog):
    indexed = {}
    for finding in findings:
        key = identity_key(finding, catalog)
        if key in indexed:
            raise ValueError(f"duplicate finding identity: {key!r}")
        indexed[key] = finding
    return indexed


def describe(key, finding):
    location = finding.get("location") or {}
    where = location.get("selector") or location.get("file") or canonical_location(finding, {"rules": {}})
    return {
        "rule_id": key[0],
        "url": key[1],
        "location": where,
        "severity": finding.get("severity"),
    }


def main():
    parser = argparse.ArgumentParser(description="Diff two scored findings.json files by identity.")
    parser.add_argument("a")
    parser.add_argument("b")
    parser.add_argument("--catalog", default=CATALOG_PATH)
    args = parser.parse_args()

    try:
        catalog = load_catalog(args.catalog)
        left = load_findings(args.a)
        right = load_findings(args.b)
        for name, report in ((args.a, left), (args.b, right)):
            if report["scoring"]["catalogVersion"] != catalog.get("version"):
                raise ValueError(
                    f"{name} uses catalog {report['scoring']['catalogVersion']}; "
                    f"expected {catalog.get('version')}")
        a_map = index_findings(left.get("findings") or [], catalog)
        b_map = index_findings(right.get("findings") or [], catalog)
        dismissed_a = index_findings(left.get("dismissed") or [], catalog)
        dismissed_b = index_findings(right.get("dismissed") or [], catalog)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"Error: {error}", file=sys.stderr)
        return 2

    only_a = sorted_keys(a_map.keys())
    only_in_a = [describe(k, a_map[k]) for k in only_a if k not in b_map]
    only_in_b = [describe(k, b_map[k]) for k in sorted_keys(b_map) if k not in a_map]
    field_mismatches = []
    for key in sorted_keys(set(a_map) & set(b_map)):
        fields = ("severity", "confidence", "sources", "source_count")
        changed = {
            field: {"a": a_map[key].get(field), "b": b_map[key].get(field)}
            for field in fields
            if a_map[key].get(field) != b_map[key].get(field)
        }
        if changed:
            field_mismatches.append({
                "rule_id": key[0],
                "url": key[1],
                "location": key[2],
                "changes": changed,
            })

    metadata_fields = (
        "model", "profile", "catalogVersion", "executedSourcesByPage",
        "executedChecksByPage", "reviewedPhasesByPage", "scannerMetadata",
    )
    metadata_mismatches = {
        field: {
            "a": (left.get("scoring") or {}).get(field),
            "b": (right.get("scoring") or {}).get(field),
        }
        for field in metadata_fields
        if (left.get("scoring") or {}).get(field) != (right.get("scoring") or {}).get(field)
    }
    score_mismatches = {}
    if left.get("overall") != right.get("overall"):
        score_mismatches["overall"] = {
            "a": left.get("overall"),
            "b": right.get("overall"),
        }
    left_pages = {page.get("url"): page for page in left.get("pages") or []}
    right_pages = {page.get("url"): page for page in right.get("pages") or []}
    if left_pages != right_pages:
        score_mismatches["pages"] = {"a": left_pages, "b": right_pages}

    dismissal_mismatches = {
        "only_in_a": [describe(key, dismissed_a[key])
                      for key in sorted_keys(set(dismissed_a) - set(dismissed_b))],
        "only_in_b": [describe(key, dismissed_b[key])
                      for key in sorted_keys(set(dismissed_b) - set(dismissed_a))],
    }

    report = {
        "only_in_a": only_in_a,
        "only_in_b": only_in_b,
        "field_mismatches": field_mismatches,
        "metadata_mismatches": metadata_mismatches,
        "score_mismatches": score_mismatches,
        "dismissal_mismatches": dismissal_mismatches,
        "a_count": len(a_map),
        "b_count": len(b_map),
        "a_score": (left.get("overall") or {}).get("score"),
        "b_score": (right.get("overall") or {}).get("score"),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    if (only_in_a or only_in_b or field_mismatches or metadata_mismatches
            or score_mismatches or any(dismissal_mismatches.values())):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
