# Porsche Design System Testing

A monorepo for testing applications and test suites for the [Porsche Design System](https://designsystem.porsche.com/).

This repository provides a centralized platform for building and maintaining testing applications that showcase WCAG 2.2 (AA) compliant [Porsche Design System Components](https://designsystem.porsche.com/v3/components/introduction) with various integration patterns, demo scenarios, and testing strategies.

## 📦 Repository Structure

```
.
├── ui-testing/          # UI Testing application (Next.js)
├── .github/
│   ├── workflows/       # CI/CD pipelines (shared across packages)
│   └── actions/         # Shared GitHub Actions
├── package.json         # Monorepo root configuration (workspaces)
├── package-lock.json    # Dependency lock file
└── README.md            # This file
```

## 📚 Packages

The following testing packages are available in this monorepo:

### `ui-testing/` — UI Testing Application

A Next.js 15+ demo shop and technical baseline for testing Porsche Design System components.

**What it includes:**
- Product catalog with filtering and search
- Multi-step forms (newsletter, contact, inquiry)
- Session favorites management
- Internationalization (EN, DE)
- Static export for simple hosting
- Comprehensive test suites (unit, E2E, accessibility)

**Key routes:**
- `/` — Home (hero, lifestyle tiles, trending products)
- `/products/` — Product catalog (filters, sort, favorites)
- `/products/[slug]/` — Product detail (inquiry flyout, sizing)
- `/newsletter/`, `/contact/` — Form demos
- Locale support: `en`, `de`

**For more details, see [`ui-testing/README.md`](./ui-testing/README.md)**

---

### Adding New Packages

To add a new testing package to this monorepo:

1. Create a new directory at the root level (e.g., `component-testing/`, `visual-regression/`)
2. Add a `package.json` with a unique `"name"` field
3. Update the root `package.json` to include it in `"workspaces"`
4. Implement your package's build, test, and dev scripts
5. (Optional) Add package-specific CI workflows in `.github/workflows/`

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
# Install dependencies for all packages in the monorepo
npm install
```

### Development

To work on a specific package, navigate to its directory:

```bash
# Start dev server for ui-testing
cd ui-testing
npm run dev

# Or from the root, if package scripts are configured
npm run dev --workspace=ui-testing
```

### Building

```bash
# Build a specific package
cd ui-testing
npm run build

# Or from root
npm run build --workspace=ui-testing
```

## 🧪 Testing

Testing approaches vary by package. Refer to each package's README for specific instructions.

### Common Testing Patterns

Most packages in this monorepo use the following testing stack:

- **Unit Tests** — [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/)
- **E2E Tests** — [Playwright](https://playwright.dev/)
- **Accessibility Tests** — Playwright + [axe-core](https://www.deque.com/axe/core/)

### Running Tests

Tests are typically run from within each package directory or via monorepo scripts:

```bash
# From package directory
cd ui-testing
npm run test:unit
npm run test:e2e
npm run test:a11y
npm run test  # Run all tests

# From root (if configured)
npm run test --workspace=ui-testing
```

### CI/CD Test Automation

The **Contribution** workflow (`.github/workflows/contribution.yml`) automatically runs all tests on every PR and push to protected branches. See [CI/CD](#cicd) for details.

## 🌍 Internationalization

Internationalization support depends on the package. Refer to each package's README for details.

**ui-testing** supports:
- `en` — English (default)
- `de` — Deutsch

Locale switching is available in the application footer.

## 📖 Features

Features depend on the testing package. Each package may showcase different aspects:

### ui-testing

- **Demo Shop** — Product catalog, filtering, search, favorites
- **Forms** — Newsletter subscription, contact form, inquiry flyout
- **Internationalization** — Multiple locale support (EN, DE)
- **Accessibility** — WCAG 2.2 (AA) compliance focus
- **Testing** — Unit, E2E, and automated accessibility tests
- **Static Export** — Simple hosting via GitHub Pages
- **Responsive Design** — Desktop and mobile viewports

For a complete feature list and technical highlights, see [`ui-testing/README.md`](./ui-testing/README.md).

## 🔧 Build & Deployment

Each package has its own build and deployment configuration. Refer to each package's README for specific build options and deployment targets.

### ui-testing Build Modes

**ui-testing** supports the following build modes:

#### Static Export (Default)

```bash
cd ui-testing
npm run build
```

Outputs a static site to `dist/` with trailing slashes, suitable for GitHub Pages hosting.

#### Server-Side Rendering (SSR)

```bash
NEXT_OUTPUT_MODE=ssr npm run build
```

Disables static export and uses standard SSR output.

#### Custom Base Path

```bash
NEXT_PUBLIC_BASE_PATH=/testing/pr-1/ui-testing npm run build
```

Deploys to a sub-path with correct asset references.

## 🔄 CI/CD

### Workflows

CI/CD pipelines are managed through GitHub Actions. Currently, workflows are configured for the **ui-testing** package:

- **Contribution** (`.github/workflows/contribution.yml`) — Orchestrator that runs build → test → deploy on every PR and push
- **Build** (`.github/workflows/build.yml`) — Builds the Next.js static export
- **Test** (`.github/workflows/test.yml`) — Runs unit, E2E, and a11y tests with Docker
- **Deploy** (`.github/workflows/deploy.yml`) — Deploys to GitHub Pages via the `gh-pages` branch

### Adding Workflows for New Packages

When adding a new testing package:

1. Create package-specific workflow files in `.github/workflows/` if needed
2. Or extend the existing workflows to include the new package
3. Update the orchestrator workflow to run builds/tests for all packages

### Deploy Targets

Current deployment (ui-testing) follows this slug pattern:

- **PR branches** → Deployed to `pr-<number>` slug
- **main branch** → Deployed to `nightly` slug
- **Other branches** → Deployed with branch name as slug

### GitHub Pages

The ui-testing app is automatically deployed to GitHub Pages at:
```
https://porsche-design-system.github.io/testing/<slug>/ui-testing/
```

## 📦 Docker

Docker support depends on the package. Most testing packages use Docker in CI/CD for consistent test automation.

### ui-testing Docker Support

The ui-testing package CI/CD uses:

```
mcr.microsoft.com/playwright:v1.61.0-noble
```

This ensures identical results across different machines, especially for visual regression testing and E2E tests.

To run tests locally with Docker:

```bash
# Build the app and run tests (CI reproduction)
cd ui-testing
docker run --rm -v $(pwd):/workspace -w /workspace mcr.microsoft.com/playwright:v1.61.0-noble /bin/bash -c "npm install && npm run build && npm run test"
```

For other packages, refer to their documentation.

## 🛠️ IDE Setup

IDE setup recommendations vary by package. Most packages support common code editors and formatters.

### ui-testing IDE Setup

#### WebStorm

##### Prettier (Formatter)

1. Go to **Preferences** → **Languages and Frameworks** → **JavaScript** → **Prettier**
2. Enable **Automatic Prettier configuration**
3. Set **Run for files** to `**/*.{md,mdx}`
4. Enable **Run on save**

##### Biome (Formatter + Linter)

1. Go to **Preferences** → **Languages and Frameworks** → **JavaScript** → **Biome**
2. Configure path and enable accordingly

#### VS Code

Install recommended extensions:
- **Prettier** — Code formatter
- **ESLint** — Linting
- **Tailwind CSS IntelliSense** — CSS class completion

For other packages, refer to their respective README files.

## 📚 Project Structure

Project structure varies by package. Each testing package maintains its own structure based on its technology stack and requirements.

### ui-testing Structure

For details on the ui-testing project structure, see [`ui-testing/README.md`](./ui-testing/README.md#project-structure).

```
ui-testing/
├── app/              # Next.js App Router (routes, layouts, pages)
├── components/       # React components organized by feature
├── data/             # Static data and helpers
├── hooks/            # Custom React hooks
├── i18n/             # Internationalization configuration
├── lib/              # Utility functions and helpers
├── public/           # Static assets
├── tests/            # Test suites (unit, E2E, a11y)
└── README.md         # Package-specific documentation
```

### Naming Conventions (ui-testing)

- **PascalCase** `.tsx` — React components under `app/components/<feature>/`
- **kebab-case** `.ts` — Utilities in `app/lib/`, `app/data/`, `app/i18n/`
- **`use-*.ts`** — Client hooks in `app/hooks/`

For other packages, refer to their respective documentation.

## 🤝 Contributing

### General Workflow

1. **Create a feature branch** from `main`
2. **Make your changes** and commit with clear messages
3. **Open a pull request** — CI runs automatically
4. **Review feedback** and address any issues
5. **Merge** when all checks pass

### Pull Request Benefits

All PRs automatically get:
- Build verification
- Test runs (unit, E2E, accessibility tests)
- Automated deployment to GitHub Pages for preview (when applicable)
- Link to preview environments in the PR

### Package-Specific Guidelines

Each package may have additional guidelines. Before contributing to a specific package, review its README:

- **ui-testing** — See [`ui-testing/README.md`](./ui-testing/README.md#contributing) for detailed instructions

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
