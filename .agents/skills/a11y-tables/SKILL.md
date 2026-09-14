---
name: a11y-tables
description: "Data tables, grids, headers, scope, caption, and sortable tables for audits."
user-invocable: false
---

# A11y Tables

## Audit phase role

The `a11y-audit` agent owns phase numbering. During a phased site audit, this skill runs only in **Phase 8 (Tables)** after Phase 7 has a terminal status. If the page has no tables, the agent marks Phase 8 `SKIPPED` and does not load this skill. Complete one pass: apply the checklist, return findings, and stop.

Use this skill during accessibility audits when reviewing the related domain. Apply the checklist below and return structured findings (description, severity, WCAG criterion, impact, location, confidence, recommended fix).

## Authoritative Sources

- **WCAG 1.3.1 Info and Relationships** — https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html
- **WAI Tables Tutorial** — https://www.w3.org/WAI/tutorials/tables/
- **HTML Living Standard - Tables** — https://html.spec.whatwg.org/multipage/tables.html
- **ARIA Grid Pattern** — https://www.w3.org/WAI/ARIA/apg/patterns/grid/
- **ARIA Table Role** — https://www.w3.org/TR/wai-aria-1.2/#table

This skill is a checklist module for `a11y-audit` covering data table accessibility. Tables are one of the most broken areas of web accessibility. Screen reader users rely on proper table markup to navigate data - without it, a table is just a wall of disconnected text. Ensure every table is properly structured, labeled, and navigable.

## Your Scope

You own everything related to tabular data accessibility:
- Table markup and structure (`<table>`, `<thead>`, `<tbody>`, `<tfoot>`)
- Column and row headers (`<th>`, `scope`, `headers`)
- Table captions and summaries
- Sortable columns (`aria-sort`)
- Responsive table patterns
- ARIA grid and treegrid roles
- Data grids with interactive cells
- Comparison and pricing tables
- Layout tables (and why they shouldn't exist)
- Merged cells (`colspan`, `rowspan`)
- Pagination and virtual scrolling in tables

## Validation Checklist

### Structure
1. Is `<table>` used for tabular data (not layout)?
2. Does the table have a `<caption>` or `aria-label`?
3. Are header cells `<th>` (not styled `<td>`)?
4. Do column headers have `scope="col"` and row headers `scope="row"`?
5. Are `<thead>`, `<tbody>`, and `<tfoot>` used correctly?
6. For complex tables: are `headers` attributes correct?
7. For merged cells: do `colspan`/`rowspan` have correct header associations?

### Sorting
8. Do sortable columns have `aria-sort` attributes?
9. Is `aria-sort` updated when sort changes?
10. Are sort buttons inside `<th>` elements?
11. Is the sort change announced (live region or `aria-sort` update)?

### Interactive
12. Do interactive tables use `role="grid"` appropriately?
13. Do interactive elements in cells have descriptive `aria-label` with context?
14. Does the select-all checkbox handle the indeterminate state?
15. Are row selections indicated with `aria-selected`?
16. Are selection count changes announced?

### Responsive
17. Is the table scrollable on mobile with `role="region"` and `tabindex="0"`?
18. Or does the stacked pattern retain header context per cell?
19. Are hidden columns properly hidden (not just `aria-hidden`)?

### Pagination
20. Does pagination have `aria-current="page"` on the current page?
21. Are page changes announced via live region?
22. Is focus managed after page changes?
23. Is the "showing X of Y" text linked via `aria-describedby`?

### General
24. Are empty states communicated with descriptive messages?
25. Are layout tables avoided (or marked with `role="presentation"`)?
26. Do CSS grid/flexbox layouts displaying structured data use `<dl>`, `<table>`, or ARIA roles (not bare `<div>`/`<span>`)?

## Common Mistakes You Must Catch

- CSS grid/flexbox layouts displaying key-value data (stats, metrics, KPIs) with only `<div>`/`<span>` -- use `<dl>`/`<dt>`/`<dd>` for label-value pairs
- Using `<div>` grids styled to look like tables - screen readers cannot navigate them as tables
- `<td>` elements styled bold to look like headers - use `<th>` with `scope`
- Missing `<caption>` - screen readers announce "table" with no description
- `scope` attribute on `<td>` elements (only valid on `<th>`)
- `aria-sort` on all columns simultaneously instead of just the active sort column
- Sort buttons outside the `<th>` (breaks header/button association)
- `role="grid"` on non-interactive data tables (adds unnecessary complexity for screen readers)
- Responsive tables that hide columns with `display: none` but don't hide from screen readers
- Inline edit controls without `aria-label` context ("Edit" button in 50 rows - edit what?)
- Pagination without `aria-current="page"` - screen reader hears identical "1", "2", "3" buttons
- Empty tables with no message - user doesn't know if data is loading or missing

## How to Report Issues


## Progressive disclosure

Read only the reference files needed for the current page/features. Do not load every reference by default.

- [Simple and complex tables](references/simple-and-complex-tables.md) — basic markup, scope, complex headers, captions
- [Sortable tables, grids, selection](references/sortable-grids-selection.md) — aria-sort, interactive grids, select-all, row actions
- [Responsive, pagination, empty states](references/responsive-pagination-empty.md) — responsive patterns, pagination, empty table states
- [Layout tables and visual grids](references/layout-and-visual-grids.md) — layout tables detected or CSS grids mimicking tables
- [Structured output templates](references/structured-output.md) — formatting findings for the audit report

