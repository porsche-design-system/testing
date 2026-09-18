# DevTools and Test Plans

## Browser DevTools Accessibility Features

### Chrome

1. **Accessibility Tree:** Elements panel > Accessibility tab - shows what the browser exposes to assistive technology
2. **Contrast Checker:** Elements panel > Styles > hover over a color - shows contrast ratio and AA/AAA pass/fail
3. **CSS Overview:** More tools > CSS Overview > Capture overview - shows all low-contrast text on the page
4. **Rendering:** More tools > Rendering > Emulate vision deficiencies - simulate color blindness, blurred vision
5. **Forced element state:** Elements panel > right-click element > Force state > :focus - check focus styles without tabbing

### Firefox

1. **Accessibility Inspector:** DevTools > Accessibility tab - the best built-in accessibility tool in any browser
2. **Check for issues:** Accessibility tab > dropdown > "All Issues" - runs automated checks
3. **Simulate:** Accessibility tab > Simulate > various vision deficiencies
4. **Tab order overlay:** Accessibility tab > "Show Tabbing Order" - shows numbered tab order on the page

### Edge

Same as Chrome (Chromium-based), plus:
1. **Accessibility tree in Elements panel**
2. **ARIA validation warnings** in Issues panel

### VS Code Integrated Browser (VS Code 1.113+)

VS Code 1.113 builds on the integrated browser introduced in 1.112. It remains excellent for accessibility testing because you never leave VS Code, and it now handles local HTTPS with self-signed certificates more smoothly.

**Setup:**

1. Create or modify `launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "editor-browser",
      "request": "launch",
      "name": "A11y Test: Integrated Browser",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}"
    }
  ]
}
```

2. Start your dev server (`npm run dev` or equivalent)
3. Press F5 to launch the integrated browser

**Accessibility Testing Features:**

- **Independent zoom:** The integrated browser has its own zoom level (separate from VS Code's). Use Ctrl+= / Ctrl+- to test WCAG 1.4.4 (Resize Text) and 1.4.10 (Reflow) directly.
- **DevTools access:** Right-click > Inspect to open DevTools inside VS Code with the Accessibility Tree, contrast checker, and CSS Overview.
- **Screenshot capture:** Agents can capture screenshots of the integrated browser, enabling visual accessibility analysis with image-capable models.
- **Breakpoint debugging:** Set breakpoints on focus handlers, keyboard event listeners, and ARIA updates to debug accessibility issues in real-time.

**Testing Workflow:**

1. Launch the integrated browser with your app
2. Open DevTools > Accessibility tab
3. Use "Show Tabbing Order" to visualize tab sequence
4. Test keyboard navigation without switching windows
5. Run axe-core via Playwright tests or the browser console
6. Debug any focus management issues with breakpoints

**Zoom Testing (WCAG 1.4.4 / 1.4.10):**

The `workbench.browser.pageZoom` setting controls the default zoom level. To test reflow:

1. Set browser zoom to 400% (or use Ctrl+= repeatedly)
2. Verify content reflows to single column
3. No horizontal scrolling required
4. No content or functionality lost

**Limitations:**

- DevTools accessibility features depend on Chromium - same as Chrome/Edge
- Not a replacement for real screen reader testing
- Cannot emulate mobile screen readers (TalkBack/VoiceOver iOS)

---

## Writing Accessibility Test Plans

### Template for a Feature

```markdown
## Accessibility Test Plan: [Feature Name]

### Prerequisites
- Screen reader: NVDA (latest) on Windows, VoiceOver on macOS
- Browsers: Chrome, Firefox, Safari
- Keyboard only (no mouse)

### Automated Checks
- [ ] axe-core reports zero violations
- [ ] Pa11y CI passes

### Keyboard Testing
- [ ] All interactive elements reachable via Tab
- [ ] Tab order follows visual layout
- [ ] Enter/Space activates all buttons
- [ ] Escape closes all overlays
- [ ] Focus returns to trigger after overlay closes
- [ ] No keyboard traps
- [ ] Focus visible on all interactive elements

### Screen Reader Testing (NVDA)
- [ ] Page title announced on load
- [ ] Headings list (NVDA+F7) shows logical hierarchy
- [ ] All form fields announce their labels
- [ ] All buttons announce their purpose
- [ ] All links announce their destination
- [ ] Error messages announce when they appear
- [ ] Dynamic content changes are announced
- [ ] Images announce meaningful alt text (or are hidden if decorative)

### Screen Reader Testing (VoiceOver)
- [ ] Rotor shows headings, landmarks, form controls, links
- [ ] All interactions work with VO+Space
- [ ] Tables navigable with VO+Arrow keys
- [ ] Same checks as NVDA above

### Visual Testing
- [ ] All text meets 4.5:1 contrast ratio (3:1 for large text)
- [ ] Focus indicators meet 3:1 contrast
- [ ] No information conveyed by color alone
- [ ] Works at 200% zoom
- [ ] Works at 320px viewport width (reflow)
- [ ] prefers-reduced-motion respected (if animations present)

### User Journey
- [ ] Complete the task using only keyboard
- [ ] Complete the task using only NVDA
- [ ] Complete the task using only VoiceOver
- [ ] Note any confusion, delays, or extra steps required
```

### Common Testing Mistakes

1. **Only testing with automation** - catches ~30% of issues. You must manually test.
2. **Testing in only one browser** - screen reader + browser combinations behave differently
3. **Testing only the happy path** - test error states, empty states, loading states
4. **Not testing after interaction** - modals, AJAX loads, client-side routing change the DOM
5. **Assuming "it works in Chrome" means it works** - test Firefox + NVDA and Safari + VoiceOver at minimum
6. **Not testing zoom** - content at 200% zoom must remain usable
7. **Not testing with real content** - placeholder text of equal length behaves differently than real, variable-length content
8. **Running axe once and declaring victory** - axe should run in CI on every PR

---

## Recommended Testing Combinations

These represent the majority of real-world assistive technology usage:

| Screen Reader | Browser | OS | Market Share |
|---------------|---------|-----|-------------|
| NVDA | Firefox | Windows | ~30% |
| NVDA | Chrome | Windows | ~20% |
| JAWS | Chrome | Windows | ~20% |
| VoiceOver | Safari | macOS | ~10% |
| VoiceOver | Safari | iOS | ~15% |
| TalkBack | Chrome | Android | ~5% |

**Minimum viable testing:** NVDA + Firefox, VoiceOver + Safari. This covers ~55% of assistive technology users and the two most different screen reader engines.

---

