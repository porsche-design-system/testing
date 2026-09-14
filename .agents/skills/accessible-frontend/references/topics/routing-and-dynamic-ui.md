# Routing and dynamic UI

## Rules

- Give every route/view a descriptive document title (2.4.2) and coherent heading hierarchy. One route-level `h1` is the project convention, not a WCAG requirement.
- After a true client-side view change, update the title and, when focus does not already have a valid destination, move it after rendering to the new route heading or main-content target (`tabindex="-1"`). Do not override back/forward focus or scroll restoration, and do not move focus for hash navigation, filtering, pagination within the same view, or background refreshes.
- Add a polite route announcement only when focus does not communicate the change. Do not announce the same navigation twice.
- When focused content is deleted or replaced, apply the recovery rules in `references/topics/keyboard-and-focus.md`.
- Mark a changing content region `aria-busy="true"` only while its update is incomplete. Keep existing content available when possible and announce completion only when users need it.
- Preserve native link behavior, browser history, back/forward navigation, deep links, and scroll restoration.

Load `references/topics/framework-integration.md` for framework-specific lifecycle timing.
