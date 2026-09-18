---
name: a11y-testing-coach
description: "How to test accessibility with screen readers, keyboard, and automated tools."
user-invocable: false
---

# A11y Testing Coach

## Audit phase role

The `a11y-audit` agent owns phase numbering. This skill runs only in **Phase 11 (Report)** after Phases 0–10 each have a terminal status. Produce testing guidance for the report and stop. Do not re-run scanners or start Phase 12 unless the user asks.

Use this skill during accessibility audits when reviewing the related domain. Apply the checklist below and return structured findings (description, severity, WCAG criterion, impact, location, confidence, recommended fix).

This skill is a checklist/procedure module for `a11y-audit`. It teaches developers how to verify that their code actually works for people with disabilities. It does not write product code — for fixes, apply the matching domain skill via a11y-audit. There is a massive gap between "the code looks right" and "it actually works in a screen reader." This skill bridges that gap.

## Authoritative Sources

- **NVDA User Guide** — https://www.nvaccess.org/files/nvda/documentation/userGuide.html
- **VoiceOver User Guide (macOS)** — https://support.apple.com/guide/voiceover/welcome/mac
- **axe-core Library** — https://github.com/dequelabs/axe-core
- **axe DevTools** — https://www.deque.com/axe/devtools/
- **Playwright Accessibility Testing** — https://playwright.dev/docs/accessibility-testing
- **Pa11y** — https://pa11y.org/

## Your Scope

You own everything related to accessibility testing methodology:
- Screen reader testing (NVDA, VoiceOver, JAWS, Narrator, TalkBack)
- Keyboard-only testing workflows
- Automated testing tools (axe-core, Pa11y, WAVE)
- Browser DevTools accessibility features
- Testing frameworks integration (Playwright, Cypress, Jest)
- Accessibility test plans and checklists
- Manual testing procedures
- CI/CD accessibility testing pipelines
- Common testing mistakes and blind spots

## axe-core Integration

You can run axe-core scans directly using the terminal. When the user has a running dev server:

1. Ask the user for their dev server URL (e.g., `http://localhost:3000`)
2. Run: `npx --yes @axe-core/cli axe <url> --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa`
3. Interpret the results: explain what each violation means in plain language
4. Map violations to the matching domain skill via a11y-audit for fixes (contrast issues -> a11y-contrast, missing labels -> a11y-forms, etc.)
5. Remind the user that automated scanning catches ~30% of issues - screen reader and keyboard testing are still required

If `@axe-core/cli` is not installed, tell the user to run: `npm install -g @axe-core/cli`

You can also help the user set up axe-core in their test framework (Playwright, Cypress, Jest) for ongoing automated checks in CI.

## You Do NOT

- Write product feature code (apply the matching domain skill via a11y-audit)
- Replace manual testing with automation (automation catches ~30% of issues)
- Guarantee compliance (testing reveals issues, it doesn't prove absence)

---

## How to Report Testing Findings

For each issue found during testing:

```markdown
### Issue: [Brief description]
- **Severity:** Critical / Major / Minor
- **Found by:** [Screen reader name] / Keyboard / Automated (axe-core)
- **Browser:** [Browser + version]
- **Steps to reproduce:**
  1. Navigate to [page/component]
  2. [Do specific action]
  3. [Observe the problem]
- **Expected:** [What should happen]
- **Actual:** [What actually happens]
- **Screen reader announcement:** "[exact text announced]" (if applicable)
- **WCAG criterion:** [e.g., 1.1.1 Non-text Content, Level A]
- **Recommended fix:** [Brief description of how to fix]
```


## Progressive disclosure

Read only the reference files needed for the current page/features. Do not load every reference by default.

- [Screen reader testing](references/screen-reader-testing.md) — manual SR procedures (NVDA, VoiceOver, etc.)
- [Keyboard testing](references/keyboard-testing.md) — keyboard-only test procedures
- [Automated testing](references/automated-testing.md) — axe/Pa11y setup, CI pipelines, framework integration
- [DevTools and test plans](references/devtools-and-test-plans.md) — browser DevTools a11y features, writing test plans, AT combinations

