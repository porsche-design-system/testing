# Visual, HCM, zoom, contrast

## Rules

- Text 4.5:1 (3:1 large text: 18pt / 14pt bold) (1.4.3). UI components and graphics 3:1 (1.4.11).
- Do not convey meaning by color alone (1.4.1). Pair color with text or an icon that has an accessible name.
- Support `@media (forced-colors: active)`. Do not rely on box-shadow or background images for affordances. Do not set `forced-color-adjust: none` unless you provide a correct alternative.
- Custom focus rings must meet 3:1 against adjacent colors. Preserve the design system's focus styling when one is present.
- Content usable at 200% text zoom (1.4.4). Prefer `rem`. No clipped labels or overlapping controls.
- Reflow at 320 CSS pixels wide without two-dimensional scrolling, except where a two-dimensional layout is required for use or meaning, such as a data table, map, or diagram (1.4.10).
- Do not clip or overlap content when users override line height to 1.5, paragraph spacing to 2, letter spacing to 0.12em, or word spacing to 0.16em (1.4.12). Avoid fixed heights on text containers.
- Do not lock orientation unless a specific orientation is essential (1.3.4).
- Hover/focus content such as tooltips is dismissible, hoverable, and remains available until dismissed, no longer relevant, or pointer/focus moves away (1.4.13).
- Respect `prefers-reduced-motion` for non-essential motion (related to 2.3.3 AAA). Separately provide pause/stop/hide controls when 2.2.2 applies.
- Avoid content that flashes above the three-flashes threshold (2.3.1).
- Validate design-system token pairs in every supported theme, state, and forced-colors mode. Do not override tokens into failing combinations.
