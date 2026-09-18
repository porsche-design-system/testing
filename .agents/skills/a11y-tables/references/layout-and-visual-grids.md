# Layout Tables and Visual Grids

## Layout Tables -- Detection and Remediation

Tables used for layout (not data) are an accessibility antipattern. Per WebAIM, a layout table is identified by:
- No `<th>` elements
- No `<caption>` element
- No `scope` or `headers` attributes
- Data makes no logical sense when read in table cell order

```html
<!-- NEVER DO THIS -->
<table>
  <tr>
    <td>Sidebar content</td>
    <td>Main content</td>
  </tr>
</table>

<!-- If you absolutely must (legacy code), strip the semantics -->
<table role="presentation">
  <tr>
    <td>Sidebar content</td>
    <td>Main content</td>
  </tr>
</table>
```

- `role="presentation"` removes table semantics from screen readers
- No `<th>`, `<caption>`, `scope`, or `headers` on layout tables
- The correct fix is always to use CSS Grid or Flexbox instead
- When remediating legacy layout tables, ensure data is still presented in a logical, meaningful linear order when table structure is removed

## Visual Data Grids Without Semantic Markup

CSS grid and flexbox layouts often display structured data (stats, metrics, KPIs, dashboards, pricing cards) that *looks* tabular or structured visually but uses only `<div>`/`<span>` elements. Screen readers linearize these into undifferentiated text.

### The Problem

```html
<!-- PROBLEMATIC: looks structured visually, but screen readers read
     "47 Specialized Agents 3 Platforms 52 Prompts" as one long line -->
<div class="stats-grid">
  <div>
    <span class="stat-number">47</span>
    <span class="stat-label">Specialized Agents</span>
  </div>
  <div>
    <span class="stat-number">3</span>
    <span class="stat-label">Platforms</span>
  </div>
</div>
```

### The Fix: Use `<dl>` for Key-Value Pairs

When data presents label-value pairs (stat dashboards, profile fields, spec lists, pricing highlights):

```html
<dl class="stats-grid">
  <div class="stat-item">
    <dt class="stat-label">Specialized Agents</dt>
    <dd class="stat-number">47</dd>
  </div>
  <div class="stat-item">
    <dt class="stat-label">Platforms</dt>
    <dd class="stat-number">3</dd>
  </div>
</dl>
```

Use CSS `order: -1` on `<dd>` if the value should display above the label visually while keeping the label first in DOM order for screen readers.

### When to Use `<table>` Instead

If the data has multiple dimensions (rows AND columns), use a proper `<table>`. `<dl>` is for flat key-value lists.

### What to Flag

- Any CSS grid or flexbox container with 3+ child elements where each child has a "label" and "value" pattern using only `<div>`/`<span>`
- Stats bars, KPI dashboards, pricing highlights, feature counts, metric summaries using only generic elements
- Any visual grid of structured data without `<dl>`, `<table>`, or ARIA table/grid roles

