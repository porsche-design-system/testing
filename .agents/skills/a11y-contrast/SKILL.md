---
name: a11y-contrast
description: "Color contrast, themes, focus indicators, and visual accessibility for audits."
user-invocable: false
---

# A11y Contrast

## Audit phase role

The `a11y-audit` agent owns phase numbering. During a phased site audit, this skill runs only in **Phase 5 (Visual)** after Phase 4 has a terminal status. Complete one pass: apply the checklist, return findings, and stop. Do not start another phase. Do not reimplement axe-core contrast measurements from Phase 1.

Use this skill during accessibility audits when reviewing the related domain. Apply the checklist below and return structured findings (description, severity, WCAG criterion, impact, location, confidence, recommended fix).

## Authoritative Sources

- **WCAG 1.4.3 Contrast Minimum** — https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **WCAG 1.4.11 Non-text Contrast** — https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- **WCAG 2.4.13 Focus Appearance** — https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- **WebAIM Contrast Checker** — https://webaim.org/resources/contrastchecker/
- **CSS Color Module Level 4** — https://www.w3.org/TR/css-color-4/

This skill is a checklist module for `a11y-audit` covering color contrast and visual accessibility. Color choices determine whether people can read an interface. Ensure every color combination meets WCAG AA standards and that visual design never excludes users.

## Your Scope

You own everything visual that affects readability and perception:
- Text color contrast ratios
- UI component contrast (borders, icons, focus indicators)
- Color-only information (status indicators, errors, charts)
- Dark mode and theme implementation
- Focus indicator visibility
- Animation and motion safety
- User preference media queries (`prefers-*` and `forced-colors`)

## WCAG AA Contrast Requirements

These ratios are the minimum. Meeting them is mandatory, not aspirational.

### Text Contrast (4.5:1 minimum)
- Normal text (under 18px or under 14px bold): 4.5:1 against background
- This applies to all text including placeholders, captions, timestamps, and secondary text
- "It's just a caption" is not an excuse for low contrast

### Large Text Contrast (3:1 minimum)
- Large text (18px+ or 14px+ bold): 3:1 against background
- Headings often qualify as large text but verify the actual rendered size

### Non-Text Contrast (3:1 minimum)
- UI components: buttons, inputs, checkboxes, toggles, cards
- The component boundary must have 3:1 against adjacent colors
- Focus indicators must have 3:1 against both the component and surrounding background
- Icons that convey meaning (not decorative) need 3:1

## Scored findings

Return catalog-valid finding objects to `a11y-audit`; do not write a shared batch file. The orchestrator writes immutable `$SCRATCH/findings-agent-phase-<N>-page-<M>.json` batches. **May emit:** `color-only-meaning`, `prefers-reduced-motion`. Never emit `color-contrast` or measured ratios — axe-core owns contrast.

## Validation Checklist

1. Scanner-owned (`color-contrast`) — do not emit text contrast failures.
2. Scanner-owned (`color-contrast`) — do not emit UI contrast failures that axe already reports.
3. Emit `color-only-meaning` when status/error/required is color-only (no text or icon).
4. Focus indicators visible with 3:1 contrast against adjacent colors (1.4.11)?
5. Focus indicators meet 2.4.13 Focus Appearance: 2px perimeter minimum, 3:1 change-of-contrast between focused and unfocused states?
6. Links distinguishable from surrounding text without color?
7. Emit `prefers-reduced-motion` when decorative motion has no reduced-motion fallback.
8. Dark mode colors re-checked (not just inverted)?
9. Placeholder text meets contrast requirements?
10. Disabled states are still distinguishable (even if interaction is blocked)?
11. Error states use text and/or icons, not just red?
12. `prefers-contrast: more` -- subtle colors upgraded, transparency removed?
13. `prefers-color-scheme: dark` -- all ratios verified in dark mode?
14. `forced-colors: active` -- custom controls still visible? SVGs use `currentColor`?
15. `prefers-reduced-transparency` -- frosty/translucent backgrounds have solid fallback?
16. Combined preferences tested (e.g., dark + high contrast)?
17. Scanner-owned (`target-size`) — do not emit target-size failures.
18. Content not clipped or lost with text spacing overrides (1.4.12)? Prose only unless a catalog rule applies.
19. Scanner-owned (`reflow`) — do not emit reflow failures.

## Measuring, not estimating

Never report a contrast ratio you estimated by eye or from memory. Two tools cover it:

```bash
# Declared colour pairs from CSS or design tokens
python3 scripts/contrast.py "#767676" "#ffffff" --suggest
python3 scripts/contrast.py --batch pairs.json

# Rendered axe contrast checks after the CSS cascade, when a URL exists
node <a11y-playwright>/scripts/a11y-scan.mjs --url <URL> --mode axe
```

Check both when you can. Token-level checks catch bad palette decisions; rendered checks catch elements that inherit an unexpected background. Items 17 and 19 in the checklist (target size, reflow) are measured by the Playwright scanner's `viewport` mode.

## Progressive disclosure

Read only the reference files needed for the current page/features. Do not load every reference by default.

- [Checking contrast and color independence](references/checking-and-color-independence.md) — running contrast checks; color-only information
- [Focus, themes, motion, preferences](references/focus-themes-motion.md) — focus indicators, dark mode, animation, prefers-* queries
- [WCAG 2.2 visual requirements and Tailwind](references/wcag22-and-tailwind.md) — WCAG 2.2 visual SC detail or Tailwind-specific guidance
- [Scored findings](references/structured-output.md) — catalog `rule_id` values and JSON batch contract

