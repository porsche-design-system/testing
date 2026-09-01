# UI Testing

A Next.js demo shop and technical baseline for testing Porsche Design System components. It showcases WCAG 2.2 (AA) compliant integration patterns with App Router, static export, internationalization (i18n), product catalog browsing, detail views, session favorites, search, inquiry flyout, and multi-step forms.

## Routes

- `/` — server-side redirect to the default locale home (statically exported)
- `/[locale]/` — home (hero, lifestyle tiles, trending products; transparent header)
- `/[locale]/products/` — product catalog (filters, sort, favorites view)
- `/[locale]/products/[productSlug]/` — product detail (inquiry flyout, sizes for apparel)
- `/[locale]/newsletter/` — newsletter subscription (validated demo form, dummy submit result)
- `/[locale]/contact/` — contact form (validated demo form, dummy submit result)
- `/[locale]/company/[companySlug]/` — footer company placeholders
- `/[locale]/legal/[legalSlug]/` — footer legal placeholders

Locales: `en` (default), `de`.

## App structure

```
app/
  (entry)/              # Minimal root for `/` redirect only
  [locale]/             # Locale shell: <html>, PDS provider, footer, favorites
    (home)/             # Transparent header (home only)
    (default)/          # Opaque header (products, newsletter, contact, company, legal)
  components/
    header/             # GlobalHeader, skip link, nav, search, favorites link
    catalog/            # Catalog browser, grid, products index shell
    product/            # Detail price, inquiry flyout, size tools
    favorites/          # Provider, toasts, favorite product tiles
    home/               # Hero, landing sections
    footer/             # GlobalFooter, footer placeholders, language switch
    newsletter/         # Newsletter subscription form
    contact/            # Contact form
  data/                 # Catalog JSON and helpers
  hooks/                # Client hooks (e.g. catalog URL query sync)
  i18n/                 # Locale config, dictionaries, href builders
  lib/                  # Pure logic (query, search, form validation, a11y scroll)
```

### Naming conventions

- **PascalCase** `.tsx` — React components under `app/components/<feature>/`
- **kebab-case** `.ts` — utilities in `app/lib/`, `app/data/`, `app/i18n/`
- **`use-*.ts`** — client hooks in `app/hooks/`

### App router layout

Two root layouts live under `app/` (no single `app/layout.tsx`):

- `app/(entry)/` — minimal root for `/` (renders the redirect only)
- `app/[locale]/` — root for all localized routes; sets `<html lang={locale}>`, loads PDS partials, and renders the shared footer

Inside `[locale]/`, route groups switch the header variant without affecting URLs:

- `app/[locale]/(home)/` — transparent overlay header (only the `/[locale]/` home page)
- `app/[locale]/(default)/` — opaque default header (products, newsletter, contact, company, legal)

`dynamicParams = false` on `[locale]/layout.tsx` rejects unknown locale segments at build time.

`<base href>` in the locale layout supports optional `NEXT_PUBLIC_BASE_PATH`; the skip link uses programmatic focus (`app/lib/skip-to-page-heading.ts`) because hash navigation is unreliable with a base URL.

## Commands

Run from the `ui-testing/` directory:

```bash
npm run dev        # Start dev server with live reload
npm run build      # Build static export
npm run preview    # Preview the built static site locally
npm run test       # Run all tests (unit, E2E, a11y)
npm run test:unit  # Run unit tests only
npm run test:e2e   # Run E2E tests only
npm run test:a11y  # Run accessibility tests only
```

**From the monorepo root** (if configured with workspace scripts):

```bash
npm run dev --workspace=ui-testing
npm run build --workspace=ui-testing
npm run test --workspace=ui-testing
```

### Testing

