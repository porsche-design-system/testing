---
name: a11y-issue-fixer
description: "Apply auto-fixable and guided accessibility fixes to web source code from an audit report."
user-invocable: false
---

# A11y Issue Fixer

## Audit phase role

The `a11y-audit` agent owns phase numbering. This skill runs only in **Phase 12 (Fix / verify)** after the Phase 11 report exists. Apply one requested fix pass, report Applied / Skipped / Needs approval, and stop. Do not restart Phases 1–11 unless the user asks for a re-scan.

Use this skill from the a11y-audit agent when this capability is needed. Return structured results to the orchestrating audit.

## Authoritative Sources

- **WCAG 2.2 Specification** — https://www.w3.org/TR/WCAG22/
- **WAI-ARIA 1.2 Specification** — https://www.w3.org/TR/wai-aria-1.2/
- **ARIA Authoring Practices Guide (APG)** — https://www.w3.org/WAI/ARIA/apg/
- **axe DevTools Rules** — https://accessibilityinsights.io/info-examples/web/
- **HTML Living Standard** — https://html.spec.whatwg.org/

This skill is the checklist/procedure module for applying accessibility fixes from an audit report. It is the **sole fix policy** for `a11y-audit`. Receive issues with locations and apply fixes to source code per the categories below.

## Fix Categories

### Auto-Fixable (apply without asking)

These are safe, deterministic fixes with no risk of breaking behavior:

| Issue | Fix | Confidence |
|-------|-----|------------|
| Missing `lang` on `<html>` | Add `lang="en"` (or detected language) | High |
| Missing viewport meta | Add `<meta name="viewport" content="width=device-width, initial-scale=1">` | High |
| Positive `tabindex` (1, 2, etc.) | Replace with `tabindex="0"` or remove | High |
| `outline: none` without alternative | Add `outline: 2px solid` with `:focus-visible` | High |
| Missing `<label>` for input | Add `<label>` with matching `for`/`id` | High |
| Button without accessible name | Add `aria-label` if icon-only; otherwise add text | Medium |
| Missing `autocomplete` on identity fields | Add `autocomplete="name"`, `"email"`, `"tel"`, etc. | High |
| New tab link without warning | Add `<span class="sr-only">(opens in new tab)</span>` | High |
| Missing `scope` on `<th>` | Add `scope="col"` or `scope="row"` | High |
| Missing `type` on `<button>` | Add `type="button"` (prevents accidental form submission) | High |
| Decorative image already marked but missing `alt` | Add `alt=""` only when already `aria-hidden="true"`, `role="presentation"`, or `role="none"` | High |

**Never** auto-fix a bare `<img>` missing `alt` with `alt=""`. That can silence content images. Treat unknown missing-alt as human-judgment.

### Human-Judgment (show fix, ask for approval)

These require context only the user can provide:

| Issue | Why Human Needed |
|-------|-----------------|
| `<img>` (or equivalent) missing `alt` when purpose is unknown | Must confirm decorative vs meaningful; only then `alt=""` or meaningful text |
| Alt text content for meaningful images | Only user knows the image's purpose |
| Heading hierarchy restructuring | May affect visual design and content flow |
| Link text rewriting | Context-dependent, UX copy implications |
| ARIA role assignment on custom widgets | Depends on intended interaction pattern |
| ARIA role changes (e.g. `menuitem` to `menuitemradio`) | Role changes break JS selectors and may alter UX; requires multi-file impact check |
| Removing or changing `aria-keyshortcuts`, `title`, or documented attributes | These indicate intentional design; removal requires explicit user approval |
| Live region placement and politeness | Depends on UX intent for dynamic content |
| Color/contrast changes | May conflict with brand guidelines |

### ARIA Role Change Safety

ARIA role changes are **never auto-fixable**. Before proposing any role change:

1. **Search all workspace files** for selectors that reference the current role (e.g., `querySelectorAll('[role="menuitem"]')`).
2. **List every file and line** that would need to be updated alongside the HTML change.
3. **Check if the existing code works** with assistive technology. If it does, flag it as Minor and explain that the change is for spec conformance only.
4. **Present the full scope** to the user: HTML changes, JavaScript selector updates, CSS selector updates, and any attributes that would be added or removed.
5. **Never change a role in HTML without updating all corresponding JavaScript and CSS** in the same operation.

## Framework-Specific Fix Syntax

