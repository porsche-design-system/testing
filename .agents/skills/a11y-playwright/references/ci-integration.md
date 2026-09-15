# Playwright CI Integration

Load this reference only when the user asks to run accessibility tests in CI or wants generated regression tests committed to their repo.

## CI Integration

### GitHub Actions with Playwright

```yaml
name: Accessibility Tests
on: [push, pull_request]

jobs:
  a11y:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - name: Start dev server
        run: npm run dev &
        env:
          CI: true
      - name: Wait for server
        run: npx wait-on http://localhost:3000 --timeout 30000
      - name: Run accessibility tests
        run: npx playwright test tests/a11y/
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: a11y-test-results
          path: test-results/
```

### Playwright Config for Accessibility Tests

```javascript
// playwright.config.js (a11y section)
export default {
  testDir: './tests/a11y',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    // Use Chromium only — @axe-core/playwright is Chromium-validated
    browserName: 'chromium',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
};
```

