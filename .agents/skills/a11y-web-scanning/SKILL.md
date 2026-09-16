---
name: a11y-web-scanning
description: Web content discovery, URL crawling, and page inventory for accessibility audits. Use when scanning web pages, crawling sites for audit scope, or building page inventories for multi-page audits.
user-invocable: false
---

# Web Scanning

## Audit phase role

The `a11y-audit` agent owns phase numbering. This skill supports:

- **Phase 0:** Discover URLs, scope, framework, authentication needs, and scanner availability. Do not run audit tests during discovery.
- **Phase 1:** Establish the automated baseline. Run the axe-core engine once before code review or behavioral testing.

For a public **or** authenticated page, use the shipped `a11y-playwright` scanner. Authenticated pages add `--storage-state`. Do not use `@axe-core/cli` as the primary Phase 1 path.

Complete Phase 1 as one step before returning control:

1. Confirm the target URL is reachable and is the intended page.
2. Run:

   ```bash
   node <a11y-playwright>/scripts/a11y-scan.mjs \
     --url <URL> --mode axe,tree,coverage --out $SCRATCH/scan-axe-page-1.json
   ```

   Use `scan-axe-page-<N>.json` for each page in a multi-page audit; never reuse a page's output path.
3. Return the scanner status, artifact path, `inventory` flags, violation count, and any coverage gap.
4. Only then may the agent mark Phase 1 `DONE`, `SKIPPED`, or `FAILED` and advance.

## Supported Audit Methods

| Method | Tool | When to Use |
|--------|------|-------------|
| Runtime scan | `a11y-scan.mjs --mode axe,tree,coverage` | Live URL available (dev server or production) |
| Code review | Domain skill checklists (via a11y-audit) | Source code available in workspace |
| Both | axe-core + domain skills | Most comprehensive - catches issues from both angles |

## Runtime Scanning Commands

### Phase 1 (required)

```bash
node <a11y-playwright>/scripts/a11y-scan.mjs \
  --url <URL> --mode axe,tree,coverage --out $SCRATCH/scan-axe-page-1.json
```

The JSON includes `inventory` (`hasTables`, `hasForms`, `hasMedia`, `hasDialogs`, `hasLiveRegions`, `hasCustomWidgets`) used to skip later phases.

After every primary scan, inspect `scans.axe.status`. If it is not `ok` on a
public page, run the CLI fallback below to
`$SCRATCH/scan-axe-cli-page-<N>.json` and preserve the primary file for its
tree/inventory data. Never use the public CLI fallback for an authenticated
route.

### Fallback: axe-core CLI

Use only when Playwright cannot run axe. Inventory flags will be missing, so do not skip Phases 2–9 from guesses.

```bash
npx --yes @axe-core/cli axe \
  <URL> --tags wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa \
  --save $SCRATCH/scan-axe-cli-page-1.json
```
> `$RUN` is the timestamped run directory the `a11y-audit` agent creates in Phase 0 (`.a11y/runs/<YYYY-MM-DD-HHMMSS>`); `$SCRATCH` is a `mktemp -d` directory for intermediates, which are never written into the project. Running standalone, substitute any directories.


### axe-core Tag Reference

| Tag | Standard |
|-----|----------|
| wcag2a | WCAG 2.0 Level A |
| wcag2aa | WCAG 2.0 Level AA |
| wcag21a | WCAG 2.1 Level A |
| wcag21aa | WCAG 2.1 Level AA |
| wcag22aa | WCAG 2.2 Level AA |
| best-practice | Best practices (not WCAG required) |

## Screenshot Capture

### capture-website-cli (preferred - lightweight)

```bash
# Full-page screenshot
npx capture-website-cli "<URL>" --output="$SCRATCH/screenshots/<page>.png" --full-page --type=png

# With viewport
npx capture-website-cli "<URL>" --output="$SCRATCH/screenshots/<page>.png" --full-page --width=1280 --height=720

# Mobile viewport
npx capture-website-cli "<URL>" --output="$SCRATCH/screenshots/<page>-mobile.png" --full-page --width=375 --height=812

# With delay for JS-rendered content
npx capture-website-cli "<URL>" --output="$SCRATCH/screenshots/<page>.png" --full-page --delay=3
```

