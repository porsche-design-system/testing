---
name: a11y-lighthouse
description: Integrate Lighthouse CI accessibility audits. Detects configuration, parses results, maps findings to severity model, and tracks score regressions.
user-invocable: false
---

# Lighthouse CI Accessibility Integration

## Audit phase role

The `a11y-audit` agent owns phase numbering. Detect Lighthouse CI in **Phase 0**. Run or correlate Lighthouse only in **Phase 1**, and only after the axe-core baseline has finished. Return findings and stop; do not start domain review.

## What Is Lighthouse CI?

[Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) is a suite of tools for running Google Lighthouse audits in CI pipelines. The most common GitHub Actions integration uses [`treosh/lighthouse-ci-action`](https://github.com/treosh/lighthouse-ci-action).

Lighthouse provides:

- Performance, accessibility, best practices, and SEO scoring (0-100)
- Individual audit results with pass/fail status and detailed findings
- Score budgets and assertions to fail builds on regressions
- HTML and JSON report artifacts
- Score comparison across runs for trend tracking

**Accessibility focus:** The Lighthouse accessibility category runs a subset of axe-core rules and reports a weighted score from 0-100 along with individual audit violations.

## Detecting Lighthouse CI Presence

### Workflow File Detection

Search for workflow files referencing Lighthouse CI:

```bash
# Search for the treosh Lighthouse CI action
grep -rl "treosh/lighthouse-ci-action" .github/workflows/

# Search for official Lighthouse CI CLI usage
grep -rl "lhci autorun\|lighthouse-ci" .github/workflows/
```

**Patterns to match in YAML:**

```yaml
- uses: treosh/lighthouse-ci-action@v12
```

### Configuration File Detection

Lighthouse CI uses configuration files in the repository root:

```bash
# Check for Lighthouse CI config files
ls lighthouserc.js lighthouserc.json .lighthouserc.js .lighthouserc.json .lighthouserc.yml 2>/dev/null
```

| Config File | Format |
|------------|--------|
| `lighthouserc.js` | JavaScript module |
| `lighthouserc.json` | JSON |
| `.lighthouserc.js` | JavaScript module (dotfile) |
| `.lighthouserc.json` | JSON (dotfile) |
| `.lighthouserc.yml` | YAML (dotfile) |

### Configuration Structure

Key fields in Lighthouse CI config:

```json
{
  "ci": {
    "collect": {
      "url": ["https://example.com", "https://example.com/about"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:accessibility": ["error", {"minScore": 0.9}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

| Section | Purpose | Agent Use |
|---------|---------|-----------|
| `ci.collect.url` | URLs to audit | Scope of CI scanning |
| `ci.collect.numberOfRuns` | How many times to run each URL | Reliability indicator |
| `ci.assert.assertions` | Score budgets and thresholds | Regression detection |
| `ci.upload.target` | Where to store reports | Report retrieval |

## Parsing Lighthouse Accessibility Results

### Accessibility Score

Lighthouse computes a weighted accessibility score from 0-100 based on individual audit results.

| Score Range | Grade | Interpretation |
|-------------|-------|---------------|
| 90-100 | A | Good accessibility |
| 70-89 | B-C | Some issues to address |
| 50-69 | D | Significant issues |
| 0-49 | F | Critical accessibility failures |

### Individual Audit Results

Each Lighthouse accessibility audit corresponds to an axe-core rule:

| Audit ID | axe-core Rule | WCAG Criterion | Weight |
|----------|--------------|----------------|--------|
| `image-alt` | `image-alt` | 1.1.1 | 10 |
| `color-contrast` | `color-contrast` | 1.4.3 | 7 |
| `label` | `label` | 1.3.1 | 7 |
| `button-name` | `button-name` | 4.1.2 | 7 |
| `link-name` | `link-name` | 2.4.4 | 7 |
| `html-has-lang` | `html-has-lang` | 3.1.1 | 7 |
| `document-title` | `document-title` | 2.4.2 | 7 |
| `heading-order` | `heading-order` | 1.3.1 | 3 |
| `meta-viewport` | `meta-viewport` | 1.4.4 | 10 |
| `bypass` | `bypass` | 2.4.1 | 7 |
| `tabindex` | `tabindex` | 2.4.3 | 7 |
| `aria-allowed-attr` | `aria-allowed-attr` | 4.1.2 | 10 |
| `aria-hidden-body` | `aria-hidden-body` | 4.1.2 | 10 |
| `aria-required-attr` | `aria-required-attr` | 4.1.2 | 10 |
| `aria-roles` | `aria-roles` | 4.1.2 | 7 |
| `aria-valid-attr-value` | `aria-valid-attr-value` | 4.1.2 | 7 |
| `aria-valid-attr` | `aria-valid-attr` | 4.1.2 | 10 |

### Severity Mapping

Lighthouse uses weights rather than impact levels. Map to the agent severity model based on weight and audit pass/fail:

| Lighthouse Weight | Audit Status | Agent Severity |
|------------------|-------------|---------------|
| 10 | Fail | Critical |
| 7 | Fail | Serious |
| 3 | Fail | Moderate |
| 1 | Fail | Minor |
| Any | Pass | N/A (not reported) |

## Correlation with Local Scans

### Lighthouse-to-axe-core Mapping

Since Lighthouse uses axe-core under the hood, correlation is straightforward:

1. **Match by audit/rule ID:** Lighthouse audit IDs correspond directly to axe-core rule IDs
2. **Match by URL:** Compare scanned URLs from Lighthouse config with local scan targets
3. **Correlate without double-counting:** Lighthouse accessibility findings use
   axe-core, so a local axe match shares identity but does not add an
   independent confidence source

### Source Comparison

| Scenario | Interpretation | Action |
|----------|---------------|--------|
| Found by Lighthouse AND local scan | High confidence | Report as high confidence, full severity weight |
| Found by Lighthouse only | Environment-specific | Report as medium confidence, note "CI-only finding" |
| Found by local scan only | Not covered by Lighthouse subset | Report as medium confidence, note "local-only finding" |
| Lighthouse score regressed | New accessibility issues introduced | Flag as regression, prioritize in report |

## Score Regression Detection

Track Lighthouse accessibility scores across runs to detect regressions:

### Comparing Scores

```json
{
  "url": "https://example.com",
  "previousScore": 95,
  "currentScore": 87,
  "delta": -8,
  "status": "regressed",
  "newFailures": ["color-contrast", "image-alt"],
  "newPasses": []
}
```

### Regression Thresholds

| Delta | Severity | Action |
|-------|----------|--------|
| Score drops 10+ points | Critical | Immediate attention, likely multiple new violations |
| Score drops 5-9 points | Serious | New violations introduced, review before merge |
| Score drops 1-4 points | Moderate | Minor regression, track for follow-up |
| Score unchanged or improved | N/A | No regression detected |

## Structured Output Format

Scored Lighthouse findings use the finding-batch contract. The orchestrator
writes `$SCRATCH/findings-lighthouse-page-<N>.json`:

```json
{
  "type": "a11y-finding-batch",
  "url": "https://example.com/login",
  "source": "lighthouse",
  "phase": "1",
  "findings": [
    {
      "rule_id": "color-contrast",
      "location": {"selector": "button.submit-btn"},
      "description": "Element has insufficient color contrast ratio",
      "impact": "Low-vision users may not read the control text.",
      "remediation": "Increase contrast to at least 4.5:1 for text.",
      "phase": "1"
    }
  ]
}
```

Keep Lighthouse score deltas in the chat/regression summary. They are not
scored findings.

## GitHub Actions Integration

### treosh/lighthouse-ci-action

The most common Lighthouse CI GitHub Action:

```yaml
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v12
  with:
    urls: |
      https://example.com
      https://example.com/about
    uploadArtifacts: true
    configPath: ./lighthouserc.json
```

### Action Inputs

| Input | Required | Description |
|-------|----------|-------------|
| `urls` | Yes (or in config) | Newline-separated URLs to audit |
| `configPath` | No | Path to Lighthouse CI config file |
| `uploadArtifacts` | No | Upload HTML reports as workflow artifacts |
| `temporaryPublicStorage` | No | Upload to temporary public storage for sharing |
| `runs` | No | Number of runs per URL (default: 1) |
| `budgetPath` | No | Path to a Lighthouse budget JSON file |

### Extracting Results from Artifacts

Lighthouse CI uploads results as workflow artifacts. To retrieve scores:

1. Download the artifact from the workflow run
2. Parse the JSON report files
3. Extract `categories.accessibility.score` for the overall score
4. Extract individual `audits.{audit-id}` results for violations

## Lighthouse Bridge Procedures (from bridge)

## Authoritative Sources

- **Lighthouse Accessibility Audits** — https://github.com/GoogleChrome/lighthouse/tree/main/core/audits/accessibility
- **Lighthouse CI** — https://github.com/GoogleChrome/lighthouse-ci
- **axe-core Rules** — https://github.com/dequelabs/axe-core/tree/develop/lib/rules
- **WCAG 2.2 Specification** — https://www.w3.org/TR/WCAG22/

This skill is a procedure module for `a11y-audit`. It connects CI-level Lighthouse accessibility audit data with the accessibility audit pipeline. This skill does not edit source files; return structured findings. It never modifies issues, PRs, or source code.

**Skills:** [`a11y-lighthouse`](../a11y-lighthouse/SKILL.md), [`a11y-severity-scoring`](../../../apm_modules/porsche-design-system/skills/packages/web-accessibility-audit/.apm/skills/a11y-severity-scoring/SKILL.md) (help URLs: [`references/help-urls.md`](../../../apm_modules/porsche-design-system/skills/packages/web-accessibility-audit/.apm/skills/a11y-severity-scoring/references/help-urls.md))

**Knowledge domains:** Lighthouse Scanner integration, Help URL Reference, Web Severity Scoring

---

## Capabilities

### 1. Detect Lighthouse CI Configuration

Search the repository for Lighthouse CI workflows and config files:

1. Look for `.github/workflows/*.yml` files containing `treosh/lighthouse-ci-action` or `lhci autorun`
2. Check for config files: `lighthouserc.js`, `lighthouserc.json`, `.lighthouserc.js`, `.lighthouserc.json`, `.lighthouserc.yml`
3. If found, extract the configuration:
   - `urls` -- the list of URLs being audited
   - `numberOfRuns` -- how many times each URL is tested
   - `assertions` -- score budgets and thresholds (especially `categories:accessibility`)
   - `uploadTarget` -- where reports are stored
4. Return a structured detection result:

```json
{
  "lighthouseDetected": true,
  "workflowFile": ".github/workflows/lighthouse.yml",
  "configFile": "lighthouserc.json",
  "urls": ["https://example.com", "https://example.com/about"],
  "numberOfRuns": 3,
  "accessibilityThreshold": 0.9,
  "uploadTarget": "temporary-public-storage"
}
```

If no Lighthouse CI setup is found, return `{"lighthouseDetected": false}`.

### 2. Parse Lighthouse Reports

When Lighthouse CI reports are available (as workflow artifacts or in temporary storage):

1. Extract the overall accessibility score (0-100)
2. Extract individual audit results from the `accessibility` category
3. For each failing audit:
   - Audit ID (maps to axe-core rule ID)
   - Description and help text
   - Affected elements (CSS selectors and HTML snippets)
   - WCAG criterion
   - Lighthouse weight (context only; catalog owns severity)

### 3. Normalize Findings

Convert each failing Lighthouse accessibility audit into a shared finding
batch. Omit severity, confidence, and WCAG — `normalize-findings.py` overwrites
those from the catalog. Extra Lighthouse fields may stay on the finding but are
not scored.

```json
{
  "type": "a11y-finding-batch",
  "url": "{audited-url}",
  "source": "lighthouse",
  "phase": "1",
  "findings": [
    {
      "rule_id": "{catalog-rule-id}",
      "location": {"selector": "{css-selector}"},
      "description": "{audit-description}",
      "impact": "{user-impact}",
      "remediation": "{fix-guidance}",
      "phase": "1"
    }
  ]
}
```

Write that batch to `$SCRATCH/findings-lighthouse-page-<N>.json`. Skip any
Lighthouse audit id that is not in the rule catalog. Lighthouse's own 0–100
score is context only; it is not the audit score. Lighthouse weight does not
set severity.

### 4. Track Score Regressions

Compare current Lighthouse accessibility scores against previous runs:

1. Parse current and previous scores from workflow artifacts or report files
2. Calculate delta for each URL
3. Classify the change:

| Delta | Status | Severity |
|-------|--------|----------|
| Score drops 10+ points | `regressed-critical` | Critical |
| Score drops 5-9 points | `regressed-serious` | Serious |
| Score drops 1-4 points | `regressed-moderate` | Moderate |
| Score unchanged | `stable` | N/A |
| Score improved | `improved` | N/A |

4. Return regression summary:

```json
{
  "regressions": [
    {
      "url": "https://example.com",
      "previousScore": 95,
      "currentScore": 87,
      "delta": -8,
      "status": "regressed-serious",
      "newFailures": ["color-contrast", "image-alt"],
      "newPasses": ["html-has-lang"]
    }
  ]
}
```

### 5. Deduplicate Against Local Scans

When local axe-core scan results are provided, correlate with Lighthouse findings:

1. **Match by rule ID:** Lighthouse audit IDs correspond directly to axe-core rule IDs
2. **Match by URL:** Compare audited URLs
3. **Classify findings:** Pass the Lighthouse batch into the same
   `normalize-findings.py` call as the axe scan. Axe and Lighthouse count as
   one confidence family; do not invent a second score.

### 6. Generate Summary

Produce a structured summary for the calling agent:

```json
{
  "lighthouseDetected": true,
  "overallScore": 87,
  "previousScore": 95,
  "scoreDelta": -8,
  "totalFindings": 8,
  "bySeverity": {
    "critical": 1,
    "serious": 3,
    "moderate": 3,
    "minor": 1
  },
  "regressionStatus": "regressed-serious",
  "findings": [...],
  "scoreHistory": [...]
}
```

---

## Behavioral Rules

1. **Read-only** -- Never creates, edits, or closes issues/PRs. Only reads reports and returns data.
2. **Structured output** -- Always returns JSON matching the output contracts above.
3. **Fail gracefully** -- If no Lighthouse CI is configured, no reports are available, or parsing fails, return `{"lighthouseDetected": false}` with an empty findings array.
4. **Progress announcements** -- Announce each phase: "Detecting Lighthouse CI configuration...", "Parsing Lighthouse reports...", "Correlating with local scan results..."
5. **No user interaction** -- Never prompts the user. Works silently as a subagent.
6. **Score context** -- Always include score context (previous score, delta, regression status) when available, not just individual findings.

