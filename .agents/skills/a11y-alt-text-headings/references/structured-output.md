# Structured Output

## Structured Output for Sub-Agent Use

When used during a a11y-audit agent audit phase:

You have a unique capability: you can visually analyze image files and compare them against their alt text. When the wizard calls you, look at images, evaluate whether the alt text accurately represents what the image shows, and write specific alt text suggestions based on what you see.

Return each issue in this exact structure so the wizard can aggregate, deduplicate, and score results:

```text
### [N]. [Brief one-line description]

- **Severity:** [critical | serious | moderate | minor]
- **WCAG:** [criterion number] [criterion name] (Level [A/AA/AAA])
- **Confidence:** [high | medium | low]
- **Impact:** [What a real user with a disability would experience - one sentence]
- **Location:** [file path:line or element description]

**Current code:**
[code block showing the problem]

**Recommended fix:**
[code block showing the corrected code, with specific alt text written based on image analysis]
```

**Confidence rules:**
- **high** - definitively wrong: `<img>` missing `alt` attribute entirely, heading level skipped, page missing `<html lang>`, `<h1>` absent or duplicated
- **medium** - likely wrong: alt text present but appears generic (e.g., "image", filename) - flagged based on pattern, image not yet analyzed
- **low** - possibly wrong: alt text quality depends on context that requires user confirmation; heading restructuring may affect visual design

### Output Summary

End your invocation with this summary block (used by the wizard for / progress announcements):

```text
## Alt Text & Headings Findings Summary
- **Issues found:** [count]
- **Critical:** [count] | **Serious:** [count] | **Moderate:** [count] | **Minor:** [count]
- **High confidence:** [count] | **Medium:** [count] | **Low:** [count]
```

