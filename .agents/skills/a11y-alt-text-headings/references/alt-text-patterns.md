# Alt Text Patterns

## W3C Image Categories

The W3C WAI Images Tutorial defines seven image categories. Identifying the category determines the correct alt text approach:

| Category | Purpose | Alt Text Approach |
|----------|---------|-------------------|
| **Informative** | Conveys information (photos, illustrations) | Describe the content concisely |
| **Decorative** | Visual embellishment only | `alt=""` (empty string) |
| **Functional** | Inside a link or button | Describe the action/destination, not the image |
| **Text images** | Contain readable text | Alt text = the text in the image |
| **Complex** | Charts, diagrams, infographics | Short alt + long description |
| **Groups** | Multiple images forming a single concept | One image gets full alt, others get `alt=""` |
| **Image maps** | Clickable regions within an image | Each `<area>` gets its own `alt` |

**Context determines category:** The same image of a phone could be informative ("Samsung Galaxy S24"), functional ("Buy Samsung Galaxy S24"), or decorative (background lifestyle photo) depending on its role on the page.

## The `<picture>` Element

The `<picture>` element provides art direction for responsive images. The `alt` goes on the inner `<img>`, not on `<picture>`:

```html
<picture>
  <source media="(min-width: 800px)" srcset="hero-wide.jpg">
  <source media="(min-width: 400px)" srcset="hero-medium.jpg">
  <img src="hero-small.jpg" alt="Sunset over the Golden Gate Bridge">
</picture>
```

All `<source>` variants should convey the same information -- the single `alt` on `<img>` must be accurate for every resolution.

## CSS Background Images

CSS background images are invisible to screen readers. They must be purely decorative:

```css
/* GOOD: purely decorative background */
.hero-section {
  background-image: url('abstract-pattern.svg');
}
```

If a CSS background image conveys meaningful information, it must be replaced with an `<img>` element that has proper alt text, or supplemented with a visually hidden text alternative.

## Logo Alt Text

Logo images should have alt text that identifies the company/organization, not describe the logo:

```html
<!-- GOOD -->
<a href="/"><img src="logo.svg" alt="Acme Corporation"></a>

<!-- BAD: describes appearance -->
<a href="/"><img src="logo.svg" alt="Blue circle with white A"></a>

<!-- BAD: redundant "logo" -->
<a href="/"><img src="logo.svg" alt="Acme Corporation logo"></a>

<!-- BAD: states the obvious -->
<a href="/"><img src="logo.svg" alt="Home page"></a>
```

When the logo is a link (usually to the home page), the alt text should identify the company. Screen readers already announce "link" so "home page" is unnecessary. If the logo is purely decorative (not a link, company name is visible nearby), use `alt=""`.

## Form Image Buttons

Image buttons in forms describe the function, not the image:

```html
<!-- GOOD: describes the function -->
<input type="image" src="search-icon.png" alt="Search">
<input type="image" src="go-arrow.png" alt="Submit order">

<!-- BAD: describes appearance -->
<input type="image" src="search-icon.png" alt="Magnifying glass icon">
```

## Alternative Text -- The Rules

### Rule 1: Every `<img>` Gets an `alt` Attribute

No exceptions. The question is what goes in it.

```html
<!-- Meaningful image: describe the content -->
<img src="team-photo.jpg" alt="The engineering team at the 2025 company retreat, standing in front of the main office">

<!-- Decorative image: empty alt -->
<img src="decorative-swirl.png" alt="">

<!-- Linked image: describe the destination -->
<a href="/profile">
  <img src="avatar.jpg" alt="Your profile">
</a>
```

### Rule 2: Describe Content, Not Appearance

```html
<!-- BAD: Describes what it looks like -->
<img src="graph.png" alt="A blue bar chart with 5 bars">

<!-- GOOD: Describes what it communicates -->
<img src="graph.png" alt="Quarterly revenue: Q1 $2M, Q2 $2.5M, Q3 $3.1M, Q4 $3.8M, Q5 $4.2M">

<!-- BAD: Redundant with context -->
<h2>Our CEO</h2>
<img src="ceo.jpg" alt="Photo of our CEO">

<!-- GOOD: Adds information -->
<h2>Our CEO</h2>
<img src="ceo.jpg" alt="Sarah Chen speaking at the 2025 developer conference">
```

### Rule 3: Functional Images Describe the Action

When an image is inside a link or button, the alt text describes where it goes or what it does, not what the image looks like.

```html
<!-- Logo that links to home -->
<a href="/">
  <img src="logo.svg" alt="Acme Corp home page">
</a>

<!-- Social media icon link -->
<a href="https://twitter.com/acme">
  <img src="twitter-icon.png" alt="Acme Corp on Twitter">
</a>

<!-- Image button -->
<button>
  <img src="print-icon.png" alt="Print this page">
</button>
```

### Rule 4: Decorative Images Are Hidden

Images that add no information -- visual flourishes, spacers, backgrounds, dividers:

```html
<img src="divider.png" alt="" aria-hidden="true">
<img src="background-pattern.png" alt="" role="presentation">
```

Both `alt=""` and `role="presentation"` work. Use `alt=""` as the primary method. Add `aria-hidden="true"` as reinforcement for SVGs and complex decorative elements.

### Rule 5: Complex Images Need Long Descriptions

For charts, diagrams, infographics, and data visualizations that cannot be adequately described in a short alt text:

```html
<!-- Method 1: Adjacent visible description -->
<figure>
  <img src="org-chart.png" alt="Company organizational chart. Full description below.">
  <figcaption>
    <details>
      <summary>Full description of organizational chart</summary>
      <p>The CEO reports to the board. Three VPs report to the CEO: VP Engineering (5 teams, 47 people), VP Product (3 teams, 18 people), VP Marketing (4 teams, 22 people)...</p>
    </details>
  </figcaption>
</figure>

<!-- Method 2: aria-describedby for longer descriptions -->
<img src="flowchart.png" alt="User registration flow" aria-describedby="flow-desc">
<div id="flow-desc" class="visually-hidden">
  Step 1: User enters email. Step 2: System checks if email exists. If yes, show login prompt. If no, proceed to step 3...
</div>
```

