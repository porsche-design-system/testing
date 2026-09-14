# Framework integration

Use framework lifecycle APIs only to deliver the behavior required by the matching pattern topic. Prefer installed router, overlay, form, and component primitives over parallel custom implementations.

## Next.js

- Give every route descriptive metadata. Keep one `main` landmark in the App Router layout and move focus only after a true client-side view change renders.
- Every `next/image` needs purposeful `alt` or `alt=""`.
- Portals do not remove dialog focus/name requirements.
- Follow separately installed component-library guidance for server-rendered imports; do not infer SSR entry points.

## React

- Use stable IDs such as `useId` for native ARIA relationships; do not derive IDs from translated labels or array indexes.
- Mount live-region hosts before messages and keep them mounted across conditional renders.
- After removing a focused list item, focus a logical surviving target after the commit.

## Angular

- For client routing, react to completed `NavigationEnd`, update `Title`, and focus after the destination renders.
- Prefer the installed design system or Angular CDK for overlays/focus management.
- Connect reactive-form errors to the rendered control and group-level errors to the group.

## Vue

- Run route focus after navigation and `nextTick`.
- Keep live-region hosts mounted rather than creating the host and message in the same `v-if` update.
- Teleport does not remove overlay naming, focus, or background-inertness requirements.

## Astro

- Use semantic server-rendered HTML and separately installed component guidance for custom elements.
- Apply route focus/status rules only when client navigation or an island replaces a meaningful view.
- Keep island boundaries from duplicating landmarks or live regions.

## Vanilla JS

- Prefer native elements, including `<dialog>.showModal()` for modal behavior.
- Update visual state and its native/ARIA state in the same event path.
- For custom elements, follow the installed component API; do not place guessed ARIA or IDREF attributes on the host.