| Layer | Tool                                          | What it covers                                                                                                                                                              |
| ----- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit  | Vitest + Testing Library                      | `app/lib/` (catalog, search, inquiry/newsletter/contact validation), i18n hrefs, favorites storage/provider, `useCatalogQueryParams`, `ProductDetailPrice`, skip-to-heading |
| E2E   | Playwright on static `dist` (port 3456)       | Filter chip dismiss, header product search, session favorites                                                                                                               |
| A11y  | Playwright + axe on static `dist` (port 3456) | All `page.tsx` routes (discovered from `app/`), zero axe violations; Chrome + mobile                                                                                        |

E2E and a11y both build with `NEXT_PUBLIC_BASE_PATH=` cleared so client hydration matches URLs under test.

CI runs all three in the **Contribution** workflow (`.github/workflows/contribution.yml`).

#### Manual accessibility / usability sessions

For moderated testing with assistive technology users (screen readers, keyboard-only, zoom), use **[ACCESSIBILITY-TEST-PLAN.md](./ACCESSIBILITY-TEST-PLAN.md)**. It describes session goals, demo-app limitations, step-by-step flows for every page area and PDS component, and how to record findings. Automated axe tests complement but do not replace that plan.

## Build Modes

### Static Export (Default)

Static export is the default mode and is used for simple hosting on GitHub Pages:

```bash
npm run build
```

`next.config.ts` defaults to:

- `output: 'export'`
- `trailingSlash: true`
- `distDir: 'dist'`

### Server-Side Rendering (SSR)

To run and build in SSR mode, set the environment variable:

```bash
NEXT_OUTPUT_MODE=ssr npm run dev
NEXT_OUTPUT_MODE=ssr npm run build
```

When `NEXT_OUTPUT_MODE=ssr`, `next.config.ts` disables static export behavior and uses standard SSR output.

### Custom Base Path

To serve under a sub-path (e.g., for PR previews on GitHub Pages):

```bash
NEXT_PUBLIC_BASE_PATH=/testing/pr-1/ui-testing npm run build
```

## 🌍 Internationalization

This application supports multiple locales:

- `en` — English (default)
- `de` — Deutsch

Locale switching is available in the application footer. The i18n setup uses static params with locale routing under `app/[locale]/`.

## 📦 Features

- **Demo Shop** — Product catalog with filtering, search, sorting, and favorites management
- **Forms** — Newsletter subscription, contact form, inquiry flyout with validation
- **Internationalization** — Multi-locale support with footer language switcher
- **Accessibility** — WCAG 2.2 (AA) compliance with automated accessibility testing
- **Testing** — Comprehensive unit (Vitest), E2E (Playwright), and a11y test coverage
- **Static Export** — Simple GitHub Pages hosting via static export
- **Responsive Design** — Mobile and desktop viewport support

## 🛠️ IDE Setup

### WebStorm

#### Prettier (Formatter)

1. Go to **Preferences** → **Languages and Frameworks** → **JavaScript** → **Prettier**
2. Enable **Automatic Prettier configuration**
3. Set **Run for files** to `**/*.{md,mdx}`
4. Enable **Run on save**

#### Biome (Formatter + Linter)

1. Go to **Preferences** → **Languages and Frameworks** → **JavaScript** → **Biome**
2. Configure path and enable accordingly

### VS Code

Install recommended extensions:
- **Prettier** — Code formatter
- **ESLint** — Linting
- **Tailwind CSS IntelliSense** — CSS class completion

## 📦 Docker

To run tests in Docker (matching CI environment):

```bash
docker run --rm -v $(pwd):/workspace -w /workspace mcr.microsoft.com/playwright:v1.61.0-noble /bin/bash -c "npm install && npm run build && npm run test"
```

This ensures identical test results across different machines and matches the CI/CD environment exactly.

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes and commit with clear messages
3. Open a pull request — CI runs automatically
4. Address any review feedback
5. Merge when all checks pass

All PRs automatically get:
- Build verification
- Unit, E2E, and accessibility test runs
- Automated deployment to GitHub Pages for preview
- Link to the preview environment in the PR