Apply fixes using the correct syntax for the detected framework:

| Framework | Label Syntax | Event Syntax | Conditional Rendering |
|-----------|-------------|-------------|----------------------|
| React/Next.js | `htmlFor` | `onClick`, `onKeyDown` | `{condition && <X/>}` |
| Vue | `for` | `@click`, `@keydown` | `v-if`, `v-show` |
| Angular | `for` | `(click)`, `(keydown)` | `*ngIf` |
| Svelte | `for` | `on:click`, `on:keydown` | `{#if condition}` |
| HTML | `for` | `onclick`, `onkeydown` | N/A |

## Fix Process

1. Read the issue details (file path, line number, issue description)
2. Read the source file to understand context
3. Determine the correct framework syntax
4. Apply the fix using the Edit tool
5. Report what was changed (before/after)

## Output Format

For each fix applied, return:
```text
Fix #[n]: [issue description]
  File: [path]:[line]
  Before: [original code snippet]
  After:  [fixed code snippet]
  Status: Applied / Skipped (reason) / Needs approval
```

---

## Reliability

### Role

This skill is a procedure module for `a11y-audit`. This skill may modify source when applying approved fixes. Every modification requires user confirmation.

### Action Constraints

You may:
- Apply auto-fixable changes (missing alt attributes, ARIA labels, missing form labels, semantic element swaps) ONLY after user confirms each fix
- Determine framework-correct syntax before editing
- Report before/after for each change

You may NOT:
- Apply fixes without user confirmation
- Modify files outside the scope provided by `a11y-audit`
- Change application logic or behavior beyond accessibility fixes
- Remove existing functionality to resolve an accessibility issue
- Change ARIA roles without first searching for all JavaScript/CSS selectors that reference the current role
- Remove `aria-keyshortcuts`, `title`, or other documented attributes without explicit user approval

### Revert-First Policy

If a user reports that a fix broke working functionality:
1. **First action:** Offer to revert the change immediately to restore the working state
2. **Second:** Ask the user what the intended behavior was
3. **Third:** Only re-implement after understanding the full intent and multi-file impact
4. Never attempt to "fix forward" a breaking change - always revert to working state first

### Output Contract

For each fix, return:
- `fix_number`: sequential identifier
- `issue`: description of what was wrong
- `file`: path and line number
- `before`: original code snippet
- `after`: fixed code snippet
- `status`: `Applied` | `Skipped (reason)` | `Needs approval`
- `verification`: `PASS` | `FAIL` | `SKIPPED` | `NOT_AVAILABLE`
- `playwright_result`: structured result from Playwright verifier (if available)

### Playwright Verification (Optional)

When a dev server URL is available, verify fixes behaviourally rather than assuming they worked. Read `a11y-playwright` and follow [fix-verification.md](../../../apm_modules/porsche-design-system/skills/packages/web-accessibility-audit/.apm/skills/a11y-playwright/references/fix-verification.md) — it maps each `fix_type` to the narrowest scan that proves the fix, using the shipped `scripts/a11y-scan.mjs` runner.

The CLI runner is the primary path. Playwright MCP tools, when present, are an optional substitute for the equivalent scan mode.

Set the output contract fields from the verdict:

- `verification`: `PASS`, `FAIL`, or `NOT_AVAILABLE`
- `playwright_result`: the structured verdict (scan mode, before/after values, any new violations)

A `REGRESSION` verdict — original issue fixed but new violations introduced — triggers the Revert-First Policy above.

**Graceful degradation:**

- No dev server URL: skip verification, set `verification: "NOT_AVAILABLE"`.
- Playwright not installed: skip verification, set `verification: "NOT_AVAILABLE"`, and report the install command.
- `@axe-core/playwright` missing: keyboard, contrast, and tree verification still work; axe-based state checks report as skipped.

Never report `PASS` from source inspection alone. Unverified fixes are `NOT_AVAILABLE`, not passes.

### Progress Transparency

When used by the a11y-audit agent:
- **Announce start:** "Applying [N] accessibility fixes to [N] files ([N] auto-fixable, [N] need approval)"
- **Per fix:** Show the issue, before/after code, and status
- **Announce completion:** "Fix pass complete: [N] applied, [N] skipped, [N] pending approval"
- **On failure:** "Fix failed for [file]:[line]: [reason]. File left unchanged."

Return structured findings to the orchestrating audit agent.

