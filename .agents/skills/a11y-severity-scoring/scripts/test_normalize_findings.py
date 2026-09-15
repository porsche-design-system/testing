#!/usr/bin/env python3
"""Golden tests for normalize-findings.py and static-review.py."""

import json
import os
import subprocess
import sys
import tempfile
import unittest

SCRIPTS = os.path.dirname(os.path.abspath(__file__))
PACKAGE_ROOT = os.path.normpath(os.path.join(SCRIPTS, "..", "..", "..", ".."))
NORMALIZE = os.path.join(SCRIPTS, "normalize-findings.py")
STATIC = os.path.join(SCRIPTS, "static-review.py")
COMPARE = os.path.join(SCRIPTS, "compare-findings.py")
EXPORT = os.path.normpath(os.path.join(
    SCRIPTS, "..", "..", "a11y-export", "scripts", "export-findings.py"))
CATALOG = os.path.normpath(os.path.join(SCRIPTS, "..", "references", "rule-catalog.json"))


def run_script(script, *args, check=True):
    result = subprocess.run(
        [sys.executable, script, *args],
        capture_output=True, text=True,
    )
    if check and result.returncode != 0:
        raise AssertionError(f"{script} failed ({result.returncode}): {result.stderr}")
    return result


def write_json(path, payload):
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle)


