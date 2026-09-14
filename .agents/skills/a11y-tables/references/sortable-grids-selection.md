# Sortable Tables, Grids, and Selection

## Sortable Tables

```html
<table>
  <caption>User accounts</caption>
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">
        <button>
          Name
          <span aria-hidden="true">^</span>
        </button>
      </th>
      <th scope="col" aria-sort="none">
        <button>
          Email
          <span aria-hidden="true"></span>
        </button>
      </th>
      <th scope="col" aria-sort="none">
        <button>
          Joined
          <span aria-hidden="true"></span>
        </button>
      </th>
    </tr>
  </thead>
  <tbody>
    <!-- sorted data rows -->
  </tbody>
</table>
```

Requirements:
- Sort buttons inside `<th>` elements
- `aria-sort` on the `<th>`: `"ascending"`, `"descending"`, or `"none"`
- Only one column can have `aria-sort="ascending"` or `"descending"` at a time
- Update `aria-sort` when the user clicks to sort
- Visual sort indicator (arrow/chevron) with `aria-hidden="true"` - the `aria-sort` attribute is the accessible indicator
- Announce the sort change via a live region or by the `aria-sort` update

```javascript
function sortColumn(th, direction) {
  // Reset all columns
  document.querySelectorAll('th[aria-sort]').forEach(h => {
    h.setAttribute('aria-sort', 'none');
  });
  // Set the active column
  th.setAttribute('aria-sort', direction);
  // Sort the data...
}
```

## Interactive Data Grids

When a table has interactive content (editable cells, inline actions, checkboxes), use the ARIA grid pattern:

```html
<table role="grid" aria-label="User management">
  <thead>
    <tr>
      <th scope="col">
        <input type="checkbox" aria-label="Select all users">
      </th>
      <th scope="col">Name</th>
      <th scope="col">Role</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <input type="checkbox" aria-label="Select Jane Smith">
      </td>
      <td>Jane Smith</td>
      <td>
        <select aria-label="Role for Jane Smith">
          <option>Admin</option>
          <option selected>Editor</option>
          <option>Viewer</option>
        </select>
      </td>
      <td>
        <button aria-label="Edit Jane Smith">Edit</button>
        <button aria-label="Delete Jane Smith">Delete</button>
      </td>
    </tr>
  </tbody>
</table>
```

Requirements for `role="grid"`:
- Arrow keys navigate between cells
- Tab moves to the next interactive element within the grid, then exits the grid
- Enter/Space activates the focused cell's interactive element
- Every interactive element inside cells needs a descriptive `aria-label` that includes context (not just "Edit" - "Edit Jane Smith")
- `role="grid"` goes on the `<table>`, not individual cells
- Only use `role="grid"` when cells are interactive - plain data tables should NOT have `role="grid"`

## Select-All Checkboxes

```html
<th scope="col">
  <input type="checkbox" 
         aria-label="Select all users" 
         id="select-all"
         aria-checked="mixed">
</th>
```

Three states:
- **Unchecked**: No rows selected
- **Checked**: All rows selected
- **Mixed/indeterminate**: Some rows selected - set via `checkbox.indeterminate = true`

When the select-all state changes, announce the result:
```javascript
selectAll.addEventListener('change', () => {
  const count = getSelectedCount();
  liveRegion.textContent = selectAll.checked 
    ? `All ${total} users selected` 
    : 'All users deselected';
});
```

## Row Selection and Actions

```html
<tr aria-selected="true">
  <td><input type="checkbox" checked aria-label="Selected: Jane Smith"></td>
  <td>Jane Smith</td>
  <!-- ... -->
</tr>
```

- Use `aria-selected="true"` on selected rows
- Bulk action buttons outside the table should be enabled/disabled based on selection
- Announce selection count changes via live region
- Provide keyboard shortcut for select all (Ctrl+A when grid is focused)

