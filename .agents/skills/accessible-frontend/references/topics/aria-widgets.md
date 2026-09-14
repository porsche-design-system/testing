# ARIA widgets

## Rules

- Prefer a native element or installed accessible primitive. If a custom widget is necessary, follow the matching WAI-ARIA Authoring Practices pattern completely; roles without behavior make the UI less accessible.
- Keep name, role, value, state, controlled element, and keyboard behavior synchronized. Do not add ARIA that duplicates or conflicts with native/component semantics.
- Disclosures and accordions expose expanded state and control the correct panel. Tabs expose selected state, connect tabs to tab panels, and implement one documented focus model.
- Menus are for application-style commands, not ordinary site navigation. Comboboxes must coordinate input, popup, active option, selection, and Escape behavior.
- Composite widgets use roving `tabindex` or `aria-activedescendant` consistently. Do not put every child in the page Tab sequence.
- Tooltips are supplemental descriptions, never the only source of essential information. Their content is dismissible, hoverable, and persistent while pointer or focus remains over it (1.4.13).
- Carousels provide previous/next controls, pause automatic movement, identify the current item, and do not move focus when slides change automatically.
- Test custom widgets with keyboard and a screen reader. When behavior is not fully implemented, simplify to native controls.

Authoritative pattern behavior: https://www.w3.org/WAI/ARIA/apg/patterns/
