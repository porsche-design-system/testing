# Wizards, Combobox, Auth, and Custom Controls

## Multi-Step Forms / Wizards

```html
<nav aria-label="Form progress">
  <ol>
    <li aria-current="step">
      <span>Step 1: Personal Info</span>
    </li>
    <li>
      <span>Step 2: Address</span>
    </li>
    <li>
      <span>Step 3: Payment</span>
    </li>
  </ol>
</nav>

<form>
  <h2>Step 1: Personal Information</h2>
  <!-- Step fields -->
  <button type="button">Next</button>
</form>
```

Requirements:
- Progress indicator with `aria-current="step"` on the current step
- Each step has a heading indicating step number and name
- Focus moves to the step heading when navigating between steps
- Back button available (do not rely on browser back)
- Data persists when navigating between steps
- Validation per step, not just on final submit
- Announce step changes via heading focus or live region

## Combobox / Autocomplete Pattern

Per the W3C APG Combobox Pattern, a combobox is an input with an associated popup (listbox, grid, tree, or dialog) that helps the user set the value.

### Two Types
- **Editable combobox:** User can type any value; popup filters suggestions (e.g., address autocomplete)
- **Select-only combobox:** User selects from a predefined list; typing filters options (custom styled `<select>` replacement)

### Required Structure

```html
<label for="city">City</label>
<input id="city" role="combobox" type="text"
  aria-expanded="false"
  aria-controls="city-listbox"
  aria-autocomplete="list"
  autocomplete="off">
<ul id="city-listbox" role="listbox" hidden>
  <li role="option" id="city-1">Austin</li>
  <li role="option" id="city-2">Boston</li>
  <li role="option" id="city-3">Chicago</li>
</ul>
<div aria-live="polite" class="visually-hidden" id="city-status"></div>
```

### Autocomplete Behaviors
| `aria-autocomplete` | Behavior |
|---------------------|----------|
| `none` | Popup shows all options regardless of input |
| `list` | Popup filters to match input text |
| `both` | Popup filters AND inline completion appears in the input |
| `inline` | Only inline completion, no popup |

### Key Requirements (W3C APG)
- Use `aria-controls` (NOT `aria-owns`) to link the input to the popup
- `aria-expanded` toggles `true`/`false` as popup opens/closes
- DOM focus stays on the input; use `aria-activedescendant` to track the highlighted option
- Arrow Down opens the popup and moves to the first option
- Escape closes the popup without changing the value
- Enter accepts the highlighted option
- Live region announces result count: "3 cities match. Use arrow keys to navigate"
- Set `autocomplete="off"` on the input to prevent browser autocomplete from conflicting

## Accessible Authentication (WCAG 3.3.8)

Authentication must not require cognitive function tests (memorizing passwords, transcribing codes, solving puzzles) unless an alternative method is available.

### Requirements
- **Never block paste** in password fields. Users depend on password managers
- **Support password managers:** use correct `autocomplete` attributes (`current-password`, `new-password`, `username`)
- **Provide show/hide password toggle** so users can verify what they typed
- **Support alternative auth:** passkeys/WebAuthn, biometrics, OAuth/social login, email/SMS magic links
- **Two-factor/verification codes:** the input field must support paste so users can paste from authenticator apps or SMS
- **CAPTCHAs** are a cognitive function test. If used, provide an alternative (audio CAPTCHA, email verification, or invisible reCAPTCHA)

```html
<!-- Password field that supports password managers -->
<label for="password">Password</label>
<input id="password" type="password" autocomplete="current-password">
<button type="button" aria-label="Show password" aria-pressed="false">Show</button>

<!-- Verification code that supports paste -->
<label for="code">Verification code</label>
<input id="code" type="text" inputmode="numeric" autocomplete="one-time-code"
  aria-describedby="code-help">
<p id="code-help">Enter the 6-digit code sent to your phone</p>
```

## Redundant Entry (WCAG 3.3.7)

In multi-step processes, information previously entered by the user must be auto-populated or available for selection. Do not force re-entry.

- If Step 1 collects a shipping address, Step 3 (billing) should offer "Same as shipping" or pre-populate
- If the user entered their email on a previous page, do not ask for it again
- Data should persist when navigating back and forth between steps
- Auto-populate where safely possible; offer selection for the rest

## Custom Controls

### Toggle Switch

```html
<button role="switch" aria-checked="false" aria-label="Dark mode">
  <span aria-hidden="true" class="toggle-track">
    <span class="toggle-thumb"></span>
  </span>
</button>
```

- Use `role="switch"` with `aria-checked`
- Activate with Enter or Space
- Announce state change
- Visible on/off indicator beyond color

### Star Rating

```html
<fieldset>
  <legend>Rate this product</legend>
  <label><input type="radio" name="rating" value="1"> 1 star</label>
  <label><input type="radio" name="rating" value="2"> 2 stars</label>
  <label><input type="radio" name="rating" value="3"> 3 stars</label>
  <label><input type="radio" name="rating" value="4"> 4 stars</label>
  <label><input type="radio" name="rating" value="5"> 5 stars</label>
</fieldset>
```

Use native radio buttons, style them visually as stars. Do not build from clickable SVGs without full ARIA.

## Disabled vs Read-Only

```html
<!-- Disabled: cannot interact, not submitted -->
<input type="text" disabled value="Cannot change this">

<!-- Read-only: cannot edit, IS submitted -->
<input type="text" readonly value="Will be submitted">
```

- Disabled fields are excluded from form submission and from tab order
- Read-only fields are in the tab order and ARE submitted
- Both are announced by screen readers
- If a field is conditionally disabled, consider `aria-disabled="true"` with custom handling -- native `disabled` removes from tab order and some users may not find it

## Form Layout

- One column is most accessible -- multi-column forms confuse tab order
- Left-aligned labels above inputs (or left of inputs for short forms)
- Never use a `<table>` for form layout
- Group related fields visually AND semantically (fieldset/legend)
- Adequate spacing between form groups (at least 24px)

