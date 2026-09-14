# WCAG 2.2 Visual Requirements and Tailwind

## WCAG 2.2 Visual Requirements

### Focus Appearance (2.4.13 -- Level AAA, recommended)

This criterion defines what a *sufficient* focus indicator looks like. While AAA, it is the authoritative specification for focus indicator quality and should guide all implementations.

**Requirements per W3C Understanding doc:**
- The focus indicator has a minimum area of a **2px thick perimeter** of the focused component
- The indicator has **3:1 contrast** between its focused and unfocused states (the change-of-contrast test)
- The indicator is not entirely obscured by author-created content

**Relationship to Non-Text Contrast (1.4.11):** Focus Appearance measures the *change between* focused and unfocused states. Non-Text Contrast measures the indicator contrast *against adjacent colors within* a single state. Both must be satisfied.

**C40 Two-Color Focus Technique:**
```css
/* Two concentric outlines ensure visibility on any background */
:focus-visible {
  outline: 2px solid #000000;      /* Dark inner ring */
  outline-offset: 2px;
  box-shadow: 0 0 0 4px #ffffff;   /* Light outer ring */
}
```

**Rules for inset focus indicators:** An inset (inner) outline must be thicker than 2px because it reduces the component's visible area instead of adding to it. Use 3px+ for inset indicators.

### Target Size (2.5.8 -- Level AA)

Interactive targets must be at least **24x24 CSS pixels**, or have sufficient spacing from adjacent targets so that a 24px diameter circle centered on each target does not overlap another target.

```css
/* Ensure small targets like icon buttons meet minimum size */
.icon-button {
  min-width: 24px;
  min-height: 24px;
}

/* Better: use 44x44px for comfortable touch targets (per WCAG 2.5.5 Level AAA) */
.touch-target {
  min-width: 44px;
  min-height: 44px;
}
```

**Exceptions (per W3C Understanding doc):**
- **Spacing exception:** Targets smaller than 24px pass if there is sufficient spacing around them (the 24px circle test passes)
- **Inline:** Targets within a sentence or paragraph of text (underlined links in body copy)
- **User agent default:** Unmodified browser-default controls
- **Essential:** A specific presentation is legally or functionally essential

**What to flag:**
- Icon-only buttons under 24x24px without spacing compensation
- Dense button groups or toolbars where targets overlap the 24px circle
- Mobile nav items or filter chips under 24x24px

### Text Spacing (1.4.12 -- Level AA)

Content must not be clipped or lost when users override text spacing to these minimums:
- Line height: 1.5x font size
- Letter spacing: 0.12x font size
- Word spacing: 0.16x font size
- Paragraph spacing: 2x font size

```css
/* Test text spacing overrides -- content must remain readable */
p {
  line-height: 1.5 !important;
  letter-spacing: 0.12em !important;
  word-spacing: 0.16em !important;
  margin-bottom: 2em !important;
}
```

**What to flag:**
- Fixed-height containers with `overflow: hidden` that would clip expanded text
- CSS that overrides `line-height` with absolute values (`line-height: 16px` instead of `line-height: 1.5`)
- Layouts that break when paragraph margins increase

### Content Reflow (1.4.10 -- Level AA)

Content must reflow to a single column at 320 CSS pixels width (equivalent to 400% zoom on a 1280px viewport) without requiring horizontal scrolling.

**What to flag:**
- `min-width` or fixed `width` values that prevent reflow below 320px
- Horizontal scroll appearing at 400% zoom
- Two-dimensional scrolling for content (tables and complex data visualizations are exempt)
- `overflow: hidden` on the viewport or main containers

## Tailwind-Specific Guidance

Common Tailwind classes that fail contrast on white backgrounds:
- `text-gray-400` (#9CA3AF) -- 2.85:1, FAILS
- `text-gray-500` (#6B7280) -- 4.64:1, passes AA normal text
- `text-gray-300` (#D1D5DB) -- 1.74:1, FAILS badly

Common Tailwind classes that fail on dark backgrounds (`bg-gray-900` #111827):
- `text-gray-500` (#6B7280) -- 3.41:1, FAILS normal text
- `text-gray-400` (#9CA3AF) -- 5.51:1, passes
- `text-gray-600` (#4B5563) -- 2.11:1, FAILS

Always verify. Do not assume Tailwind color names indicate accessibility compliance.

