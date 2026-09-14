# Responsive Tables, Pagination, and Empty States

## Responsive Tables

### Approach 1: Horizontal Scroll

```html
<div role="region" aria-label="User accounts" tabindex="0">
  <table>
    <!-- full table -->
  </table>
</div>
```

- Wrap in a `<div>` with `role="region"` and `aria-label`
- Add `tabindex="0"` so keyboard users can scroll
- Add `overflow-x: auto` on the wrapper
- Visual scroll indicator so users know there's more content

### Approach 2: Stacked Cards on Mobile

```css
@media (max-width: 768px) {
  table, thead, tbody, th, td, tr {
    display: block;
  }
  thead { display: none; } /* Hide visual headers */
  td::before {
    content: attr(data-label); /* Show header as label */
    font-weight: bold;
  }
}
```

```html
<td data-label="Name">Jane Smith</td>
<td data-label="Email">jane@example.com</td>
```

Requirements for stacked pattern:
- Each cell must have its header visible (via `data-label` or other technique)
- The `<thead>` is visually hidden but remains in the DOM for screen readers
- Row boundaries must be clear (borders, spacing, or visual grouping)

### Approach 3: Priority Columns

Show only essential columns on mobile, with a "View details" button per row:

```html
<tr>
  <td>Jane Smith</td>
  <td class="hide-mobile">jane@example.com</td>
  <td class="hide-mobile">Admin</td>
  <td>
    <button aria-label="View details for Jane Smith">Details</button>
  </td>
</tr>
```

Use `aria-hidden` and `display: none` together - never `aria-hidden` alone for hidden content.

## Pagination

```html
<table aria-describedby="table-info">
  <!-- table content -->
</table>
<p id="table-info">Showing 1-10 of 247 results</p>
<nav aria-label="Table pagination">
  <button aria-label="Previous page" disabled>Previous</button>
  <button aria-current="page" aria-label="Page 1">1</button>
  <button aria-label="Page 2">2</button>
  <button aria-label="Page 3">3</button>
  <button aria-label="Next page">Next</button>
</nav>
<div aria-live="polite" class="visually-hidden" id="page-status"></div>
```

Requirements:
- `aria-current="page"` on the current page button
- `aria-label` on each page button with the page number
- Disabled buttons use `disabled` attribute (not `aria-disabled` for pagination)
- Live region announces page changes: "Page 2 of 25, showing results 11-20"
- Focus management: after page change, move focus to the first row or the table caption

## Empty States

```html
<table>
  <caption>Search results</caption>
  <thead>
    <tr>
      <th scope="col">Name</th>
      <th scope="col">Date</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td colspan="2">
        <p>No results found. Try adjusting your search filters.</p>
      </td>
    </tr>
  </tbody>
</table>
```

- Use `colspan` to span the full width
- Provide a helpful message, not just "No data"
- Announce the empty state via live region if it results from a filter/search action