def read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def read_text(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


AXE_PAGE = {
    "url": "https://example.test/",
    "violations": [
        {
            "id": "image-alt",
            "impact": "critical",
            "help": "Images must have alternate text",
            "description": "Ensures <img> elements have alternate text",
            "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/image-alt",
            "tags": ["wcag2a", "wcag111"],
            "nodes": [{"target": ["img.hero"], "html": "<img class=\"hero\">", "failureSummary": "Fix any of the following: Element does not have an alt attribute"}],
        },
        {
            "id": "color-contrast",
            "impact": "serious",
            "help": "Elements must have sufficient color contrast",
            "description": "Ensures the contrast between foreground and background meets WCAG 2 AA",
            "helpUrl": "https://dequeuniversity.com/rules/axe/4.10/color-contrast",
            "tags": ["wcag2aa", "wcag143"],
            "nodes": [{"target": [".muted"], "html": "<p class=\"muted\">Hi</p>", "failureSummary": "Fix any of the following: Element has insufficient color contrast"}],
        },
    ],
}

SCAN_WITH_INVENTORY = {
    "url": "https://example.test/",
    "inventory": {
        "hasTables": False,
        "hasForms": True,
        "hasMedia": False,
        "hasDialogs": False,
        "hasLiveRegions": False,
        "hasCustomWidgets": False,
        "links": [
            {"selector": "footer a.more", "name": "Click here", "href": "/help", "target": None},
            {"selector": "nav a.ext", "name": "Docs", "href": "/docs", "target": "_blank"},
        ],
        "images": [
            {"selector": "img.logo", "alt": "image", "src": "/logo.png"},
            {"selector": "img.ok", "alt": "Company logo", "src": "/ok.png"},
        ],
    },
    "scans": {
        "axe": {"status": "ok", "violations": AXE_PAGE["violations"]},
        "tree": {"status": "ok", "h1Count": 1, "skippedHeadingLevels": [], "missingLandmarks": []},
    },
}

AGENT_BATCH = {
    "type": "a11y-finding-batch",
    "url": "https://example.test/",
    "source": "agent-review",
    "findings": [
        {
            "rule_id": "image-alt",
            "location": {"selector": "img.hero", "file": "src/Hero.tsx:12"},
            "description": "Agent also saw a missing alt.",
            "impact": "duplicate",
            "remediation": "add alt",
            "phase": "2",
            "severity": "minor",
        },
        {
            "rule_id": "link-name-ambiguous",
            "location": {"selector": "footer a.more", "line": 44},
            "description": "Link says click here.",
            "impact": "unclear destination",
            "remediation": "name the destination",
            "phase": "9",
            "severity": "critical",
        },
    ],
}


class NormalizeTests(unittest.TestCase):
    def write(self, directory, name, payload):
        path = os.path.join(directory, name)
        write_json(path, payload)
        return path

    def normalize(self, *inputs):
        with tempfile.TemporaryDirectory() as tmp:
            out = os.path.join(tmp, "findings.json")
            run_script(NORMALIZE, *inputs, "--out", out)
            with open(out, encoding="utf-8") as handle:
                return json.load(handle)

    def test_identical_inputs_byte_identical_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = self.write(tmp, "scan.json", AXE_PAGE)
            a = os.path.join(tmp, "a.json")
            b = os.path.join(tmp, "b.json")
            run_script(NORMALIZE, scan, "--out", a)
            run_script(NORMALIZE, scan, "--out", b)
            self.assertEqual(read_text(a), read_text(b))

    def test_batch_rejects_per_item_sources(self):
        with tempfile.TemporaryDirectory() as tmp:
            batch = self.write(tmp, "batch.json", {
                "type": "a11y-finding-batch",
                "url": "https://example.test/",
                "source": "agent-review",
                "phase": "2",
                "findings": [{
                    "rule_id": "image-alt",
                    "sources": ["axe"],
                    "location": {"selector": "img.hero"},
                    "description": "missing alt",
                    "impact": "no alternative",
                    "remediation": "add alt",
                    "phase": "2",
                }],
            })
            result = run_script(
                NORMALIZE, batch, "--out", os.path.join(tmp, "out.json"), check=False)
            self.assertEqual(result.returncode, 2)
            self.assertIn("per-item", result.stderr)

    def test_unknown_rule_id_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            batch = {
                "type": "a11y-finding-batch",
                "url": "https://example.test/",
                "source": "agent-review",
                "findings": [{"rule_id": "not-a-real-rule", "location": {"selector": "main"},
                              "description": "x", "impact": "x", "remediation": "x", "phase": "2"}],
            }
            path = self.write(tmp, "batch.json", batch)
            result = run_script(NORMALIZE, path, "--out", os.path.join(tmp, "out.json"), check=False)
            self.assertEqual(result.returncode, 2)
            self.assertIn("unknown rule_id", result.stderr)

    def test_agent_duplicate_of_axe_rule_is_dropped(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = self.write(tmp, "scan.json", AXE_PAGE)
            batch = self.write(tmp, "batch.json", AGENT_BATCH)
            run_script(NORMALIZE, scan, batch, "--out", os.path.join(tmp, "out.json"))
            with open(os.path.join(tmp, "out.json"), encoding="utf-8") as handle:
                report = json.load(handle)
        ids = [f["rule_id"] for f in report["findings"]]
        self.assertEqual(ids.count("image-alt"), 1)
        self.assertIn("link-name-ambiguous", ids)
        ambiguous = next(f for f in report["findings"] if f["rule_id"] == "link-name-ambiguous")
        self.assertEqual(ambiguous["severity"], "moderate")  # catalog, not agent's critical
        self.assertNotIn("line", ambiguous.get("location") or {})

    def test_catalog_version_recorded(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = self.write(tmp, "scan.json", AXE_PAGE)
            with open(os.path.join(tmp, "out.json"), "w"):
                pass
            run_script(NORMALIZE, scan, "--out", os.path.join(tmp, "out.json"))
            report = read_json(os.path.join(tmp, "out.json"))
        self.assertEqual(report["scoring"]["catalogVersion"], "2026-q3")
        self.assertEqual(report["scoring"]["model"], "a11y-severity-scoring-v2")

    def test_catalog_covers_configured_axe_rules(self):
        catalog = read_json(CATALOG)
        configured = set(catalog["scanner"]["axe_rule_ids"])
        self.assertEqual(len(configured), 69)
        self.assertFalse(configured - set(catalog["rules"]))
        self.assertEqual(catalog["scanner"]["axe_core_version"], "4.10.3")
        self.assertEqual(catalog["scanner"]["axe_playwright_version"], "4.10.2")
        self.assertTrue(all(rule.get("check") for rule in catalog["rules"].values()))

    def test_input_order_does_not_change_confidence_or_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            first = self.write(tmp, "first.json", {
                "type": "a11y-finding-batch",
                "url": "https://EXAMPLE.test:443/page",
                "source": "agent-review",
                "phase": "9",
                "findings": [{
                    "rule_id": "link-name-ambiguous",
                    "location": {"selector": "main a:nth-of-type(1)"},
                    "description": "A",
                    "impact": "A",
                    "remediation": "A",
                }],
            })
            second = self.write(tmp, "second.json", {
                "type": "a11y-finding-batch",
                "url": "https://example.test/page",
                "source": "playwright",
                "findings": [{
                    "rule_id": "link-name-ambiguous",
                    "location": {"selector": "main a:nth-of-type(1)"},
                    "description": "B",
                    "impact": "B",
                    "remediation": "B",
                }],
            })
            a = os.path.join(tmp, "a.json")
            b = os.path.join(tmp, "b.json")
            run_script(NORMALIZE, first, second, "--out", a)
            run_script(NORMALIZE, second, first, "--out", b)
            self.assertEqual(read_text(a), read_text(b))
            finding = read_json(a)["findings"][0]
            self.assertEqual(finding["confidence"], "high")
            self.assertEqual(finding["source_count"], 2)

    def test_clean_axe_execution_drops_agent_duplicate(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = self.write(tmp, "scan.json", {
                "url": "https://example.test/",
                "modes": ["axe", "tree", "coverage"],
                "scans": {
                    "axe": {"status": "ok", "violations": []},
                    "tree": {
                        "status": "ok", "h1Count": 1,
                        "skippedHeadingLevels": [], "missingLandmarks": [],
                    },
                    "coverage": {"status": "ok", "notChecked": []},
                },
            })
            batch = self.write(tmp, "batch.json", {
                "type": "a11y-finding-batch",
                "url": "https://example.test/",
                "source": "agent-review",
                "phase": "2",
                "findings": [{
                    "rule_id": "image-alt",
                    "location": {"selector": "img.hero"},
                    "description": "missing alt",
                    "impact": "missing alternative",
                    "remediation": "add alt",
                }],
            })
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, scan, batch, "--out", out)
            report = read_json(out)
            self.assertEqual(report["findings"], [])
            self.assertEqual(
                report["scoring"]["executedSourcesByPage"]["https://example.test/"],
                ["axe", "playwright"],
            )

    def test_code_review_only_keeps_scanner_owned_rule(self):
        with tempfile.TemporaryDirectory() as tmp:
            batch = self.write(tmp, "batch.json", {
                "type": "a11y-finding-batch",
                "url": "component://src/Hero.tsx",
                "source": "agent-review",
                "phase": "2",
                "findings": [{
                    "rule_id": "image-alt",
                    "location": {"file": "src/Hero.tsx:12:5"},
                    "description": "missing alt",
                    "impact": "missing alternative",
                    "remediation": "add alt",
                }],
            })
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, batch, "--out", out)
            report = read_json(out)
            self.assertEqual(len(report["findings"]), 1)
            self.assertEqual(report["findings"][0]["location"]["file"], "src/Hero.tsx")
            self.assertEqual(
                report["scoring"]["reviewedPhasesByPage"]["component://src/Hero.tsx"],
                ["2"],
            )

    def test_tree_findings_are_phase_one_and_landmarks_remain_distinct(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = self.write(tmp, "scan.json", {
                "url": "https://example.test/",
                "modes": ["tree"],
                "scans": {
                    "tree": {
                        "status": "ok",
                        "h1Count": 0,
                        "skippedHeadingLevels": [],
                        "missingLandmarks": ["banner", "main", "contentinfo"],
                    },
                },
            })
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, scan, "--out", out)
            report = read_json(out)
            self.assertEqual(len(report["findings"]), 4)
            self.assertTrue(all(item["phase"] == "1" for item in report["findings"]))
            landmarks = [item for item in report["findings"]
                         if item["rule_id"] == "landmark-missing"]
            self.assertEqual(len(landmarks), 3)

    def test_viewport_targets_are_distinct_playwright_findings(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = self.write(tmp, "scan.json", {
                "url": "https://example.test/",
                "modes": ["keyboard", "viewport"],
                "scans": {
                    "keyboard": {
                        "status": "ok", "keyboardTraps": [], "tabStopCount": 2,
                    },
                    "viewport": {
                        "status": "ok",
                        "reflowFailures": [],
                        "viewports": [{
                            "width": 320,
                            "undersizedTargets": [
                                {
                                    "selector": "main > button:nth-of-type(1)",
                                    "name": "A", "width": 10, "height": 10,
                                },
                                {
                                    "selector": "main > button:nth-of-type(2)",
                                    "name": "B", "width": 10, "height": 10,
                                },
                            ],
                        }],
                    },
                },
            })
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, scan, "--out", out)
            findings = read_json(out)["findings"]
            self.assertEqual(len(findings), 2)
            self.assertTrue(all(item["rule_id"] == "target-size-measured"
                                for item in findings))
            self.assertTrue(all(item["sources"] == ["playwright"]
                                for item in findings))

    def test_lighthouse_alias_does_not_double_axe_confidence(self):
        with tempfile.TemporaryDirectory() as tmp:
            axe = self.write(tmp, "axe.json", AXE_PAGE)
            lighthouse = self.write(tmp, "lighthouse.json", {
                "type": "a11y-finding-batch",
                "url": "https://example.test/",
                "source": "lighthouse-ci",
                "findings": [{
                    "rule_id": "image-alt",
                    "location": {"selector": "img.hero"},
                    "description": "missing alt",
                    "impact": "missing alternative",
                    "remediation": "add alt",
                }],
            })
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, axe, lighthouse, "--out", out)
            finding = next(item for item in read_json(out)["findings"]
                           if item["rule_id"] == "image-alt")
            self.assertEqual(finding["sources"], ["axe", "lighthouse"])
            self.assertEqual(finding["source_count"], 1)

    def test_hash_routes_and_trailing_slashes_remain_distinct(self):
        with tempfile.TemporaryDirectory() as tmp:
            batches = []
            for index, url in enumerate((
                    "https://example.test/#/dashboard",
                    "https://example.test/#/settings",
                    "https://example.test/path",
                    "https://example.test/path/",
            )):
                batches.append(self.write(tmp, f"{index}.json", {
                    "type": "a11y-finding-batch",
                    "url": url,
                    "source": "agent-review",
                    "phase": "2",
                    "findings": [],
                }))
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, *batches, "--out", out)
            self.assertEqual(len(read_json(out)["pages"]), 4)

    def test_ownership_suppression_is_mode_granular(self):
        with tempfile.TemporaryDirectory() as tmp:
            tree = self.write(tmp, "tree.json", {
                "url": "https://example.test/",
                "modes": ["tree"],
                "scans": {
                    "tree": {
                        "status": "ok", "h1Count": 1,
                        "skippedHeadingLevels": [], "missingLandmarks": [],
                    },
                },
            })
            batch = self.write(tmp, "batch.json", {
                "type": "a11y-finding-batch",
                "url": "https://example.test/",
                "source": "agent-review",
                "phase": "3",
                "findings": [
                    {
                        "rule_id": "page-has-heading-one",
                        "location": {"selector": "document"},
                        "description": "missing heading",
                        "impact": "no page topic",
                        "remediation": "add h1",
                    },
                    {
                        "rule_id": "keyboard-trap",
                        "location": {"selector": "#widget"},
                        "description": "possible trap",
                        "impact": "cannot leave",
                        "remediation": "repair keyboard behavior",
                    },
                ],
            })
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, tree, batch, "--out", out)
            ids = [item["rule_id"] for item in read_json(out)["findings"]]
            self.assertNotIn("page-has-heading-one", ids)
            self.assertIn("keyboard-trap", ids)

    def test_scanner_metadata_order_is_stable(self):
        with tempfile.TemporaryDirectory() as tmp:
            phase1 = self.write(tmp, "phase1.json", {
                "url": "https://example.test/",
                "catalogVersion": "2026-q3",
                "axeCoreVersion": "4.10.3",
                "axePlaywrightVersion": "4.10.2",
                "playwrightVersion": "1.63.0",
                "browserVersion": "153",
                "loadDelay": 2000,
                "readiness": {"stabilityWindow": 500, "results": {"axe": ["stable"]}},
                "modes": ["axe", "tree", "coverage"],
                "scans": {
                    "axe": {"status": "ok", "violations": []},
                    "tree": {
                        "status": "ok", "h1Count": 1,
                        "skippedHeadingLevels": [], "missingLandmarks": [],
                    },
                    "coverage": {"status": "ok", "notChecked": []},
                },
            })
            phase10 = self.write(tmp, "phase10.json", {
                "url": "https://example.test/",
                "catalogVersion": "2026-q3",
                "axeCoreVersion": "4.10.3",
                "axePlaywrightVersion": "4.10.2",
                "playwrightVersion": "1.63.0",
                "browserVersion": "153",
                "loadDelay": 2000,
                "readiness": {"stabilityWindow": 500, "results": {"keyboard": ["stable"]}},
                "modes": ["keyboard", "viewport"],
                "scans": {
                    "keyboard": {"status": "ok", "keyboardTraps": []},
                    "viewport": {
                        "status": "ok", "reflowFailures": [], "viewports": [],
                    },
                },
            })
            a = os.path.join(tmp, "a.json")
            b = os.path.join(tmp, "b.json")
            run_script(NORMALIZE, phase1, phase10, "--out", a)
            run_script(NORMALIZE, phase10, phase1, "--out", b)
            self.assertEqual(read_text(a), read_text(b))

    def test_failed_primary_axe_metadata_allows_valid_cli_fallback(self):
        with tempfile.TemporaryDirectory() as tmp:
            primary = self.write(tmp, "primary.json", {
                "url": "https://example.test/",
                "catalogVersion": "2026-q3",
                "axeCoreVersion": "4.11.0",
                "axePlaywrightVersion": "4.11.0",
                "playwrightVersion": "1.63.0",
                "modes": ["axe", "tree", "coverage"],
                "scans": {
                    "axe": {"status": "error", "reason": "version mismatch"},
                    "tree": {
                        "status": "ok", "h1Count": 1,
                        "skippedHeadingLevels": [], "missingLandmarks": [],
                    },
                    "coverage": {"status": "ok", "notChecked": []},
                },
            })
            fallback = self.write(tmp, "fallback.json", [{
                "url": "https://example.test/",
                "testEngine": {"name": "axe-core", "version": "4.10.3"},
                "violations": [],
            }])
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, primary, fallback, "--out", out)
            report = read_json(out)
            self.assertEqual(
                report["scoring"]["executedChecksByPage"]["https://example.test/"],
                ["axe", "coverage", "tree"],
            )

    def test_code_review_only_adds_coverage_gaps(self):
        with tempfile.TemporaryDirectory() as tmp:
            batch = self.write(tmp, "component.json", {
                "type": "a11y-finding-batch",
                "url": "component://src/Button.tsx",
                "source": "agent-review",
                "phase": "2",
                "findings": [],
            })
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, batch, "--out", out)
            report = read_json(out)
            self.assertEqual(report["overall"]["score"], 100)
            self.assertEqual(len(report["coverage"]["not_checked"]), 2)

    def test_multi_page_empty_batches_keep_every_page(self):
        with tempfile.TemporaryDirectory() as tmp:
            one = self.write(tmp, "one.json", {
                "type": "a11y-finding-batch", "url": "component://src/A.tsx",
                "source": "agent-review", "phase": "2", "findings": [],
            })
            two = self.write(tmp, "two.json", {
                "type": "a11y-finding-batch", "url": "component://src/B.tsx",
                "source": "agent-review", "phase": "2", "findings": [],
            })
            out = os.path.join(tmp, "out.json")
            run_script(NORMALIZE, two, one, "--out", out)
            self.assertEqual(
                [page["url"] for page in read_json(out)["pages"]],
                ["component://src/A.tsx", "component://src/B.tsx"],
            )


