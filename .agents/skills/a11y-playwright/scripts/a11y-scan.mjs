#!/usr/bin/env node
/**
 * Behavioural accessibility scanner for the a11y-audit agent.
 *
 * Scope rule: this scanner only reports what it can measure — focus order, tab
 * stops, keyboard traps, document overflow, target geometry and document
 * structure. It deliberately does not reimplement any axe-core rule (contrast
 * above all) and does not infer focus-indicator visibility from computed
 * styles, because neither can be judged reliably through a shadow boundary.
 * Colour and ARIA correctness belong to axe-core; see `notChecked` in the
 * keyboard scan for the criteria a human still has to confirm.
 *
 * Usage:
 *   node a11y-scan.mjs --url http://localhost:3000 [options]
 *
 * Options:
 *   --url <url>            Page to scan (required)
 *   --mode <list>          Comma-separated: axe,keyboard,tree,viewport,coverage,all  (default: all)
 *   --out <file>           Write full JSON results to this file
 *   --tags <list>          axe tags (default: wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa)
 *   --selector <css>       Limit axe to a subtree
 *   --storage-state <file> Playwright storageState JSON for auth-gated pages
 *   --viewports <list>     Comma-separated widths (default: 320,768,1024,1440)
 *   --max-tabs <n>         Tab presses during keyboard traversal (default: 100)
 *   --timeout <ms>         Navigation timeout (default: 30000)
 *
 * Exit codes: 0 scan completed (violations may exist), 1 scan could not run.
 *
 * Requires `playwright`. The `axe` and `viewport` axe-enrichment modes also
 * require `@axe-core/playwright`; they degrade to skipped when it is absent.
 */

import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Resolve a dependency from the audited project first.
 *
 * This script is installed alongside the skill, not inside the project being
 * audited, so a bare `import('playwright')` would resolve against the skill's
 * own (empty) node_modules. Try the working directory first, then fall back.
 */
async function importFromProject(pkg) {
  const require = createRequire(path.join(process.cwd(), 'package.json'));
  for (const resolve of [() => require.resolve(pkg), () => pkg]) {
    try {
      const target = resolve();
      return await import(target.startsWith('.') || path.isAbsolute(target) ? pathToFileURL(target).href : target);
    } catch {
      // Try the next resolution strategy.
    }
  }
  return null;
}

const { values } = parseArgs({
  options: {
    url: { type: 'string' },
    mode: { type: 'string', default: 'all' },
    out: { type: 'string' },
    tags: { type: 'string', default: 'wcag2a,wcag2aa,wcag21a,wcag21aa,wcag22aa' },
    selector: { type: 'string' },
    'storage-state': { type: 'string' },
    viewports: { type: 'string', default: '320,768,1024,1440' },
    'max-tabs': { type: 'string', default: '100' },
    timeout: { type: 'string', default: '30000' },
  },
});

if (!values.url) {
  console.error('Error: --url is required.');
  process.exit(1);
}

const modes = values.mode === 'all'
  ? ['axe', 'keyboard', 'tree', 'viewport', 'coverage']
  : values.mode.split(',').map((m) => m.trim()).filter(Boolean);

const timeout = Number(values.timeout);
const maxTabs = Number(values['max-tabs']);

const playwright = await importFromProject('playwright');
if (!playwright) {
  console.error(JSON.stringify({
    status: 'unavailable',
    reason: 'playwright is not installed in this project',
    install: 'npm install -D playwright && npx playwright install chromium',
  }, null, 2));
  process.exit(1);
}
// CommonJS deps resolved by absolute path expose their exports under `default`.
const { chromium } = playwright.chromium ? playwright : playwright.default;

// Optional. axe-dependent modes report as skipped when this is absent.
const axeModule = await importFromProject('@axe-core/playwright');
const AxeBuilder = axeModule ? (axeModule.default ?? axeModule) : null;

const results = {
  url: values.url,
  scannedAt: new Date().toISOString(),
  modes,
  axeAvailable: Boolean(AxeBuilder),
  scans: {},
};

// The package can be installed while its browser binary is not, so this needs
// the same graceful degradation as a missing package rather than a stack trace.
let browser;
try {
  browser = await chromium.launch();
} catch (error) {
  const missingBrowser = /Executable doesn't exist|playwright install/i.test(error.message);
  console.error(JSON.stringify({
    status: 'unavailable',
    reason: missingBrowser
      ? 'the Chromium binary Playwright needs is not installed'
      : `Chromium failed to launch: ${error.message}`,
    install: 'npx playwright install chromium',
  }, null, 2));
  process.exit(1);
}

const context = await browser.newContext(
  values['storage-state'] ? { storageState: values['storage-state'] } : {}
);

