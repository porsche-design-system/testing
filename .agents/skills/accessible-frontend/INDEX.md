# Reference index

Load only the files required by the selected tier. Escalate when the edit expands.

## Tier matrix

| Tier | Required topics | Add only when present |
|---|---|---|
| Minimal: styling or copy | Exactly one matching topic from the index | Escalate if markup, state, behavior, or structure changes |
| Component: one UI piece | The most specific matching Pattern or Composition topic; add `references/topics/keyboard-and-focus.md` when the component is interactive | Visual, live-region, cognitive, content, framework, and separately installed design-system guidance affected by the component |
| Page/feature: route, flow, or several patterns | `references/topics/structure-landmarks-headings.md`, `references/topics/keyboard-and-focus.md`, `references/topics/visual-hcm-zoom-contrast.md`, and `references/topics/framework-integration.md` | Routing, links, content, every Pattern used, EN applicability, and separately installed design-system guidance |

## PDS knowledge-skill boundary

PDS knowledge skills ship with PDS npm packages but must be exposed to the agent separately by the user. Installation, linking, framework selection, and version matching are owned by the [official PDS skill documentation](https://designsystem.porsche.com/v4/skills/introduction/general/), not this APM package.

- If a matching `pds-knowledge-*` skill is already available, load it for PDS component APIs, framework syntax, limitations, and component-specific accessibility.
- Apply this package’s generic topics to page composition and custom UI around those PDS components.
- If no PDS knowledge skill is available, do not install or search for one automatically and do not guess PDS APIs. Continue with generic guidance or ask the user to complete the official PDS setup.

## Topic categories

- **Foundation:** cross-cutting behavior commonly required at component or page scope.
- **Pattern:** the primary implementation contract for a specific interactive pattern.
- **Composition:** page/content relationships loaded only when that content exists.
- **Framework:** lifecycle and integration mechanics, not WCAG duplication.
- **Standard:** conditional standards scope and routing.

## Topic index

| Topic | Category | File | Load when |
|---|---|---|---|
| Keyboard and focus | Foundation | `references/topics/keyboard-and-focus.md` | interactive UI, overlays, skip links, tab order |
| Visual, HCM, zoom, contrast | Foundation | `references/topics/visual-hcm-zoom-contrast.md` | color, focus rings, motion, zoom, forced colors |
| Cognitive, timing, input | Foundation | `references/topics/cognitive-timing-and-input.md` | instructions, timeout, auto-updates, consequential actions, gestures |
| Forms | Pattern | `references/topics/forms.md` | inputs, checkbox, radio, select, textarea, validation |
| Live regions | Pattern | `references/topics/live-regions.md` | toasts, notifications, loading, submit status |
| Dialogs and overlays | Pattern | `references/topics/dialogs-and-overlays.md` | modal, sheet, drawer, popover, disclosure |
| Tables and grids | Pattern | `references/topics/tables-and-grids.md` | data table, sorting, selection, grid |
| ARIA widgets | Pattern | `references/topics/aria-widgets.md` | tabs, accordion, menu, combobox, tooltip, carousel |
| Structure, landmarks, headings | Composition | `references/topics/structure-landmarks-headings.md` | page/layout, headings, landmarks, lists |
| Routing and dynamic UI | Composition | `references/topics/routing-and-dynamic-ui.md` | client routing, replaced/deleted content, loading |
| Links and navigation | Composition | `references/topics/links-and-navigation.md` | links, buttons, breadcrumbs, current page, downloads |
| Images and media | Composition | `references/topics/images-and-media.md` | images, SVG, charts, iframe, audio, video |
| Framework integration | Framework | `references/topics/framework-integration.md` | Next.js, React, Angular, Vue, Astro, vanilla JS |
| EN 301 549 | Standard | `references/topics/en-301-549.md` | applicable product capability, conformance, media, documents, help/support |
