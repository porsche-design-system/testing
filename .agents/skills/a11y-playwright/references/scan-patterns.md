# Custom Playwright Scan Patterns

Load this reference only when `scripts/a11y-scan.mjs` does not cover the case — a bespoke interaction sequence, a scoped scan of one widget, or a single-rule re-check. For standard page scans, run the script instead of writing new code.

## @axe-core/playwright Patterns

### Full Page Scan

```javascript
import AxeBuilder from '@axe-core/playwright';

const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
  .analyze();
```

### Scoped Element Scan

```javascript
const results = await new AxeBuilder({ page })
  .include('.modal-content')
  .withTags(['wcag2a', 'wcag2aa'])
  .analyze();
```

### Single Rule Verification

```javascript
const results = await new AxeBuilder({ page })
  .include('#hero-image')
  .withRules(['image-alt'])
  .analyze();
expect(results.violations).toEqual([]);
```

### Scan After Interaction

```javascript
await page.click('[aria-expanded="false"]');
await page.waitForSelector('.accordion-content', { state: 'visible' });
const results = await new AxeBuilder({ page })
  .include('.accordion-content')
  .analyze();
```

## Keyboard Traversal Patterns

### Record Tab Sequence

```javascript
const tabStops = [];
for (let i = 0; i < maxTabs; i++) {
  await page.keyboard.press('Tab');
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    return {
      tagName: el?.tagName,
      role: el?.getAttribute('role'),
      name: el?.getAttribute('aria-label') || el?.textContent?.trim().slice(0, 50),
      id: el?.id,
      tabIndex: el?.tabIndex
    };
  });
  tabStops.push(info);
}
```

### Detect Keyboard Traps

A keyboard trap is detected when the same element receives focus after consecutive Tab presses:

```javascript
let trapCount = 0;
let lastSelector = '';
for (const stop of tabStops) {
  const currentSelector = `${stop.tagName}#${stop.id}`;
  if (currentSelector === lastSelector) {
    trapCount++;
    if (trapCount >= 3) { /* TRAP DETECTED */ }
  } else {
    trapCount = 0;
  }
  lastSelector = currentSelector;
}
```

### Focus Management After Modal Open

```javascript
await page.click('[data-modal-trigger]');
await page.waitForSelector('[role="dialog"]', { state: 'visible' });
const focusedRole = await page.evaluate(() =>
  document.activeElement?.closest('[role="dialog"]') ? 'inside-dialog' : 'outside-dialog'
);
// focusedRole should be 'inside-dialog'
```

## Focus Management Test Templates

### Modal Focus Trap Test

```javascript
test('modal traps focus correctly', async ({ page }) => {
  await page.goto(url);
  await page.click('[data-open-modal]');
  await page.waitForSelector('[role="dialog"]', { state: 'visible' });

  // Focus should be inside the dialog
  const inDialog = await page.evaluate(() =>
    document.activeElement?.closest('[role="dialog"]') !== null
  );
  expect(inDialog).toBe(true);

  // Tab through dialog — should not escape
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const stillInDialog = await page.evaluate(() =>
      document.activeElement?.closest('[role="dialog"]') !== null
    );
    expect(stillInDialog).toBe(true);
  }

  // Escape should close and return focus to trigger
  await page.keyboard.press('Escape');
  const focusedId = await page.evaluate(() => document.activeElement?.id);
  expect(focusedId).toBe('modal-trigger-id');
});
```

### Skip Link Test

```javascript
test('skip link moves focus to main content', async ({ page }) => {
  await page.goto(url);
  await page.keyboard.press('Tab'); // Focus skip link
  await page.keyboard.press('Enter'); // Activate it
  const focusedId = await page.evaluate(() => document.activeElement?.id);
  expect(focusedId).toBe('main-content');
});
```

