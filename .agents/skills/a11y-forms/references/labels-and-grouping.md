# Labels, Help Text, Required Fields, and Grouping

## Labels -- The Foundation

Every form control MUST have a programmatically associated label. Visual proximity is not enough -- screen readers need explicit association.

### Standard Pattern

```html
<label for="email">Email address</label>
<input id="email" type="email" autocomplete="email">
```

Requirements:
- `<label>` element with `for` attribute matching the input's `id`
- Never use `placeholder` as the only label -- it disappears on input and has poor contrast
- Never use `aria-label` when a visible label is possible -- sighted users benefit from visible labels too
- Label text must be descriptive. "Email address" not "Input 1"
- Clicking a `<label>` activates its associated control (ARIA labeling via `aria-label`/`aria-labelledby` does NOT provide this click behavior -- this is why `<label>` is always preferred)
- Implicit labels (wrapping input inside `<label>`) work but are less well-supported than explicit `for`/`id` association

### When `aria-label` Is Acceptable

Only when a visible label genuinely cannot exist:

```html
<!-- Search input with visible button -->
<input type="search" aria-label="Search products">
<button>Search</button>

<!-- Icon-only clear button inside an input -->
<button aria-label="Clear search">
  <svg aria-hidden="true">...</svg>
</button>
```

### When to Use `aria-labelledby`

When the label text comes from multiple elements or is already visible elsewhere:

```html
<h2 id="billing-heading">Billing Address</h2>
<input aria-labelledby="billing-heading street-label" id="street">
<span id="street-label">Street</span>
```

### Labels for Wrapped Inputs

This pattern works but the explicit `for`/`id` association is preferred:

```html
<!-- Works but less explicit -->
<label>
  Email address
  <input type="email">
</label>

<!-- Preferred -- explicit association -->
<label for="email">Email address</label>
<input id="email" type="email">
```

## Help Text and Descriptions

Additional instructions beyond the label must be programmatically associated:

```html
<label for="password">Password</label>
<input id="password" type="password" aria-describedby="password-help">
<p id="password-help">Must be at least 8 characters with one number and one special character.</p>
```

- Use `aria-describedby` to link help text to the input
- Screen readers announce the label first, then the description
- Multiple descriptions can be space-separated: `aria-describedby="help-text format-hint"`
- Help text must be visible, not hidden in tooltips

## Required Fields

```html
<label for="name">Full name <span aria-hidden="true">*</span></label>
<input id="name" type="text" required aria-required="true">
```

Requirements:
- Use the native `required` attribute -- it gives browser validation and screen reader announcement for free
- Add `aria-required="true"` for reinforcement (some screen readers prefer it)
- If using an asterisk, hide it from screen readers with `aria-hidden="true"` -- the `required` attribute already announces "required"
- Explain the asterisk convention at the top of the form: "Fields marked with * are required"
- Never indicate required status through color alone

## Grouping with Fieldset and Legend

Related inputs MUST be grouped:

```html
<fieldset>
  <legend>Shipping Address</legend>
  <label for="street">Street</label>
  <input id="street" type="text" autocomplete="street-address">
  <label for="city">City</label>
  <input id="city" type="text" autocomplete="address-level2">
</fieldset>
```

When to use fieldset/legend:
- Radio button groups (always)
- Checkbox groups (always)
- Related field groups (address, payment info, personal details)
- When the group label provides essential context for understanding individual fields

```html
<!-- Radio buttons -- fieldset is mandatory -->
<fieldset>
  <legend>Preferred contact method</legend>
  <label><input type="radio" name="contact" value="email"> Email</label>
  <label><input type="radio" name="contact" value="phone"> Phone</label>
  <label><input type="radio" name="contact" value="text"> Text message</label>
</fieldset>

<!-- Checkboxes -- fieldset is mandatory -->
<fieldset>
  <legend>Notification preferences</legend>
  <label><input type="checkbox" name="notify" value="updates"> Product updates</label>
  <label><input type="checkbox" name="notify" value="news"> Newsletter</label>
  <label><input type="checkbox" name="notify" value="offers"> Special offers</label>
</fieldset>
```

Without fieldset/legend, a screen reader user hearing "Email" has no idea it refers to a contact method preference.