### Playwright (fallback)

```bash
npx playwright screenshot --browser chromium --full-page --wait-for-timeout 3000 "<URL>" "$SCRATCH/screenshots/<page>.png"
```

## Page Discovery for Multi-Page Audits

### Crawl Depth Modes

| Mode | Behavior | Max Pages |
|------|----------|-----------|
| Current page only | Scan single URL | 1 |
| Key pages | User-provided list | User-defined |
| Full site crawl | Follow internal links | 50 (default cap) |

### Sitemap-based Discovery

```bash
# Check for sitemap
curl -s <BASE_URL>/sitemap.xml | head -20

# Extract URLs from sitemap
curl -s <BASE_URL>/sitemap.xml | grep -oP '<loc>\K[^<]+' | head -50
```

### Link-based Crawling

When crawling from a start URL:

- Follow only same-domain links
- Skip anchor links (#), mailto:, tel:, javascript: links
- Skip file downloads (.pdf, .zip, .doc, etc.)
- Respect robots.txt
- Cap at 50 pages unless user overrides
- Track visited URLs to avoid duplicates

## Framework Detection

Detect the framework from workspace files to enable framework-specific scanning:

| Indicator | Framework |
|-----------|-----------|
| `package.json` contains `react` | React |
| `package.json` contains `next` | Next.js |
| `package.json` contains `vue` | Vue |
| `package.json` contains `@angular/core` | Angular |
| `package.json` contains `svelte` | Svelte |
| `.jsx` / `.tsx` files present | React/Next.js |
| `.vue` files present | Vue |
| `angular.json` present | Angular |
| `.svelte` files present | Svelte |
| Only `.html` files | Vanilla HTML |

## Source Code File Patterns

When doing code review, scan these file patterns:

```bash
# HTML files
**/*.html

# Component files (framework-specific)
**/*.jsx
**/*.tsx
**/*.vue
**/*.svelte
**/*.component.ts
**/*.component.html

# Style files (for contrast/visual checks)
**/*.css
**/*.scss
**/*.less
**/*.module.css

# Config files (for framework detection)
package.json
next.config.*
nuxt.config.*
angular.json
svelte.config.*
tailwind.config.*
```

## Authenticated and Auth-Gated Pages

Most real audit targets hide their interesting pages behind a login. Scanning only the public shell and reporting a good score is a false result — say so explicitly rather than silently auditing the login page alone.

### Step 1: Ask before attempting

Ask the user how to reach authenticated pages:

1. **They provide a storage state file** — best option, no credentials handled
2. **They log in manually in a headed browser** while you capture the session
3. **Test credentials for a non-production environment** — never accept production credentials
4. **Skip authenticated pages** — audit public pages only and record the gap

Never ask for, store, or echo real user passwords. If the user pastes credentials, use them for the run and do not write them into the report, the scan JSON, or any committed file.

### Step 2: Capture a reusable session

Log in once interactively and save the session for every later scan:

```bash
npx playwright codegen --save-storage=.auth/state.json http://localhost:3000/login
```

Add `.auth/` to `.gitignore` before creating it. Session files contain live cookies and tokens.

### Step 3: Reuse it across tools

```bash
# Phase 1 of an authenticated route
node <a11y-playwright>/scripts/a11y-scan.mjs \
  --url http://localhost:3000/dashboard \
  --mode axe,tree,coverage \
  --storage-state .auth/state.json
```

Prefer this scanner over `@axe-core/cli` for every Phase 1 run. The CLI cannot load storage state.

### Step 4: Verify and record

Confirm the session actually worked — check for a known post-login element before trusting results. A silently expired session produces a scan of the login page wearing a dashboard URL.

Record in the report which routes were audited authenticated, which anonymously, and which were not reachable at all.

## Reporting Scan Gaps

Whenever a page or route could not be scanned, list it in the report with the reason: authentication unavailable, route unreachable, scanner missing, or excluded by the user. Scope honesty is what makes the score meaningful.

## Scan Profiles

Thoroughness profiles and the phases each one runs are defined in the `a11y-audit` agent's phase map. That map is the single source of truth — do not restate or redefine it here.
