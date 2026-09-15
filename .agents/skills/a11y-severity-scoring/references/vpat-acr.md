# VPAT / ACR Export

Load this reference only when the user asks for a VPAT, an Accessibility Conformance Report, or procurement-facing conformance documentation. A normal audit report does not need it.

## What a VPAT is, and what this produces

A VPAT (Voluntary Product Accessibility Template) is the industry form; the filled-in document is an **ACR** (Accessibility Conformance Report). The authoritative templates come from ITI and should be downloaded for a formal submission:

- [ITI VPAT templates](https://www.itic.org/policy/accessibility/vpat) — WCAG, Section 508, EN 301 549, and international editions
- [EN 301 549](https://www.etsi.org/deliver/etsi_en/301500_301599/301549/) — European accessibility requirements

What you produce here is a **draft ACR body derived from audit findings**. State this explicitly in the output: it is an evidence-backed draft for a human accessibility specialist to review and sign, not a legally attested conformance claim. Never state a conformance level the audit did not actually test.

## Conformance vocabulary

Use only these four values — they are fixed by the VPAT specification:

| Value | Meaning |
|-------|---------|
| Supports | No findings against this criterion in the audited scope |
| Partially Supports | Some functionality conforms; at least one finding exists |
| Does Not Support | The majority of functionality fails this criterion |
| Not Applicable | The criterion does not apply to the audited scope |

`Not Evaluated` is permitted only for criteria outside the audited scope, and every such row must say why in the remarks.

## Mapping findings to rows

For each WCAG criterion in the target standard:

1. Collect every finding whose `wcag` field matches the criterion.
2. No findings and the criterion was in scope → **Supports**.
3. Findings exist but conforming instances also exist → **Partially Supports**.
4. Findings exist and no conforming instance was observed → **Does Not Support**.
5. The criterion's content type is absent (no video, no tables) → **Not Applicable**, and say so in remarks.
6. The criterion was not tested (phase skipped, page out of scope) → **Not Evaluated**, naming the gap.

Remarks must cite concrete evidence: the finding count, affected pages or components, and the severity mix. Procurement reviewers judge the remarks column far more than the level column.

## Output table

```markdown
## WCAG 2.2 Level A and AA

| Criterion | Level | Conformance Level | Remarks and Explanations |
|-----------|-------|-------------------|--------------------------|
| 1.1.1 Non-text Content | A | Partially Supports | 3 findings (1 critical, 2 moderate): hero images on /, /about lack alt text. Icon buttons in the nav are correctly labelled. |
| 1.3.1 Info and Relationships | A | Supports | No findings across 4 audited pages. |
| 1.2.2 Captions (Prerecorded) | A | Not Applicable | No prerecorded audio or video in the audited scope. |
| 2.4.7 Focus Visible | AA | Does Not Support | 12 findings: global `outline: none` in styles/base.css removes all focus indicators. |
```

## Required header block

Every ACR draft opens with:

```markdown
# Accessibility Conformance Report

**Product:** [name and version]
**Report date:** [YYYY-MM-DD]
**Standards evaluated:** WCAG [version] Level [A / AA / AAA]
**Evaluation methods:** [axe-core CLI, agent code review, Playwright behavioural testing — list only what actually ran]
**Scope:** [pages, components, or routes audited]
**Not evaluated:** [anything excluded, and why]
**Prepared by:** a11y-audit (automated draft — requires specialist review before publication)
```

The **Not evaluated** line is mandatory. An ACR that hides its gaps is worse than no ACR.

## Ordering

List criteria in numerical order within each level, Level A before Level AA before Level AAA. Include every criterion of the target level, including the ones that pass — a table showing only failures is not a valid ACR.
