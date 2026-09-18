# SVG, Icons, Media, and Figures

## SVG Accessibility

### Inline SVGs

```html
<!-- Meaningful inline SVG -->
<svg role="img" aria-labelledby="svg-title svg-desc">
  <title id="svg-title">Monthly Sales</title>
  <desc id="svg-desc">Bar chart showing sales increasing from $10K in January to $45K in June</desc>
  <!-- SVG content -->
</svg>

<!-- Decorative inline SVG -->
<svg aria-hidden="true" focusable="false">
  <!-- SVG content -->
</svg>
```

Requirements for meaningful SVGs:
- `role="img"` on the `<svg>` element
- `<title>` element as the first child (acts as the accessible name)
- `<desc>` element for longer descriptions
- `aria-labelledby` referencing both title and desc IDs
- Do NOT add `focusable="false"` on meaningful SVGs

Requirements for decorative SVGs:
- `aria-hidden="true"` on the `<svg>` element
- `focusable="false"` to prevent IE/Edge focus issues
- No `<title>` or `<desc>` elements

### SVGs in Buttons and Links

```html
<!-- Icon with visible text: hide the SVG -->
<button>
  <svg aria-hidden="true" focusable="false">...</svg>
  Save document
</button>

<!-- Icon-only button: label the button, hide the SVG -->
<button aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>

<!-- Icon-only link -->
<a href="/settings" aria-label="Settings">
  <svg aria-hidden="true" focusable="false">...</svg>
</a>
```

Never give the SVG an accessible name AND label the parent button/link -- that creates double announcements.

## Icon Fonts

Icon fonts are worse than SVGs for accessibility but still common:

```html
<!-- Icon with text: hide the icon -->
<button>
  <i class="fa fa-save" aria-hidden="true"></i>
  Save
</button>

<!-- Icon-only: hide the icon, label the parent -->
<button aria-label="Delete item">
  <i class="fa fa-trash" aria-hidden="true"></i>
</button>
```

- Always `aria-hidden="true"` on icon font elements
- Never rely on icon font ligatures for accessible names
- The accessible name goes on the interactive parent, never on the icon

## Video and Audio

For full WCAG 1.2.x captions, audio description, live media, and player checks, **Read and apply the `a11y-media` skill**. Summary requirements:

### Video

```html
<video controls aria-label="Product demo walkthrough">
  <source src="demo.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English captions" default>
  <track kind="descriptions" src="descriptions.vtt" srclang="en" label="Audio descriptions">
  Your browser does not support video.
</video>
```

Requirements:
- Captions for all spoken content (WCAG 1.2.2)
- Audio descriptions for important visual content not described in the audio track (WCAG 1.2.5)
- `controls` attribute so users can pause, stop, adjust volume
- No autoplay (or muted autoplay with visible play/pause control)
- Transcript recommended as an alternative
- `aria-label` or visible heading to identify the video

### Audio

```html
<audio controls aria-label="Episode 42: Accessibility in 2025">
  <source src="podcast.mp3" type="audio/mpeg">
</audio>
<a href="transcript-ep42.html">Read transcript for Episode 42</a>
```

Requirements:
- Transcript for all audio content (WCAG 1.2.1)
- `controls` attribute
- No autoplay

## Figures and Figcaptions

Use `<figure>` and `<figcaption>` for images with captions:

```html
<figure>
  <img src="dashboard.png" alt="Analytics dashboard showing 45% increase in mobile traffic over 6 months">
  <figcaption>Figure 3: Mobile traffic growth from January to June 2025</figcaption>
</figure>
```

**Critical rules per W3C Images Tutorial:**
- The `<img>` inside a `<figure>` still MUST have `alt` text -- `<figcaption>` does NOT replace `alt`
- `<figcaption>` provides a visible caption for ALL users; `alt` provides the text alternative for screen readers
- They should complement each other but not be identical (avoids double-reading)
- `<figcaption>` must be the first or last child of `<figure>`
- A `<figure>` can contain content other than images (code blocks, quotes, tables)

