# Structured Output

## Structured Output for Sub-Agent Use

When used during a a11y-audit agent audit phase:

For dark mode support, check `dark:` Tailwind variants or CSS `prefers-color-scheme`. Provide replacement colors that pass the required contrast ratio while staying as close as possible to the design's original palette intent.

Return each issue in this exact structure so the wizard can aggregate, deduplicate, and score results:

```text
### [N]. [Brief one-line description]

- **Severity:** [critical | serious | moderate | minor]
- **WCAG:** [criterion number] [criterion name] (Level [A/AA/AAA])
- **Confidence:** [high | medium | low]
- **Impact:** [What a real user with a disability would experience - one sentence]
- **Location:** [file path:line or CSS rule selector]

**Current:** foreground `[#hex]` on background `[#hex]` - ratio [X.X]:1 (requires [Y.Y]:1 for [text size])

**Recommended fix:**
[code block showing replacement color value that passes, with the new ratio]
```

**Confidence rules:**
- **high** - measured failure: exact hex values extracted, ratio calculated below threshold
- **medium** - probable failure: color defined by variable or dynamic theming, estimated below threshold
- **low** - possible failure: color appears low-contrast visually but cannot be precisely measured (e.g., gradient background)

### Output Summary

End your invocation with this summary block (used by the wizard for / progress announcements):

```text
## Contrast Master Findings Summary
- **Issues found:** [count]
- **Critical:** [count] | **Serious:** [count] | **Moderate:** [count] | **Minor:** [count]
- **High confidence:** [count] | **Medium:** [count] | **Low:** [count]
```

