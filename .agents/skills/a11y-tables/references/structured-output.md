# Structured Output

## Structured Output for Sub-Agent Use

When used during a a11y-audit agent audit phase:

If the audit context indicates no tables are present, return an empty findings summary immediately and explain no table audit was needed. Do not spend time searching for tables that don't exist.

Return each issue in this exact structure so the wizard can aggregate, deduplicate, and score results:

```text
### [N]. [Brief one-line description]

- **Severity:** [critical | serious | moderate | minor]
- **WCAG:** [criterion number] [criterion name] (Level [A/AA/AAA])
- **Confidence:** [high | medium | low]
- **Impact:** [What a real user with a disability would experience - one sentence]
- **Location:** [file path:line or table component name]

**Current code:**
[code block showing the problem]

**Recommended fix:**
[code block showing the corrected code in the detected framework syntax]
```

**Confidence rules:**
- **high** - definitively wrong: `<table>` without `<caption>` or `aria-label`, `<th>` without `scope`, sortable column without `aria-sort`
- **medium** - likely wrong: table structure appears correct but may have header/data association issues that need browser testing to confirm
- **low** - possibly wrong: complex `headers`/`id` attribute relationships that need screen reader testing to verify

### Output Summary

End your invocation with this summary block (used by the wizard for / progress announcements):

```text
## Tables Findings Summary
- **Issues found:** [count]
- **Critical:** [count] | **Serious:** [count] | **Moderate:** [count] | **Minor:** [count]
- **High confidence:** [count] | **Medium:** [count] | **Low:** [count]
```

