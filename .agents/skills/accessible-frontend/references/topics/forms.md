# Forms

## Rules

- Persistent visible labels describe the input’s purpose (2.4.6, 3.3.2). Placeholders are not labels. If a design system can hide the label visually, the accessible name must still exist.
- Accessible name contains the visible label (2.5.3).
- Group related radios and checkboxes with `fieldset`/`legend` or the design system's group label. Do not rely on adjacent text alone.
- Choose the native input `type`, `inputmode`, and valid `autocomplete` token that match the data and virtual keyboard. Autocomplete is required for fields collecting identified user data covered by 1.3.5.
- Required: expose required in the accessibility tree. Do not use a visual asterisk as the only cue.
- Validation: visible text says what is wrong and how to recover (3.3.1, 3.3.3). Use the loaded design system’s error/message API; otherwise set native `aria-invalid` and connect the control to a stable error ID with `aria-describedby` or `aria-errormessage` where supported.
- For several submission errors, provide a concise focusable error summary that links to invalid controls and announce it once. Associate group errors with the group, not every option.
- Avoid `disabled` on controls the user still needs to understand. Disabled fields are unfocusable and easy to miss. Prefer `readonly` or explanatory text.
- Load `references/topics/cognitive-timing-and-input.md` for consequential submissions, redundant entry, and accessible authentication (3.3.4, 3.3.7, 3.3.8).
- Abbreviations shown as units or suffixes must also appear in accessible text (label or description).
- For form-associated custom elements, use the installed component’s label/message/slot APIs and limitations before adding an external IDREF; native relationships may not cross shadow roots.
