# Tables and grids

## Rules

- Use a table only for tabular relationships, never for page layout. Keep native table semantics unless a real interactive grid keyboard model is required.
- Provide a concise visible `<caption>` when possible. A screen-reader-only caption or equivalent label is acceptable when the design requires it.
- Use `<th scope="col">` and `<th scope="row">` for simple headers. Use unique `id`/`headers` relationships for genuinely complex multi-level headers.
- Keep sortable header text visible. Put the sort action in a button inside the header, and set `aria-sort` on the current `th`/`columnheader` or `rowheader`, not on the button. Update visual and programmatic state together.
- Announce sorting only when the changed header state is not sufficient. Do not duplicate the button and table announcements.
- Give row-selection controls specific names, expose select-all mixed state, and keep selection after sorting or pagination only when that is intentional and communicated.
- For horizontal overflow, preserve table semantics and make the scroll container keyboard reachable only when keyboard users otherwise cannot scroll it; label that region.
- Use `role="grid"` only for spreadsheet-like interaction with documented arrow-key navigation, focus management, selection, and editing. A table containing links or buttons is still usually a table.
