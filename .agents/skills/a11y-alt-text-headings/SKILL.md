---
name: a11y-alt-text-headings
description: "Images, alt text, headings, landmarks, and document outline for accessibility audits."
user-invocable: false
---

# A11y Alt Text Headings

## Audit phase role

The `a11y-audit` agent owns phase numbering. During a phased site audit, this skill runs only in **Phase 2 (Structure)** after Phase 1 has a `DONE`, `SKIPPED`, or `FAILED` status. Complete one pass: apply the checklist, return findings, and stop. Do not start another phase.

Use this skill during accessibility audits when reviewing the related domain. Apply the checklist below and return structured findings (description, severity, WCAG criterion, impact, location, confidence, recommended fix).

## Authoritative Sources

- **WCAG 1.1.1 Non-text Content** — https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html
- **WCAG 2.4.6 Headings and Labels** — https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html
- **WAI Alternative Text Tutorial** — https://www.w3.org/WAI/tutorials/images/
- **HTML Living Standard - alt attribute** — https://html.spec.whatwg.org/multipage/images.html#alt
- **ARIA Authoring Practices - Landmarks** — https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/

This skill is a checklist module for `a11y-audit` covering alternative text and heading structure. Images without alt text are invisible to screen reader users. Broken heading hierarchies make pages impossible to navigate. Ensure every piece of visual content has an appropriate text alternative and every page has a logical reading order.

This skill supports visual analysis of images against their alt text. When images are found, look at them. Evaluate whether the alt text accurately represents what the image shows. When alt text is missing, describe what is seen and suggest appropriate alternatives. When the context is ambiguous, ask the user questions to determine the image's purpose before writing alt text.

## Your Scope

You own everything related to text alternatives and document structure:
- Image alt text (meaningful, decorative, complex)
- Image analysis and alt text quality assessment
- SVG accessibility
- Icon accessibility
- Video and audio alternatives
- Figure and figcaption usage
- Chart and data visualization descriptions
- Heading hierarchy and levels
- Document outline and reading order
- Landmark structure
- Page titles
- Language attributes

## Validation Checklist

### Images
1. Does every `<img>` have an `alt` attribute?
2. Do meaningful images have descriptive alt text (verified by visual analysis)?
3. Do decorative images have `alt=""`?
4. Do functional images (in links/buttons) describe the action?
5. Do complex images have extended descriptions?
6. Are SVGs properly labeled or hidden?
7. Are icon fonts hidden with `aria-hidden="true"`?
8. Do icon-only buttons/links have `aria-label`?
9. Does the alt text match what the image actually shows?
10. Has the user been asked about ambiguous images?

### Headings
11. Is there exactly one H1 per page?
12. Are heading levels sequential (no skipped levels)?
13. Do headings describe their section content?
14. Are heading levels chosen for structure, not appearance?
15. Do modal headings start at H2?
16. Does the heading outline make sense as a table of contents?

### Document Structure
17. Is `<html lang="...">` set correctly?
18. Is `<title>` descriptive and unique?
19. Are landmarks used correctly (header, nav, main, footer)?
20. Is there a skip link to main content?
21. Are language changes within content marked with `lang`?
22. For SPAs: does the title update on route changes?

### Media
23. Do videos have captions?
24. Do videos have audio descriptions for visual-only content?
25. Is a transcript available for audio content?
26. Is autoplay disabled or muted with visible controls?

## Common Mistakes You Must Catch

- `alt="image"`, `alt="photo"`, `alt="icon"` -- these describe the format, not the content
- `alt="IMG_20250115_143022.jpg"` -- filename as alt text
- Missing `alt` attribute entirely (screen reader reads the filename)
- `alt` text that repeats adjacent text content
- Alt text that does not match what the image actually shows (verify visually)
- Decorative images with descriptive alt (creates noise)
- SVGs without `aria-hidden` or proper `title`/`desc`
- H1 used as a site logo/brand on every page instead of the page-specific title
- Heading levels chosen for font size rather than structure
- `<div class="heading">` instead of actual heading elements
- Empty headings (`<h2></h2>` or headings with only whitespace)
- Headings inside interactive elements (`<button><h2>Click me</h2></button>`)
- Missing page `<title>` or generic title like "Page" on every page
- Missing `lang` attribute on `<html>`
- Charts and graphs with `alt="chart"` instead of describing the data

## How to Report Issues


## Progressive disclosure

Read only the reference files needed for the current page/features. Do not load every reference by default.

- [Image analysis workflow](references/image-analysis-workflow.md) — when images are present; visual alt-text quality review
- [Alt text patterns](references/alt-text-patterns.md) — img/picture/CSS backgrounds/logos/image buttons
- [SVG, icons, media, figures](references/svg-icons-media.md) — SVG, icon fonts, video/audio alternatives, figure/figcaption
- [Headings, landmarks, titles, language](references/headings-landmarks.md) — document outline, page title, lang, landmarks
- [Structured output templates](references/structured-output.md) — formatting findings for the audit report

