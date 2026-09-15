# Headings, Landmarks, Titles, and Language

## Heading Structure -- The Rules

### Rule 1: Exactly One H1 Per Page

```html
<!-- GOOD -->
<h1>Shopping Cart</h1>
<h2>Your Items</h2>
<h3>Widget Pro</h3>
<h2>Order Summary</h2>

<!-- BAD: Multiple H1s -->
<h1>My Store</h1>
<h1>Shopping Cart</h1>
```

The H1 is the page title. It describes the purpose of the entire page. There is exactly one.

### Rule 2: Never Skip Levels

```html
<!-- GOOD -->
<h1>Products</h1>
  <h2>Electronics</h2>
    <h3>Laptops</h3>
    <h3>Phones</h3>
  <h2>Clothing</h2>
    <h3>Shirts</h3>

<!-- BAD: Skipped H2 -->
<h1>Products</h1>
  <h3>Electronics</h3>  <!-- WRONG: Jumped from H1 to H3 -->
```

Screen reader users navigate by headings. Skipped levels make them think they missed content.

### Rule 3: Headings Can Return to Higher Levels

```html
<!-- This is perfectly valid -->
<h1>Blog</h1>
  <h2>Latest Post</h2>
    <h3>Introduction</h3>
    <h3>Main Points</h3>
  <h2>Previous Post</h2>   <!-- Returning to H2 is fine -->
    <h3>Summary</h3>
```

Going from H3 back to H2 is correct -- it starts a new section at the H2 level.

### Rule 4: Never Choose Heading Level for Visual Appearance

```html
<!-- BAD: Using H4 because it "looks right" -->
<h4>Welcome to our site</h4>  <!-- Should be H1 if it's the page heading -->

<!-- GOOD: Use CSS for visual appearance -->
<h1 class="text-lg font-normal">Welcome to our site</h1>
```

Heading level communicates document structure, not visual design. Use CSS to control how headings look.

### Rule 5: Headings Must Be Descriptive

```html
<!-- BAD -->
<h2>Section 1</h2>
<h2>More Info</h2>
<h2>Details</h2>

<!-- GOOD -->
<h2>Pricing Plans</h2>
<h2>Customer Testimonials</h2>
<h2>Frequently Asked Questions</h2>
```

Screen reader users can pull up a list of all headings on the page. "Section 1" in a list is useless.

### Rule 6: Modal Headings Start at H2

```html
<!-- Page (behind modal) -->
<h1>Dashboard</h1>

<!-- Modal -->
<dialog>
  <h2>Settings</h2>           <!-- H2, not H1 -->
    <h3>Notifications</h3>
    <h3>Privacy</h3>
</dialog>
```

The page H1 remains the H1. Modal content is subordinate.

## Document Outline Verification

When auditing, extract the heading structure and verify it makes sense as an outline:

```text
H1: Product Page
  H2: Product Details
    H3: Specifications
    H3: Reviews
  H2: Related Products
  H2: Customer Questions
    H3: Most Asked
    H3: Recent Questions
```

This should read like a table of contents. If it doesn't make sense as an outline, the headings are wrong.

## Page Titles

```html
<title>Shopping Cart - Acme Store</title>
```

- Format: "Page Name - Site Name"
- Must be unique for every page
- Must describe the page purpose
- Updated on SPA route changes
- Screen readers announce the title first when a page loads

```javascript
// SPA route change
document.title = 'Product Details - Acme Store';
```

## Language Attributes (WCAG 3.1.1 / 3.1.2)

```html
<!-- Page language -->
<html lang="en">

<!-- Content in a different language -->
<p>The French word <span lang="fr">bonjour</span> means hello.</p>
```

### Language of page (3.1.1 Level A)

- `lang` on `<html>` is mandatory and must match the primary page language
- Use correct BCP 47 language codes: `en`, `es`, `fr`, `de`, `ja`, `zh`, `ar`, `en-GB`, etc.
- Framework apps: set `lang` on the document shell (e.g. Next.js `_document` / root layout), not only in a React fragment

### Language of parts (3.1.2 Level AA)

- Passages, quotes, labels, or navigation items in another language need `lang` on the containing element
- Do not mark proper names, technical terms, or words of indeterminate language unless pronunciation would be wrong without it
- Bidirectional / RTL content: ensure `dir` is correct when language changes imply direction (`dir="rtl"` with `lang="ar"` / `lang="he"`)
- Screen readers use `lang` to switch pronunciation — wrong or missing `lang` causes garbled speech

## Landmark Structure

```html
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <header>
    <nav aria-label="Main navigation">...</nav>
  </header>
  <main id="main" tabindex="-1">
    <h1>Page Title</h1>
    ...
  </main>
  <aside aria-label="Related articles">...</aside>
  <footer>...</footer>
</body>
```

- One `<main>` per page
- `<header>` and `<footer>` at page level (not inside `<main>`)
- Multiple `<nav>` elements need `aria-label` to differentiate
- `<aside>` for complementary content
- Do not add redundant ARIA roles to semantic landmarks

