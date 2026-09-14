# Links and navigation

## Rules

- Use a link for navigation to a URL and a button for an action in the current context. Do not make either from a clickable `div` or `span`.
- A link’s purpose is clear from its text or programmatically determined context (2.4.4). Prefer self-descriptive link text; do not claim that link-only purpose is required at Level AA. Avoid repeated “read more” links unless each purpose is programmatically distinguishable and its accessible name contains the visible text.
- Give the current route or step `aria-current="page"` or the applicable value through the installed component API.
- Mark breadcrumbs as a named navigation region, use a list, and expose the current page without linking it unnecessarily.
- Avoid adjacent image and text links to the same destination as separate focus stops. Combine them into one link or remove the duplicate interactive target; an image inside the retained link may use `alt=""` when the link text already names the destination.
- Disclose unusual behavior such as opening a new window or downloading a file when users would not expect it. Include file type and size when they affect the decision to activate the link.
- Preserve standard modifier-click, context-menu, copy-link, and browser-history behavior in router links.
- Use a skip link when composing a page whose main content follows substantial repeated navigation or chrome. Do not inject skip links during isolated navigation-component edits.
- For pages within a set, provide at least two ways to locate a page—such as navigation plus search, sitemap, table of contents, or contextual links—unless the page is a process step or result (2.4.5).
