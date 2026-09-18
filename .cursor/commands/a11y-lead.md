---
description: Review specific web UI files for WCAG 2.2 AA using the a11y-audit agent
  in review mode (loads domain skills on demand).
---

# Accessibility Review

Run a focused accessibility review of web UI code using the **a11y-audit** agent in review mode. Load domain skills on demand.

## Component to Review

**File(s):** `${input:files}`

## Instructions

When the target provides the **a11y-audit** agent, use it. Otherwise execute this prompt directly with the installed `a11y-*` skills and preserve the workflow order and safety requirements below.

### Step 1: Gather Context

Ask the user (structured choices when possible):

1. **Component type** -- Button, form, modal, navigation, data table, media player, custom widget?
2. **Framework** -- React, Vue, Angular, Svelte, vanilla HTML?
3. **Interactivity** -- Static content, dynamic updates, user input, navigation?
4. **Existing issues** -- Known accessibility problems or specific concerns?

### Step 2: Read Component Code

Read all relevant files:

- Component source (JSX/TSX/Vue/HTML)
- Stylesheets (CSS/SCSS/Tailwind)
- Related components (child/parent components)
- Event handlers and state management

### Step 3: Load Domain Skills and Review

Read and apply domain skills based on component features (checklist modules for `a11y-audit`):

**Always load:**

- `a11y-keyboard` -- Tab order, focus management, keyboard shortcuts
- `a11y-alt-text-headings` -- Images, heading structure, landmarks, language
- `a11y-text-quality` -- Alt text quality, aria-label template variables

**Conditionally load:**

- `a11y-aria` -- Interactive widgets, custom components, ARIA usage
- `a11y-modal` -- Modals, dialogs, drawers, overlays
- `a11y-forms` -- Form inputs, validation, error messages
- `a11y-contrast` -- Colors, themes, focus indicators
- `a11y-live-regions` -- Dynamic content updates, notifications
- `a11y-tables` -- Data tables, grids
- `a11y-links` -- Hyperlinks (check for "click here", "read more")
- `a11y-media` -- Video/audio captions and media alternatives
- `a11y-cognitive` -- Cognitive load, plain language, auth patterns
- `a11y-design-system` -- Token contrast, focus rings, spacing
- `a11y-framework` -- When stack is known

### Step 4: Synthesize Findings

Compile findings into a single review:

1. **Critical Issues** -- WCAG failures that block users
2. **Important Issues** -- Degraded experience, workarounds needed
3. **Recommendations** -- Best practices, future-proofing
4. **Positive Notes** -- What's already done well

### Step 5: Create `.github/.a11y-reviewed` Marker

If all critical issues are resolved, create the marker file to unlock UI edits for this session.

## Expected Output

- Comprehensive accessibility review with WCAG criterion references
- Prioritized issue list with remediation steps
- Code examples for fixes (framework-specific)
- Session marker created if review passes