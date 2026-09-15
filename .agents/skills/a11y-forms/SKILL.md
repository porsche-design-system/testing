---
name: a11y-forms
description: "Forms, labels, validation, errors, and multi-step wizards for accessibility audits."
user-invocable: false
---

# A11y Forms

## Audit phase role

The `a11y-audit` agent owns phase numbering. During a phased site audit, this skill runs only in **Phase 4 (Forms)** after Phase 3 has a terminal status. Complete one pass: apply the checklist, return findings, and stop. Do not start another phase.

Use this skill during accessibility audits when reviewing the related domain. Apply the checklist below and return structured findings (description, severity, WCAG criterion, impact, location, confidence, recommended fix).

## Authoritative Sources

- **WCAG 2.2 - Input Assistance** — https://www.w3.org/WAI/WCAG22/Understanding/input-assistance
- **WCAG 3.3.2 Labels or Instructions** — https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html
- **WCAG 1.3.5 Identify Input Purpose** — https://www.w3.org/WAI/WCAG22/Understanding/identify-input-purpose.html
- **HTML Living Standard - Forms** — https://html.spec.whatwg.org/multipage/forms.html
- **WAI-ARIA 1.2 Specification** — https://www.w3.org/TR/wai-aria-1.2/

This skill is a checklist module for `a11y-audit` covering form accessibility. Forms are where users give their data -- their name, their payment info, their identity. A broken form means a blocked user. Ensure every form is fully accessible, from simple login screens to complex multi-step wizards.

## Your Scope

You own everything related to form accessibility:
- Input labeling and association
- Error handling and validation feedback
- Required field indication
- Form grouping and fieldsets
- Autocomplete attributes
- Multi-step forms and wizards
- Search forms
- Date and time pickers
- File uploads
- Custom form controls (toggles, star ratings, etc.)
- Form submission feedback
- Password fields and visibility toggles

## Validation Checklist

1. Does every input have a programmatically associated label?
2. Are required fields indicated with `required` attribute and visible indicator?
3. Do error messages identify the specific problem and how to fix it?
4. Are errors linked to fields via `aria-describedby`?
5. Does `aria-invalid="true"` appear on fields with errors?
6. Does focus move to error summary or first error on submit?
7. Are related inputs grouped with `<fieldset>` and `<legend>`?
8. Do inputs have appropriate `autocomplete` attributes?
9. Can the entire form be completed by keyboard alone?
10. Are password show/hide toggles accessible buttons?
11. Are file upload constraints described and status announced?
12. For multi-step forms: does focus move to each step heading?
13. Are custom controls (toggles, ratings) built with proper ARIA?
14. Are inline validation messages announced without disrupting input?
15. Is the submit button a `<button type="submit">` (not a link or div)?

## Common Mistakes You Must Catch

- `placeholder` used as the only label (disappears on input, poor contrast)
- Error messages not associated with `aria-describedby`
- Missing `aria-invalid` on error fields
- Radio/checkbox groups without `<fieldset>` and `<legend>`
- Custom styled inputs that lose native keyboard behavior
- Submit button is a `<div>` or `<a>` instead of `<button>`
- No focus management on validation errors (user doesn't know errors exist)
- Autocomplete attributes missing on identity/payment fields
- Required fields indicated only by asterisk color
- Validation on every keystroke creating screen reader noise
- `disabled` used when `aria-disabled` would be more appropriate
- Tab order broken by CSS positioning that differs from DOM order

## How to Report Issues

For each finding:
- File path and line number
- Which form control is affected
- What the screen reader experience would be
- The specific WCAG criterion violated
- Code fix with corrected markup


## Progressive disclosure

Read only the reference files needed for the current page/features. Do not load every reference by default.

- [Labels and grouping](references/labels-and-grouping.md) — label association, help text, required, fieldset/legend
- [Errors and autocomplete](references/errors-and-autocomplete.md) — validation errors, error summary, autocomplete attributes
- [Control types](references/control-types.md) — select, checkbox/radio, password, file upload, search, date/time
- [Wizards and advanced patterns](references/wizards-and-patterns.md) — multi-step forms, combobox, accessible auth, redundant entry, custom controls
- [Structured output templates](references/structured-output.md) — formatting findings for the audit report

