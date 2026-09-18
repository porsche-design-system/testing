# Control Types

## Select Elements

```html
<label for="country">Country</label>
<select id="country" autocomplete="country-name">
  <option value="">Select a country</option>
  <option value="us">United States</option>
  <option value="ca">Canada</option>
</select>
```

- Always include a default/placeholder option
- If using `<optgroup>`, the `label` attribute is the accessible name
- Never build custom selects from `<div>` elements without full ARIA and keyboard support
- If a custom select is necessary, follow the listbox pattern with full arrow key navigation

## Checkboxes and Radio Buttons

### Individual Checkboxes
```html
<label>
  <input type="checkbox" name="terms" required>
  I agree to the <a href="/terms">Terms of Service</a>
</label>
```

### Tri-state / Indeterminate Checkboxes
```html
<label>
  <input type="checkbox" aria-checked="mixed" id="select-all">
  Select all items
</label>
```

Set via JavaScript: `checkbox.indeterminate = true;`

## Password Fields

```html
<label for="password">Password</label>
<div class="password-wrapper">
  <input id="password" type="password" autocomplete="new-password" aria-describedby="password-requirements">
  <button type="button" aria-label="Show password" aria-pressed="false" onclick="togglePassword()">
    <svg aria-hidden="true"><!-- eye icon --></svg>
  </button>
</div>
<p id="password-requirements">At least 8 characters, one uppercase, one number.</p>
```

Requirements:
- Show/hide toggle is a `<button>` with `aria-pressed`
- `aria-label` updates: "Show password" / "Hide password"
- Use `aria-pressed` to indicate toggle state
- Never disable paste in password fields
- Requirements text linked via `aria-describedby`

## File Uploads

```html
<label for="avatar">Profile photo</label>
<input id="avatar" type="file" accept="image/*" aria-describedby="file-help">
<p id="file-help">JPG, PNG, or GIF. Maximum 5MB.</p>
<div aria-live="polite" id="upload-status"></div>
```

Requirements:
- Label the file input
- Describe accepted formats and size limits via `aria-describedby`
- Announce upload progress via live region
- If using a custom styled upload button, ensure it triggers the native input
- Show selected filename after selection
- Provide a way to remove/change the selected file

## Search Forms

```html
<search>
  <form aria-label="Site search">
    <label for="search" class="visually-hidden">Search</label>
    <input id="search" type="search" aria-describedby="search-help" autocomplete="off">
    <button type="submit">Search</button>
    <p id="search-help" class="visually-hidden">Search by product name, category, or keyword</p>
  </form>
</search>
<div aria-live="polite" id="search-results-count" class="visually-hidden"></div>
```

Requirements:
- Use the `<search>` element (HTML5 semantic element, maps to `role="search"` automatically). Falls back gracefully in older browsers. If `<search>` is unavailable, use `<form role="search">`
- Label the search input (visually hidden is acceptable for search)
- Live region announces result count
- Debounce announcements for live search (500ms minimum)
- Clear button if input has content

## Date and Time Inputs

Prefer native inputs when possible:

```html
<label for="dob">Date of birth</label>
<input id="dob" type="date" autocomplete="bday">
```

If using a custom date picker:
- Must be fully keyboard navigable
- Arrow keys move between days/months
- Escape closes the picker
- Selected date announced by screen reader
- Manual text input as fallback (some users cannot use pickers)
- Follow the ARIA date picker pattern or use a tested library

