# Simple and Complex Tables

## Simple Data Tables

### The Basics

Every data table needs these elements:

```html
<table>
  <caption>Quarterly sales by region, 2025</caption>
  <thead>
    <tr>
      <th scope="col">Region</th>
      <th scope="col">Q1</th>
      <th scope="col">Q2</th>
      <th scope="col">Q3</th>
      <th scope="col">Q4</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">North America</th>
      <td>$2.1M</td>
      <td>$2.4M</td>
      <td>$2.8M</td>
      <td>$3.1M</td>
    </tr>
    <tr>
      <th scope="row">Europe</th>
      <td>$1.8M</td>
      <td>$1.9M</td>
      <td>$2.2M</td>
      <td>$2.5M</td>
    </tr>
  </tbody>
</table>
```

Requirements:
- `<caption>` describes what the table contains -- this is the table's accessible name. It MUST be the first child element after `<table>`
- `<th>` for all header cells, never `<td>` styled to look like a header
- `scope="col"` on column headers, `scope="row"` on row headers -- always explicit, even when there is only one header row
- `<thead>` wraps the header row(s), `<tbody>` wraps data rows
- `<tfoot>` for summary/total rows if they exist

### Structural Clarifications (per WebAIM)

**`<thead>`, `<tbody>`, `<tfoot>`** provide no accessibility semantics -- screen readers do not use them. They exist for CSS styling, print rendering, and fixed-header scrolling. Still use them for code organization, but do not rely on them for accessibility.

**The `summary` attribute** is deprecated in HTML5. Use `<caption>` for the table's accessible name. If a longer description is needed, use `aria-describedby` pointing to a paragraph outside the table.

**`headers`/`id` associations** are a last resort. Prefer `scope` on every `<th>`. Only use `headers`/`id` when a table has irregular header spans that `scope` cannot express. Over-complex `headers`/`id` markup is fragile and error-prone.

**Proportional sizing:** Use percentage or relative widths (`width: 30%`, `min-width: 8em`) rather than fixed pixel widths. This prevents horizontal scrolling at increased text sizes (WCAG 1.4.10 Reflow).

**Flatten when possible:** If a table requires deeply nested `colspan`/`rowspan` spanning three or more levels, consider whether the data can be restructured into simpler tables. Complex spanning creates substantial screen reader navigation difficulty.

### Why `scope` Matters

Without `scope`, screen readers have to guess which headers apply to which cells. In simple tables they often guess correctly, but in complex tables they will guess wrong. Always be explicit.

```html
<!-- BAD: Screen reader has to guess -->
<th>Region</th>

<!-- GOOD: Explicit relationship -->
<th scope="col">Region</th>
```

## Complex Tables

### Multi-Level Headers

When a table has headers that span multiple columns or rows:

```html
<table>
  <caption>Employee schedule, week of January 20</caption>
  <thead>
    <tr>
      <td></td>
      <th scope="col" colspan="2">Morning</th>
      <th scope="col" colspan="2">Afternoon</th>
    </tr>
    <tr>
      <td></td>
      <th scope="col">Task</th>
      <th scope="col">Location</th>
      <th scope="col">Task</th>
      <th scope="col">Location</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Monday</th>
      <td>Code review</td>
      <td>Remote</td>
      <td>Sprint planning</td>
      <td>Room 4A</td>
    </tr>
  </tbody>
</table>
```

### The `headers` Attribute

For truly complex tables where `scope` is insufficient (cells relate to headers in non-obvious ways), use the `headers` attribute:

```html
<table>
  <caption>Test results by browser and operating system</caption>
  <thead>
    <tr>
      <td></td>
      <th id="chrome" scope="col">Chrome</th>
      <th id="firefox" scope="col">Firefox</th>
      <th id="safari" scope="col">Safari</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th id="windows" scope="row">Windows</th>
      <td headers="chrome windows">Pass</td>
      <td headers="firefox windows">Pass</td>
      <td headers="safari windows">N/A</td>
    </tr>
    <tr>
      <th id="macos" scope="row">macOS</th>
      <td headers="chrome macos">Pass</td>
      <td headers="firefox macos">Pass</td>
      <td headers="safari macos">Fail</td>
    </tr>
  </tbody>
</table>
```

Each cell's `headers` attribute lists the IDs of all headers that apply to it. Screen readers announce these headers when the user navigates to the cell.

