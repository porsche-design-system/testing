#!/usr/bin/env python3
"""Emit catalog-valid agent-review findings from a Phase 1 scan dump.

Closed-list rules only — the same inputs always produce the same JSON.
Does not invent rule ids. Does not emit axe- or Playwright-owned rules.

Usage:
    static-review.py <scan-axe-page-1.json> [--out $SCRATCH/findings-static-page-1.json]
"""

import argparse
import json
import os
import re
import sys
import unicodedata

CATALOG_PATH = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "references", "rule-catalog.json"))

FILENAME_ALT = re.compile(
    r'(^|[/\\])[^/\\]*\.(png|jpe?g|gif|webp|svg|ico|bmp)(\?.*)?$', re.IGNORECASE)
CODE_NAME = re.compile(
    r'(\{\{|\}\}|\$\{|<%|%>|%s|\{[0-9]+\})')
IDENT_ONLY = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)+$')


def load_catalog(path=CATALOG_PATH):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def lower_text(value):
    return unicodedata.normalize("NFKC", value or "").strip().casefold()


def is_placeholder_name(value, tokens):
    return lower_text(value) in {lower_text(token) for token in tokens}


def looks_like_code_name(value):
    text = (value or "").strip()
    return bool(CODE_NAME.search(text) or IDENT_ONLY.match(text))


def make_item(rule_id, selector, description, impact, remediation, phase):
    return {
        "rule_id": rule_id,
        "location": {"selector": selector},
        "description": description,
        "impact": impact,
        "remediation": remediation,
        "phase": str(phase),
    }


def inventory_from_scan(data):
    if not isinstance(data, dict):
        return None, None
    inventory = data.get("inventory")
    if inventory:
        return data.get("url"), inventory
    tree = (data.get("scans") or {}).get("tree") or {}
    nested = tree.get("inventory")
    if nested:
        return data.get("url"), nested
    return data.get("url"), None


def review_links(inventory, lists):
    findings = []
    banned = {name.lower() for name in lists.get("ambiguous_link_names", [])}
    seen = set()
    for link in inventory.get("links") or []:
        selector = link.get("selector") or "a"
        name = lower_text(link.get("name"))
        key = (selector, name, link.get("href"))
        if key in seen:
            continue
        seen.add(key)
        if name in banned:
            findings.append(make_item(
                "link-name-ambiguous", selector,
                f'Link accessible name is "{link.get("name")}".',
                "Screen reader users cannot tell the destination from the link text.",
                "Use visible text that names the destination.",
                "9",
            ))
    return findings


def review_images(inventory, lists):
    findings = []
    generic = {name.lower() for name in lists.get("generic_alt", [])}
    placeholders = {name.lower() for name in lists.get("placeholder_names", [])}
    seen = set()
    for image in inventory.get("images") or []:
        alt = image.get("alt")
        if alt is None:
            continue  # missing alt is axe-owned (image-alt)
        selector = image.get("selector") or "img"
        key = (selector, alt)
        if key in seen:
            continue
        seen.add(key)
        lowered = lower_text(alt)
        if lowered in generic or FILENAME_ALT.search(alt):
            findings.append(make_item(
                "alt-text-quality", selector,
                f'Image alt text is generic or a filename ("{alt}").',
                "Screen reader users hear a format or file name instead of the image meaning.",
                "Describe the image purpose, or use alt=\"\" when it is decorative.",
                "2",
            ))
        elif lowered in placeholders or looks_like_code_name(alt):
            findings.append(make_item(
                "accessible-name-quality", selector,
                f'Image alt text looks like code or a template ("{alt}").',
                "Assistive technology reads the template syntax instead of a human name.",
                "Resolve the template so alt is a finished phrase.",
                "2",
            ))
    return findings


def review_names(inventory, lists):
    findings = []
    placeholders = {name.lower() for name in lists.get("placeholder_names", [])}
    seen = set()
    for link in inventory.get("links") or []:
        name = link.get("name") or ""
        selector = link.get("selector") or "a"
        key = ("name", selector, name)
        if key in seen:
            continue
        seen.add(key)
        if looks_like_code_name(name) or is_placeholder_name(name, placeholders):
            findings.append(make_item(
                "accessible-name-quality", selector,
                f'Accessible name looks like a template, placeholder, or identifier ("{name}").',
                "Assistive technology users hear code instead of a control name.",
                "Replace it with a finished human-readable name.",
                "2",
            ))
    return findings


def build_batch(url, findings, source="agent-review"):
    return {
        "type": "a11y-finding-batch",
        "url": url,
        "source": source,
        "findings": findings,
    }


def main():
    parser = argparse.ArgumentParser(description="Closed-list agent-review findings from a Phase 1 scan.")
    parser.add_argument("scan")
    parser.add_argument("--out")
    parser.add_argument("--catalog", default=CATALOG_PATH)
    parser.add_argument("--url", help="Override page URL written into the batch")
    args = parser.parse_args()

    try:
        catalog = load_catalog(args.catalog)
    except (OSError, json.JSONDecodeError) as error:
        print(f"Error reading catalog: {error}", file=sys.stderr)
        return 2

    try:
        with open(args.scan, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, json.JSONDecodeError) as error:
        print(f"Error reading {args.scan}: {error}", file=sys.stderr)
        return 2

    url, inventory = inventory_from_scan(data)
    url = args.url or url or args.scan
    findings = []
    lists = catalog.get("lists") or {}

    if inventory:
        findings.extend(review_links(inventory, lists))
        findings.extend(review_images(inventory, lists))
        findings.extend(review_names(inventory, lists))
    else:
        print("Warning: scan has no inventory; emitting an empty batch. "
              "Run a11y-scan.mjs --mode axe,tree,coverage for closed-list review.",
              file=sys.stderr)

    # Stable order
    findings.sort(key=lambda item: (
        item.get("rule_id") or "",
        (item.get("location") or {}).get("selector") or "",
        (item.get("location") or {}).get("file") or "",
    ))

    batch = build_batch(url, findings)
    output = json.dumps(batch, indent=2, sort_keys=True)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as handle:
            handle.write(output + "\n")
        print(f'Wrote {args.out}: {len(findings)} static-review finding(s)')
    else:
        print(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
