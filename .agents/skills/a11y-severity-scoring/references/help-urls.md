# Help URL Reference

Centralized mapping of accessibility rule IDs and WCAG criteria to external help documentation. Used by CSV reporters, audit report generators, and any agent that links findings to remediation guidance.

## Accessibility Insights (Web Accessibility)

### axe-core Rule URL Pattern

```text
Base URL: https://accessibilityinsights.io/info-examples/web/
Pattern:  {base_url}{rule-id}
Example:  https://accessibilityinsights.io/info-examples/web/image-alt/
```

For any axe-core rule, construct the URL by appending the rule ID to the base URL. This pattern covers all axe-core rules.

### Common axe-core Rules

| Rule ID | Issue | WCAG | Help URL |
|---------|-------|------|---------------|
| `image-alt` | Image missing alternative text | 1.1.1 | `https://accessibilityinsights.io/info-examples/web/image-alt/` |
| `button-name` | Button has no accessible name | 4.1.2 | `https://accessibilityinsights.io/info-examples/web/button-name/` |
| `color-contrast` | Text has insufficient contrast | 1.4.3 | `https://accessibilityinsights.io/info-examples/web/color-contrast/` |
| `label` | Form element has no label | 1.3.1 | `https://accessibilityinsights.io/info-examples/web/label/` |
| `link-name` | Link has no discernible text | 4.1.2 | `https://accessibilityinsights.io/info-examples/web/link-name/` |
| `html-has-lang` | Page missing lang attribute | 3.1.1 | `https://accessibilityinsights.io/info-examples/web/html-has-lang/` |
| `document-title` | Page missing title | 2.4.2 | `https://accessibilityinsights.io/info-examples/web/document-title/` |
| `heading-order` | Heading levels skipped | 1.3.1 | `https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html` |
| `aria-roles` | Invalid ARIA role | 4.1.2 | `https://accessibilityinsights.io/info-examples/web/aria-roles/` |
| `aria-required-attr` | Missing required ARIA attribute | 4.1.2 | `https://accessibilityinsights.io/info-examples/web/aria-required-attr/` |
| `aria-valid-attr` | Invalid ARIA attribute | 4.1.2 | `https://accessibilityinsights.io/info-examples/web/aria-valid-attr/` |
| `bypass` | No skip navigation link | 2.4.1 | `https://accessibilityinsights.io/info-examples/web/bypass/` |
| `region` | Content not in landmark | 1.3.1 | `https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html` |
| `tabindex` | Positive tabindex used | 2.4.3 | `https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html` |
| `duplicate-id` | Duplicate element ID | 4.1.1 | `https://accessibilityinsights.io/info-examples/web/duplicate-id/` |
| `focus-order-semantics` | Focus order issue | 2.4.3 | `https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html` |
| `input-image-alt` | Input image missing alt | 1.1.1 | `https://accessibilityinsights.io/info-examples/web/input-image-alt/` |
| `meta-viewport` | Viewport disables zoom | 1.4.4 | `https://accessibilityinsights.io/info-examples/web/meta-viewport/` |
| `select-name` | Select element has no label | 4.1.2 | `https://accessibilityinsights.io/info-examples/web/select-name/` |
| `autocomplete-valid` | Invalid autocomplete value | 1.3.5 | `https://accessibilityinsights.io/info-examples/web/autocomplete-valid/` |

### W3C/WAI Topic Pages (Non-axe Issues)

For agent-detected issues without axe-core rule IDs, use these W3C/WAI pages:

| Topic | URL |
|-------|-----|
| Focus management | `https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html` |
| Live regions | `https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html` |
| Modal dialogs | `https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/` |
| Data tables | `https://www.w3.org/WAI/tutorials/tables/` |

## WCAG 2.2 Understanding Documents

### URL Pattern

```text
Base: https://www.w3.org/WAI/WCAG22/Understanding/
Pattern: {base}{slug}
```

### Criterion-to-Slug Mapping

| WCAG | Criterion Name | Slug |
|------|---------------|------|
| 1.1.1 | Non-text Content | `non-text-content` |
| 1.3.1 | Info and Relationships | `info-and-relationships` |
| 1.3.2 | Meaningful Sequence | `meaningful-sequence` |
| 1.3.5 | Identify Input Purpose | `identify-input-purpose` |
| 1.4.1 | Use of Color | `use-of-color` |
| 1.4.3 | Contrast (Minimum) | `contrast-minimum` |
| 1.4.4 | Resize Text | `resize-text` |
| 1.4.5 | Images of Text | `images-of-text` |
| 1.4.11 | Non-text Contrast | `non-text-contrast` |
| 2.1.1 | Keyboard | `keyboard` |
| 2.1.2 | No Keyboard Trap | `no-keyboard-trap` |
| 2.4.1 | Bypass Blocks | `bypass-blocks` |
| 2.4.2 | Page Titled | `page-titled` |
| 2.4.3 | Focus Order | `focus-order` |
| 2.4.6 | Headings and Labels | `headings-and-labels` |
| 2.4.7 | Focus Visible | `focus-visible` |
| 2.4.11 | Focus Not Obscured (Minimum) | `focus-not-obscured-minimum` |
| 2.5.8 | Target Size (Minimum) | `target-size-minimum` |
| 3.1.1 | Language of Page | `language-of-page` |
| 3.1.2 | Language of Parts | `language-of-parts` |
| 3.3.1 | Error Identification | `error-identification` |
| 3.3.2 | Labels or Instructions | `labels-or-instructions` |
| 3.3.7 | Redundant Entry | `redundant-entry` |
| 3.3.8 | Accessible Authentication (Minimum) | `accessible-authentication-minimum` |
| 4.1.2 | Name, Role, Value | `name-role-value` |
