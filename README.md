# PDS UI Testing

A dedicated testing and demonstration repository for the [Porsche Design System](https://designsystem.porsche.com/).

This monorepo contains the **PDS UI Testing** application—a technical baseline and demo shop showcasing WCAG 2.2 (AA) compliant [Porsche Design System Components](https://designsystem.porsche.com/v3/components/introduction) with integration patterns for Next.js, static export, and internationalization.

## 📦 Repository Structure

```
.
├── ui-testing/          # Main Next.js application (PDS demo shop)
├── .github/workflows/   # CI/CD pipelines (build, test, deploy)
├── .github/actions/     # Shared GitHub Actions (install, etc.)
└── package.json         # Monorepo root configuration
```

### Workspaces

- **`ui-testing/`** — Next.js 15+ App Router demo application with i18n, product catalog, forms, and accessibility testing capabilities.

## 🚀 Getting Started

### Prerequisites

#### Volta (Recommended)

We recommend using [Volta](https://volta.sh) to manage the correct Node.js and npm version automatically:

```bash
# Install Volta on Unix/macOS:
curl https://get.volta.sh | bash

# Or visit https://volta.sh for other platforms
```

#### Node.js and npm

```bash
# Volta will automatically use the version defined in package.json
node -v  # Should be 24.15.0
npm -v   # Should be 11.12.1
```

### Installation

```bash
# Install dependencies for all workspaces
npm install
```

### Development

```bash
# Start the dev server (with live reload)
npm run dev

# Build the static export
npm run build

# Preview the built static site locally
npm run preview
```

## 🧪 Testing

### Unit Tests

```bash
# Run unit tests with Vitest + Testing Library
npm run test:unit
```

Tests cover:
- Catalog logic (filtering, sorting, search)
- Validation (forms, inquiry, newsletter, contact)
- i18n href builders
- Favorites storage and provider
- Client hooks
- Component behavior (ProductDetailPrice, skip-to-heading)

### End-to-End Tests

```bash
# Run E2E tests with Playwright on static build
npm run test:e2e
```

Tests cover:
- Filter chip interactions
- Header product search
- Session favorites management
- Navigation and form submissions

### Accessibility Tests

```bash
# Run a11y tests with Playwright + axe
npm run test:a11y
```

Tests cover:
- All route pages (auto-discovered from `app/`)
- Zero axe violations (WCAG 2.2 AA)
- Desktop and mobile viewports

### All Tests

```bash
# Run the full test suite (unit + e2e + a11y)
npm run test
```

CI runs all tests in the **Contribution** workflow on every PR and push.

## 📝 Manual Testing

For moderated accessibility and usability sessions with assistive technology users (screen readers, keyboard-only navigation, zoom), see [ACCESSIBILITY-TEST-PLAN.md](./ui-testing/ACCESSIBILITY-TEST-PLAN.md). It provides step-by-step flows for every page area, PDS components, and guidance for recording findings.

Automated axe tests complement but do not replace this structured testing plan.

## 🌍 Internationalization

The app supports multiple locales:
- `en` — English (default)
- `de` — Deutsch

Locale switching is available in the footer.

## 📖 Features

### Demo Shop

- **Home** — Hero, lifestyle tiles, trending products (transparent header)
- **Products** — Catalog browser with filters, sort, and favorites view
- **Product Detail** — Price tiers, inquiry flyout, size selection for apparel
- **Newsletter** — Subscription form with validation
- **Contact** — Contact form with validation
- **Company & Legal** — Placeholder routes linked from footer

### Technical Highlights

- **Next.js 15+** with App Router
- **Static Export** (default) for simple hosting; optional SSR mode
- **i18n** with locale-specific routes and translations
- **Base Path Support** for deployment under sub-paths (e.g., `/testing/pr-1/ui-testing`)
- **Tailwind CSS** integration via PDS design tokens
- **WCAG 2.2 (AA)** compliant UI
- **Docker Support** for consistent CI/CD environments

## 🔧 Build Modes

### Static Export (Default)

```bash
npm run build
```

Outputs a static site to `dist/` with trailing slashes.

### Server-Side Rendering (SSR)

```bash
NEXT_OUTPUT_MODE=ssr npm run build
```

Disables static export and uses standard SSR output.

### Custom Base Path

```bash
NEXT_PUBLIC_BASE_PATH=/testing/pr-1/ui-testing npm run build
```

Deploys to a sub-path with correct asset references.

## 🔄 CI/CD

### Workflows

- **Contribution** (`.github/workflows/contribution.yml`) — Orchestrator that runs build → test → deploy on every PR and push
- **Build** (`.github/workflows/build.yml`) — Builds the Next.js static export
- **Test** (`.github/workflows/test.yml`) — Runs unit, E2E, and a11y tests with Docker
- **Deploy** (`.github/workflows/deploy.yml`) — Deploys to GitHub Pages via the `gh-pages` branch

### Deploy Targets

- **PR branches** → Deployed to `pr-<number>` slug
- **main branch** → Deployed to `nightly` slug
- **Other branches** → Deployed with branch name as slug

### GitHub Pages

The app is automatically deployed to GitHub Pages at:
```
https://porsche-design-system.github.io/testing/<slug>/ui-testing/
```

Example: PR #1 is available at `https://porsche-design-system.github.io/testing/pr-1/ui-testing/`

## 📦 Docker

Docker is optional but recommended for consistent test automation. The CI/CD pipelines use:

```
mcr.microsoft.com/playwright:v1.61.0-noble
```

This ensures identical results across different machines, especially for visual regression testing and E2E tests.

To run tests locally with Docker:

```bash
# Build the app and run tests (CI reproduction)
docker run --rm -v $(pwd):/workspace -w /workspace mcr.microsoft.com/playwright:v1.61.0-noble /bin/bash -c "npm install && npm run build && npm run test"
```

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

## 📚 Project Structure

```
ui-testing/
├── app/
│   ├── (entry)/               # Minimal root for `/` redirect
│   ├── [locale]/              # Locale shell (<html>, PDS provider, footer)
│   │   ├── (home)/            # Transparent header (home only)
│   │   └── (default)/         # Opaque header (other routes)
│   ├── components/
│   │   ├── header/            # GlobalHeader, nav, search, favorites
│   │   ├── catalog/           # Catalog browser, product grid
│   │   ├── product/           # Detail price, inquiry flyout
│   │   ├── favorites/         # Favorites provider and toasts
│   │   ├── home/              # Hero and landing sections
│   │   ├── footer/            # GlobalFooter, language switch
│   │   ├── newsletter/        # Newsletter form
│   │   └── contact/           # Contact form
│   ├── data/                  # Catalog JSON and helpers
│   ├── hooks/                 # Client hooks (e.g., catalog URL sync)
│   ├── i18n/                  # Locale config, dictionaries, hrefs
│   ├── lib/                   # Pure utilities (query, search, validation, a11y)
│   └── next.config.ts         # Next.js configuration (export, base path)
├── public/                    # Static assets (images, icons, fonts)
├── tests/
│   ├── unit/                  # Vitest unit tests
│   ├── e2e/                   # Playwright E2E tests
│   └── a11y/                  # Playwright + axe a11y tests
├── vitest.config.ts           # Vitest configuration
├── playwright.config.ts       # Playwright configuration
├── ACCESSIBILITY-TEST-PLAN.md # Manual testing guide
└── README.md                  # App-specific documentation
```

## 📋 Naming Conventions

- **PascalCase** `.tsx` — React components under `app/components/<feature>/`
- **kebab-case** `.ts` — Utilities in `app/lib/`, `app/data/`, `app/i18n/`
- **`use-*.ts`** — Client hooks in `app/hooks/`

## 🤝 Contributing

1. **Create a feature branch** from `main`
2. **Make your changes** and commit with clear messages
3. **Open a pull request** — CI runs automatically
4. **Review feedback** and address any issues
5. **Merge** when all checks pass

All PRs automatically get:
- Build verification
- Unit, E2E, and accessibility test runs
- Automated deployment to GitHub Pages for preview
- Link to the preview environment in the PR

## 📄 License

This repository is maintained by the [Porsche Design System](https://designsystem.porsche.com/) team. See the main [porsche-design-system](https://github.com/porsche-design-system) organization for license details.

## 🔗 Links

- **Porsche Design System** — https://designsystem.porsche.com/
- **PDS Components** — https://designsystem.porsche.com/v3/components/introduction
- **PDS Tailwind CSS** — https://designsystem.porsche.com/v3/tailwindcss/introduction
- **Porsche Brand** — https://brand.porsche.com/
- **Examples Repository** — https://github.com/porsche-design-system/examples

---

**Questions?** Open an issue in this repository or reach out to the Porsche Design System team.