class StaticReviewTests(unittest.TestCase):
    def test_closed_list_from_inventory(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = os.path.join(tmp, "scan.json")
            out = os.path.join(tmp, "batch.json")
            out2 = os.path.join(tmp, "batch2.json")
            with open(scan, "w", encoding="utf-8") as handle:
                json.dump(SCAN_WITH_INVENTORY, handle)
            run_script(STATIC, scan, "--out", out)
            with open(out, encoding="utf-8") as handle:
                batch = json.load(handle)
            ids = sorted(f["rule_id"] for f in batch["findings"])
            self.assertIn("link-name-ambiguous", ids)
            self.assertIn("alt-text-quality", ids)
            self.assertNotIn("new-tab-unwarned", ids)
            self.assertNotIn("image-alt", ids)
            run_script(STATIC, scan, "--out", out2)
            self.assertEqual(read_text(out), read_text(out2))

    def test_natural_language_names_are_not_code_or_placeholders(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = os.path.join(tmp, "scan.json")
            out = os.path.join(tmp, "batch.json")
            write_json(scan, {
                "url": "https://example.test/",
                "inventory": {
                    "links": [
                        {"selector": "a.phone", "name": "iPhone", "href": "/iphone"},
                        {"selector": "a.results", "name": "Test results", "href": "/results"},
                        {"selector": "a.chart", "name": "Bar chart", "href": "/chart"},
                        {"selector": "a.tpl", "name": "{{title}}", "href": "/t"},
                        {"selector": "a.todo", "name": "todo", "href": "/todo"},
                        {"selector": "a.ident", "name": "user.firstName", "href": "/user"},
                    ],
                    "images": [
                        {"selector": "img.ok", "alt": "iPhone", "src": "/iphone.png"},
                    ],
                },
            })
            run_script(STATIC, scan, "--out", out)
            findings = read_json(out)["findings"]
            by_selector = {
                (item["location"]["selector"], item["rule_id"]): item
                for item in findings
            }
            self.assertNotIn(("a.phone", "accessible-name-quality"), by_selector)
            self.assertNotIn(("a.results", "accessible-name-quality"), by_selector)
            self.assertNotIn(("a.chart", "accessible-name-quality"), by_selector)
            self.assertNotIn(("img.ok", "accessible-name-quality"), by_selector)
            self.assertIn(("a.tpl", "accessible-name-quality"), by_selector)
            self.assertIn(("a.todo", "accessible-name-quality"), by_selector)
            self.assertIn(("a.ident", "accessible-name-quality"), by_selector)


class CompareTests(unittest.TestCase):
    def test_compare_identical_is_zero(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = os.path.join(tmp, "scan.json")
            write_json(scan, AXE_PAGE)
            a = os.path.join(tmp, "a.json")
            b = os.path.join(tmp, "b.json")
            run_script(NORMALIZE, scan, "--out", a)
            run_script(NORMALIZE, scan, "--out", b)
            result = run_script(COMPARE, a, b)
            self.assertEqual(result.returncode, 0)

    def test_compare_detects_only_in_b(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = os.path.join(tmp, "scan.json")
            write_json(scan, AXE_PAGE)
            a = os.path.join(tmp, "a.json")
            b = os.path.join(tmp, "b.json")
            run_script(NORMALIZE, scan, "--out", a)
            extra = {
                "type": "a11y-finding-batch",
                "url": "https://example.test/",
                "source": "agent-review",
                "findings": [{
                    "rule_id": "color-only-meaning",
                    "location": {"file": "src/Status.tsx"},
                    "description": "Error is red only.",
                    "impact": "color-blind users miss it",
                    "remediation": "add text",
                    "phase": "5",
                }],
            }
            extra_path = os.path.join(tmp, "extra.json")
            write_json(extra_path, extra)
            run_script(NORMALIZE, scan, extra_path, "--out", b)
            result = run_script(COMPARE, a, b, check=False)
            self.assertEqual(result.returncode, 1)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["only_in_b"][0]["rule_id"], "color-only-meaning")

    def test_compare_detects_profile_or_score_drift(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = os.path.join(tmp, "scan.json")
            write_json(scan, AXE_PAGE)
            balanced = os.path.join(tmp, "balanced.json")
            strict = os.path.join(tmp, "strict.json")
            run_script(NORMALIZE, scan, "--profile", "balanced", "--out", balanced)
            run_script(NORMALIZE, scan, "--profile", "strict", "--out", strict)
            result = run_script(COMPARE, balanced, strict, check=False)
            self.assertEqual(result.returncode, 1)
            payload = json.loads(result.stdout)
            self.assertIn("profile", payload["metadata_mismatches"])
            self.assertIn("overall", payload["score_mismatches"])

    def test_compare_rejects_duplicate_identities(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = os.path.join(tmp, "scan.json")
            write_json(scan, AXE_PAGE)
            valid = os.path.join(tmp, "valid.json")
            duplicate = os.path.join(tmp, "duplicate.json")
            run_script(NORMALIZE, scan, "--out", valid)
            payload = read_json(valid)
            payload["findings"].append(dict(payload["findings"][0]))
            write_json(duplicate, payload)
            result = run_script(COMPARE, valid, duplicate, check=False)
            self.assertEqual(result.returncode, 2)
            self.assertIn("duplicate finding identity", result.stderr)


class ExportTests(unittest.TestCase):
    def test_clean_page_generates_summary(self):
        with tempfile.TemporaryDirectory() as tmp:
            scan = os.path.join(tmp, "scan.json")
            write_json(scan, {
                "url": "https://example.test/",
                "violations": [],
            })
            findings = os.path.join(tmp, "findings.json")
            run_script(NORMALIZE, scan, "--out", findings)
            run_script(EXPORT, findings, "--format", "summary", "--out-dir", tmp)
            summary = read_text(os.path.join(tmp, "ACCESSIBILITY-AUDIT-summary.md"))
            self.assertIn("100 / 100", summary)
            self.assertIn("No active findings", summary)


class WorkflowContractTests(unittest.TestCase):
    def prompt(self, name):
        return read_text(os.path.join(PACKAGE_ROOT, ".apm", "prompts", name))

    def test_quick_mode_can_write_standard_artifacts(self):
        prompt = self.prompt("a11y-quick-check.prompt.md")
        self.assertIn("- createFile", prompt)
        self.assertIn("$RUN/findings.json", prompt)
        self.assertIn("$RUN/ACCESSIBILITY-AUDIT.md", prompt)
        self.assertIn("scan-axe-page-1.json", prompt)

    def test_component_mode_uses_normalized_batches(self):
        prompt = self.prompt("a11y-component-library-audit.prompt.md")
        self.assertIn("findings-agent-phase-<N>-page-<M>.json", prompt)
        self.assertIn("normalize-findings.py", prompt)
        self.assertIn("$RUN/findings.json", prompt)
        self.assertIn("$RUN/ACCESSIBILITY-AUDIT.md", prompt)

    def test_fix_mode_replays_metadata_and_baseline(self):
        prompt = self.prompt("a11y-fix.prompt.md")
        self.assertIn("scannerMetadata` is a list", prompt)
        self.assertIn("--stability-window", prompt)
        self.assertIn("runner: a11y-scan", prompt)
        self.assertIn("storageState", prompt)
        self.assertIn("loadDelay", prompt)
        self.assertIn("--baseline $BASELINE", prompt)
        self.assertIn("reviewedPhasesByPage", prompt)

    def test_domain_skills_do_not_share_batch_path(self):
        skills_root = os.path.join(PACKAGE_ROOT, ".apm", "skills")
        offenders = []
        for directory in os.listdir(skills_root):
            path = os.path.join(skills_root, directory, "SKILL.md")
            if os.path.isfile(path) and "$SCRATCH/findings-agent.json" in read_text(path):
                offenders.append(directory)
        self.assertEqual(offenders, [])


if __name__ == "__main__":
    unittest.main()
