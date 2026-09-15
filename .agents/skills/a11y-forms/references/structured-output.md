# Structured Output

## Structured Output for Sub-Agent Use

When used during a a11y-audit agent audit phase:

Provide framework-specific code fixes. For React, use `htmlFor` (not `for`). For Angular, use `[attr.aria-describedby]`. For Vue, use standard HTML attributes. For controlled inputs, show the state management pattern.

Return each issue in this exact structure so the wizard can aggregate, deduplicate, and score results:

```text
### [N]. [Brief one-line description]

- **Severity:** [critical | serious | moderate | minor]
- **WCAG:** [criterion number] [criterion name] (Level [A/AA/AAA])
- **Confidence:** [high | medium | low]
- **Impact:** [What a real user with a disability would experience - one sentence]
- **Location:** [file path:line or component name]

**Current code:**
[code block showing the problem]

**Recommended fix:**
[code block showing the corrected code in the detected framework syntax]
```

**Confidence rules:**
- **high** - definitively wrong: input with no label association, error message with no `aria-describedby`, required field with no `required` attribute
- **medium** - likely wrong: label and input appear visually associated but lack programmatic link, placeholder-only label suspected
- **low** - possibly wrong: custom form control pattern may have accessible equivalent not visible in static analysis

### Output Summary

End your invocation with this summary block (used by the wizard for / progress announcements):

```text
## Forms Findings Summary
- **Issues found:** [count]
- **Critical:** [count] | **Serious:** [count] | **Moderate:** [count] | **Minor:** [count]
- **High confidence:** [count] | **Medium:** [count] | **Low:** [count]
```