// Web-component design systems (Porsche Design System, Lightning, Shoelace, and
// anything built on custom elements) render their real content inside shadow
// roots. A scanner that only walks `document` sees host elements instead: it
// reads the host's inherited colour rather than the shadow text, finds no focus
// ring because the ring is on a shadow descendant, and misses an h1 nested in a
// shadow root. That produced entire categories of false positives, so every
// query below is shadow-aware.
await context.addInitScript(() => {
  window.deepQueryAll = (root, selector) => {
    const found = [];
    const visit = (node) => {
      if (!node) return;
      if (node.querySelectorAll) found.push(...node.querySelectorAll(selector));
      const hosts = node.querySelectorAll ? node.querySelectorAll('*') : [];
      for (const el of hosts) {
        if (el.shadowRoot) visit(el.shadowRoot);
      }
    };
    visit(root || document);
    return found;
  };

  // The deepest focused element, following activeElement through shadow roots.
  window.deepActiveElement = () => {
    let el = document.activeElement;
    while (el && el.shadowRoot && el.shadowRoot.activeElement) {
      el = el.shadowRoot.activeElement;
    }
    return el;
  };

  // Stable per-node identity for tab traversal. Identifying focus stops by
  // tag/id/text mistakes distinct elements for one element whenever text
  // repeats — nine links reading "1.4.3", a row of "Read more" links, or
  // pagination — and reports a keyboard trap that does not exist. A trap means
  // focus does not move, which is a statement about nodes, not about labels.
  const nodeIds = new WeakMap();
  let nextNodeId = 1;
  window.a11yNodeId = (el) => {
    if (!el) return null;
    if (!nodeIds.has(el)) nodeIds.set(el, nextNodeId++);
    return nodeIds.get(el);
  };
});

const page = await context.newPage();

try {
  await page.goto(values.url, { waitUntil: 'networkidle', timeout });
} catch (error) {
  await browser.close();
  console.error(JSON.stringify({ status: 'unreachable', url: values.url, error: error.message }, null, 2));
  process.exit(1);
}

/** axe-core scan of the page (or a subtree). */
async function runAxe() {
  if (!AxeBuilder) {
    return { status: 'skipped', reason: '@axe-core/playwright not installed' };
  }
  let builder = new AxeBuilder({ page }).withTags(values.tags.split(','));
  if (values.selector) builder = builder.include(values.selector);
  const axe = await builder.analyze();
  return {
    status: 'ok',
    violationCount: axe.violations.length,
    passCount: axe.passes.length,
    incompleteCount: axe.incomplete.length,
    violations: axe.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      helpUrl: v.helpUrl,
      tags: v.tags,
      nodes: v.nodes.map((n) => ({ target: n.target, html: n.html, failureSummary: n.failureSummary })),
    })),
  };
}

/** Tab traversal: focus order, tab stop count, and genuine keyboard traps. */
async function runKeyboard() {
  await page.goto(values.url, { waitUntil: 'networkidle', timeout });
  const describe = () => page.evaluate(() => {
    const host = document.activeElement;
    if (!host || host === document.body) return null;
    const deep = window.deepActiveElement() || host;
    const rect = host.getBoundingClientRect();
    return {
      nodeId: window.a11yNodeId(deep),
      tag: host.tagName.toLowerCase(),
      role: host.getAttribute('role'),
      name: (host.getAttribute('aria-label') || host.textContent || '').trim().slice(0, 60),
      id: host.id || null,
      tabIndex: host.tabIndex,
      inShadowDom: deep !== host,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  });

  const stops = [];
  const traps = [];
  let repeats = 0;
  let previousId = null;

  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const stop = await describe();
    if (!stop) break;
    if (stop.nodeId !== null && stop.nodeId === previousId) {
      repeats++;
      if (repeats >= 3) {
        traps.push({
          nodeId: stop.nodeId,
          element: `${stop.tag}#${stop.id ?? ''}[${stop.name}]`,
          afterTabStop: i,
        });
        stops.push(stop);
        // Focus cannot leave this element, so there is nothing further to
        // traverse. Continuing would only repeat the same stop to --max-tabs.
        break;
      }
    } else {
      repeats = 0;
    }
    previousId = stop.nodeId;
    stops.push(stop);
    // Focus returned to the first stop: the tab ring is complete.
    if (stops.length > 1 && stop.nodeId === stops[0].nodeId) break;
  }
  return {
    status: 'ok',
    tabStopCount: stops.length,
    keyboardTraps: traps,
    tabSequence: stops,
  };
}

/**
 * Criteria no automated scan here can settle, plus limitations detected on this
 * specific page. Reported so the audit can declare its gaps instead of letting
 * a high score imply conformance.
 */
