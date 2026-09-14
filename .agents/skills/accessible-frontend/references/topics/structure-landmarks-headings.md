# Structure, landmarks, headings

## Rules

- Page language on `<html lang="...">` (3.1.1). Mark passages in another language (3.1.2).
- Give each route/view a descriptive `title` (2.4.2).
- Landmarks: `header`, `nav`, `main`, `search`, `aside`, `footer`. Use one visible `main`. Give repeated landmarks distinct names, preferably from visible headings.
- Use `section` for a thematic unit that normally has a heading and `article` for independently meaningful content. Use a plain container for visual grouping. Do not turn every card, tile, tab panel, or form step into a named region.
- Keep a coherent heading hierarchy. Headings and labels describe their topic or purpose (2.4.6). One route-level `h1` is the project convention, not a WCAG requirement. Reusable components accept or infer an appropriate heading level instead of always rendering `h1`.
- Preserve meaningful reading and focus sequence when CSS changes visual order (1.3.2, 2.4.3).
- Lists use `ul`/`ol`, not div stacks.
- Put breadcrumbs in a named navigation landmark and search controls in a search landmark or form with an accessible name.
- Load `references/topics/links-and-navigation.md` for link purpose/current-page behavior and `references/topics/images-and-media.md` for alternatives.