async function runCoverage() {
  await page.goto(values.url, { waitUntil: 'networkidle', timeout });

  const notChecked = [
    {
      criterion: '2.4.7 Focus Visible',
      reason: 'Focus indicators are commonly painted with ::before/::after or ::part(), '
        + 'which computed styles do not expose. Any automated verdict would be a guess.',
      verifyBy: 'Tab through the page and confirm every stop shows a visible indicator.',
    },
    {
      criterion: '2.1.1 Keyboard (operability)',
      reason: 'tabindex="-1" is a legitimate pattern (roving tabindex, redundant links, '
        + 'programmatic focus targets), so it cannot be treated as a defect.',
      verifyBy: 'Operate each control with Enter, Space and arrow keys.',
    },
  ];

  // Text passed into a component and coloured by the <slot> element renders in
  // the slot's colour, but computed style on the host still reports the host's
  // inherited colour. Every computed-style contrast engine, axe-core included,
  // misreads that case, so flag it rather than trusting the contrast result.
  const slotStyledText = await page.evaluate(() => {
    const affected = [];
    for (const host of window.deepQueryAll(document, '*')) {
      if (!host.shadowRoot) continue;
      const hasSlottedText = [...host.childNodes]
        .some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (!hasSlottedText) continue;
      for (const slot of host.shadowRoot.querySelectorAll('slot')) {
        if (getComputedStyle(slot).color !== getComputedStyle(host).color) {
          affected.push(host.tagName.toLowerCase());
          break;
        }
      }
    }
    return [...new Set(affected)];
  });

  if (slotStyledText.length) {
    notChecked.push({
      criterion: '1.4.3 Contrast (Minimum)',
      reason: `${slotStyledText.length} component(s) colour slotted text through the <slot> `
        + `element (${slotStyledText.slice(0, 5).join(', ')}). Computed style on the host `
        + 'reports a different colour, so contrast results for this text — including '
        + "axe-core's — may be wrong in either direction.",
      verifyBy: 'Sample this text with a colour picker or the browser contrast inspector.',
    });
  }

  return { status: 'ok', notChecked };
}


/** Document structure as assistive technology exposes it: landmarks, headings, names. */
async function runTree() {
  const structure = await page.evaluate(() => {
    const accessibleName = (el) => {
      const label = el.getAttribute('aria-label');
      if (label) return label.trim();
      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        return labelledBy.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim() || '')
          .join(' ')
          .trim();
      }
      return (el.textContent || '').trim().slice(0, 60);
    };

    // A header/footer is only a landmark when not scoped inside sectioning content.
    const isTopLevelSection = (el) => !el.closest('article, aside, main, nav, section');
    const implicitLandmark = (el) => {
      switch (el.tagName.toLowerCase()) {
        case 'header': return isTopLevelSection(el) ? 'banner' : null;
        case 'footer': return isTopLevelSection(el) ? 'contentinfo' : null;
        case 'nav': return 'navigation';
        case 'main': return 'main';
        case 'aside': return 'complementary';
        case 'form': return accessibleName(el) ? 'form' : null;
        case 'section': return accessibleName(el) ? 'region' : null;
        default: return null;
      }
    };

    const landmarks = [];
    for (const el of window.deepQueryAll(document, 'header, footer, nav, main, aside, form, section, [role]')) {
      const explicit = el.getAttribute('role');
      const role = ['banner', 'contentinfo', 'navigation', 'main', 'complementary', 'form', 'region', 'search']
        .includes(explicit) ? explicit : implicitLandmark(el);
      if (role) landmarks.push({ role, name: el.getAttribute('aria-label') || null, tag: el.tagName.toLowerCase() });
    }

    const headings = [...window.deepQueryAll(document, 'h1, h2, h3, h4, h5, h6, [role="heading"]')].map((el) => ({
      level: el.getAttribute('aria-level')
        ? parseInt(el.getAttribute('aria-level'), 10)
        : parseInt(el.tagName.slice(1), 10) || null,
      name: accessibleName(el),
    }));

    const roleCounts = {};
    for (const el of window.deepQueryAll(document, '[role]')) {
      const role = el.getAttribute('role');
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }

    return {
      title: document.title,
      lang: document.documentElement.lang || null,
      landmarks,
      headings,
      roleCounts,
      hasSkipLink: Boolean(document.querySelector('a[href^="#"]')),
    };
  });

  const skipped = [];
  for (let i = 1; i < structure.headings.length; i++) {
    const [previous, current] = [structure.headings[i - 1], structure.headings[i]];
    if (current.level - previous.level > 1) skipped.push({ from: previous, to: current });
  }

  // ariaSnapshot is the current Playwright accessibility-tree API (1.49+).
  let ariaSnapshot = null;
  try {
    ariaSnapshot = await page.locator('body').ariaSnapshot();
  } catch {
    // Older Playwright: structural findings above still stand.
  }

  const required = ['banner', 'main', 'contentinfo'];
  const present = new Set(structure.landmarks.map((l) => l.role));

  return {
    status: 'ok',
    ...structure,
    h1Count: structure.headings.filter((h) => h.level === 1).length,
    skippedHeadingLevels: skipped,
    missingLandmarks: required.filter((r) => !present.has(r)),
    ariaSnapshot,
  };
}

/** Reflow (1.4.10) and target size (2.5.8) across viewport widths. */
async function runViewport() {
  const widths = values.viewports.split(',').map((w) => parseInt(w.trim(), 10));
  const perViewport = [];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(values.url, { waitUntil: 'networkidle', timeout });

    const measurements = await page.evaluate(() => {
      const minTarget = 24; // WCAG 2.5.8 Level AA, CSS pixels

      const targets = [...window.deepQueryAll(document, 'a[href], button, input, select, textarea, [role="button"]')]
        .map((el) => ({ el, rect: el.getBoundingClientRect(), style: getComputedStyle(el) }))
        .filter(({ rect, style }) => rect.width > 0 && rect.height > 0
          && style.display !== 'none' && style.visibility !== 'hidden');

      // SC 2.5.8 exception "spacing": an undersized target conforms when a
      // 24px-diameter circle centred on it does not intersect the circle of any
      // other target. Two circles of radius 12 clear each other at 24px apart.
      const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      const hasClearance = (subject) => {
        const a = centre(subject.rect);
        return targets.every((other) => {
          if (other.el === subject.el) return true;
          const b = centre(other.rect);
          return Math.hypot(a.x - b.x, a.y - b.y) >= minTarget;
        });
      };

      const smallTargets = targets
        .filter(({ rect }) => rect.width < minTarget || rect.height < minTarget)
        .map((t) => {
          // SC 2.5.8 exception "inline": the target sits in a text flow, so its
          // box is set by line-height rather than by the author's hit area.
          const inline = t.style.display.startsWith('inline');
          return {
            tag: t.el.tagName.toLowerCase(),
            id: t.el.id || null,
            name: (t.el.getAttribute('aria-label') || t.el.textContent || '').trim().slice(0, 40),
            width: Math.round(t.rect.width),
            height: Math.round(t.rect.height),
            exempt: inline ? 'inline' : hasClearance(t) ? 'spacing' : null,
          };
        })
        .filter((t) => t.exempt === null);

      return {
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        undersizedTargets: smallTargets,
      };
    });

    const entry = { width, ...measurements };

    if (AxeBuilder) {
      const axe = await new AxeBuilder({ page }).withTags(values.tags.split(',')).analyze();
      entry.axeViolationCount = axe.violations.length;
      entry.axeViolationIds = [...new Set(axe.violations.map((v) => v.id))];
    }

    perViewport.push(entry);
  }

  return {
    status: 'ok',
    reflowFailures: perViewport.filter((v) => v.horizontalOverflow).map((v) => v.width),
    viewports: perViewport,
  };
}

const runners = {
  axe: runAxe,
  keyboard: runKeyboard,
  tree: runTree,
  viewport: runViewport,
  coverage: runCoverage,
};

for (const mode of modes) {
  const runner = runners[mode];
  if (!runner) {
    results.scans[mode] = { status: 'error', reason: `unknown mode "${mode}"` };
    continue;
  }
  try {
    results.scans[mode] = await runner();
  } catch (error) {
    results.scans[mode] = { status: 'error', reason: error.message };
  }
}

await browser.close();

const completed = Object.values(results.scans).filter((s) => s.status === 'ok').length;
// Relative to what was attempted, so removing or selecting modes cannot make
// a full, healthy run look less trustworthy than it is.
const ratio = completed / modes.length;
results.behavioralConfidence = ratio === 1 ? 'High' : ratio >= 0.6 ? 'Medium' : 'Low';

// Coverage gaps belong to the run, not to one scan.
results.coverage = { notChecked: results.scans.coverage?.notChecked ?? [] };

results.summary = {
  axeViolations: results.scans.axe?.violationCount ?? null,
  keyboardTraps: results.scans.keyboard?.keyboardTraps?.length ?? null,
  tabStops: results.scans.keyboard?.tabStopCount ?? null,
  reflowFailures: results.scans.viewport?.reflowFailures?.length ?? null,
  h1Count: results.scans.tree?.h1Count ?? null,
  scansCompleted: `${completed}/${modes.length}`,
};

if (values.out) {
  fs.writeFileSync(values.out, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ writtenTo: values.out, ...results.summary, behavioralConfidence: results.behavioralConfidence }, null, 2));
} else {
  console.log(JSON.stringify(results, null, 2));
}
