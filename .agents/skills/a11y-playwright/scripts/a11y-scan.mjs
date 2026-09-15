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
 *   --load-delay <ms>      Wait after load before measuring (default: 2000)
 *   --ready-selector <css>  Wait for this selector before the stability window
 *   --stability-window <ms> Quiet DOM period before measuring (default: 500)
 *   --best-effort-readiness Continue when the DOM never becomes stable
 *
 * Exit codes: 0 scan completed (violations may exist), 1 scan could not run.
 *
 * Requires `playwright`. The `axe` and `viewport` axe-enrichment modes also
 * require `@axe-core/playwright`; they degrade to skipped when it is absent.
 */

import { parseArgs } from 'node:util';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const catalogPath = path.resolve(
  scriptDirectory, '..', '..', 'a11y-severity-scoring', 'references', 'rule-catalog.json',
);
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const scannerConfig = catalog.scanner;
if (!scannerConfig) {
  console.error(`Error: rule catalog has no scanner contract: ${catalogPath}`);
  process.exit(1);
}
const EXPECTED_AXE_CORE_VERSION = scannerConfig.axe_core_version;
const EXPECTED_AXE_PLAYWRIGHT_VERSION = scannerConfig.axe_playwright_version;
const MODE_ORDER = ['axe', 'tree', 'coverage', 'keyboard', 'viewport'];
const SUPPORTED_AXE_TAGS = scannerConfig.tags;
const DISABLED_AXE_RULES = scannerConfig.disabled_axe_rules;
const projectRequire = createRequire(path.join(process.cwd(), 'package.json'));

/**
 * Resolve a dependency from the audited project first.
 *
 * This script is installed alongside the skill, not inside the project being
 * audited, so a bare `import('playwright')` would resolve against the skill's
 * own (empty) node_modules. Try the working directory first, then fall back.
 */
async function importFromProject(pkg) {
  for (const resolve of [() => projectRequire.resolve(pkg), () => pkg]) {
    try {
      const target = resolve();
      return await import(target.startsWith('.') || path.isAbsolute(target) ? pathToFileURL(target).href : target);
    } catch {
      // Try the next resolution strategy.
    }
  }
  return null;
}

function packageVersion(pkg) {
  try {
    return projectRequire(`${pkg}/package.json`).version;
  } catch {
    try {
      let current = path.dirname(projectRequire.resolve(pkg));
      while (current !== path.dirname(current)) {
        const manifest = path.join(current, 'package.json');
        if (fs.existsSync(manifest)) {
          const data = JSON.parse(fs.readFileSync(manifest, 'utf8'));
          if (data.name === pkg) return data.version;
        }
        current = path.dirname(current);
      }
    } catch {
      // Caller reports a missing version as unavailable.
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
    'load-delay': { type: 'string', default: '2000' },
    'ready-selector': { type: 'string' },
    'stability-window': { type: 'string', default: '500' },
    'best-effort-readiness': { type: 'boolean', default: false },
  },
});

if (!values.url) {
  console.error('Error: --url is required.');
  process.exit(1);
}

const requestedModes = values.mode === 'all'
  ? MODE_ORDER
  : values.mode.split(',').map((m) => m.trim()).filter(Boolean);
const unknownModes = requestedModes.filter((mode) => !MODE_ORDER.includes(mode));
if (unknownModes.length) {
  console.error(`Error: unknown mode(s): ${unknownModes.join(', ')}`);
  process.exit(1);
}
const modes = MODE_ORDER.filter((mode) => requestedModes.includes(mode));
const requestedTags = values.tags.split(',').map((tag) => tag.trim()).filter(Boolean);
const unsupportedTags = requestedTags.filter((tag) => !SUPPORTED_AXE_TAGS.includes(tag));
if (unsupportedTags.length) {
  console.error(`Error: unsupported axe tag(s) for this catalog: ${unsupportedTags.join(', ')}`);
  process.exit(1);
}

const timeout = Number(values.timeout);
const maxTabs = Number(values['max-tabs']);
const loadDelay = Number(values['load-delay']);
const stabilityWindow = Number(values['stability-window']);

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
const axeCoreModule = await importFromProject('axe-core');
const axeCore = axeCoreModule ? (axeCoreModule.default ?? axeCoreModule) : null;
const playwrightVersion = packageVersion('playwright');
const axePlaywrightVersion = packageVersion('@axe-core/playwright');
const axeCoreVersion = packageVersion('axe-core');

const results = {
  url: values.url,
  scannedAt: new Date().toISOString(),
  modes,
  axeAvailable: Boolean(AxeBuilder),
  axeCoreVersion,
  axePlaywrightVersion,
  playwrightVersion,
  browserVersion: null,
  catalogVersion: catalog.version,
  tags: requestedTags,
  selector: values.selector || null,
  storageState: values['storage-state'] || null,
  viewports: values.viewports.split(',').map((value) => Number(value.trim())),
  maxTabs,
  timeout,
  loadDelay,
  readiness: {
    readySelector: values['ready-selector'] || null,
    stabilityWindow,
    bestEffort: values['best-effort-readiness'],
    results: {},
  },
  scans: {},
  inventory: null,
};

// The package can be installed while its browser binary is not, so this needs
// the same graceful degradation as a missing package rather than a stack trace.
let browser;
try {
  browser = await chromium.launch();
  results.browserVersion = browser.version();
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

const contextOptions = {
  locale: 'en-US',
  timezoneId: 'UTC',
  colorScheme: 'light',
  viewport: { width: 1440, height: 900 },
};
if (values['storage-state']) {
  contextOptions.storageState = values['storage-state'];
}
const context = await browser.newContext(contextOptions);

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

  // Stable, unique, shadow-aware path used as finding identity. IDs win;
  // otherwise nth-of-type makes repeated links/images distinct.
  window.a11ySelector = (element) => {
    if (!element) return null;
    const parts = [];
    let node = element;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      if (node.id) {
        parts.unshift(`${node.tagName.toLowerCase()}#${CSS.escape(node.id)}`);
        const idRoot = node.getRootNode();
        if (!(idRoot instanceof ShadowRoot)) break;
        parts.unshift('>>');
        node = idRoot.host;
        continue;
      }
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((candidate) => candidate.tagName === node.tagName);
        const index = siblings.indexOf(node) + 1;
        parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
        node = parent;
        continue;
      }
      const root = node.getRootNode();
      if (root instanceof ShadowRoot) {
        parts.unshift(tag);
        parts.unshift('>>');
        node = root.host;
        continue;
      }
      parts.unshift(tag);
      break;
    }
    return parts.join(' > ').replaceAll(' > >> > ', ' >> ');
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

  window.a11yFindById = (id, fromEl) => {
    if (!id) return null;
    try {
      const selector = `#${CSS.escape(id)}`;
      const root = fromEl?.getRootNode?.() || document;
      const local = root.getElementById?.(id) || root.querySelector?.(selector);
      if (local) return local;
      return window.deepQueryAll(document, selector)[0] || null;
    } catch {
      return null;
    }
  };

  window.a11yNameFromContents = (el) => {
    const chunks = [];
    const visit = (node) => {
      if (!node) return;
      if (node.nodeType === Node.TEXT_NODE) {
        chunks.push(node.textContent || '');
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      if (node.getAttribute('aria-hidden') === 'true' || node.hidden) return;
      const ariaLabel = (node.getAttribute('aria-label') || '').trim();
      if (ariaLabel && node !== el) {
        chunks.push(ariaLabel);
        return;
      }
      const tag = node.tagName;
      if (tag === 'IMG' || tag === 'AREA' || (tag === 'INPUT' && node.type === 'image')) {
        const alt = node.getAttribute('alt');
        if (alt) chunks.push(alt);
        return;
      }
      if (tag === 'SVG') {
        const title = node.querySelector(':scope > title');
        if (title) chunks.push(title.textContent || '');
      }
      if (tag === 'SLOT') {
        for (const assigned of node.assignedNodes({ flatten: true })) visit(assigned);
        return;
      }
      for (const child of node.childNodes) visit(child);
      if (node.shadowRoot) {
        for (const child of node.shadowRoot.childNodes) visit(child);
      }
    };
    visit(el);
    return chunks.join(' ').replace(/\s+/g, ' ').trim();
  };

  // AccName approximation used when axe-core is not injected: labelledby
  // resolves inside shadow trees, and image-only links include img[alt].
  window.a11yAccessibleName = (el) => {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return '';
    const labelledBy = el.getAttribute('aria-labelledby');
    if (labelledBy) {
      const joined = labelledBy.split(/\s+/)
        .map((id) => {
          const ref = window.a11yFindById(id, el);
          return ref ? window.a11yNameFromContents(ref) : '';
        })
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (joined) return joined;
    }
    const ariaLabel = (el.getAttribute('aria-label') || '').trim();
    if (ariaLabel) return ariaLabel;
    if (el.tagName === 'IMG' || el.tagName === 'AREA' || (el.tagName === 'INPUT' && el.type === 'image')) {
      const alt = el.getAttribute('alt');
      if (alt != null) return alt.trim();
    }
    return window.a11yNameFromContents(el);
  };
});

const page = await context.newPage();

async function gotoPage(mode) {
  await page.goto(values.url, { waitUntil: 'load', timeout });
  if (values['ready-selector']) {
    await page.locator(values['ready-selector']).waitFor({ state: 'attached', timeout });
  }
  if (loadDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, loadDelay));
  }
  let stability = 'disabled';
  if (stabilityWindow > 0) {
    stability = await page.evaluate(({ quietMs, maximumMs }) => new Promise((resolve) => {
      let quietTimer;
      let maximumTimer;
      let finished = false;
      const finish = (result) => {
        if (finished) return;
        finished = true;
        observer.disconnect();
        clearTimeout(quietTimer);
        clearTimeout(maximumTimer);
        resolve(result);
      };
      const observer = new MutationObserver(() => {
        clearTimeout(quietTimer);
        quietTimer = setTimeout(() => finish('stable'), quietMs);
      });
      observer.observe(document.documentElement, {
        attributes: true, childList: true, characterData: true, subtree: true,
      });
      quietTimer = setTimeout(() => finish('stable'), quietMs);
      maximumTimer = setTimeout(() => finish('maximum-time-reached'), maximumMs);
    }), { quietMs: stabilityWindow, maximumMs: Math.min(timeout, 5000) });
  }
  results.readiness.results[mode] ??= [];
  results.readiness.results[mode].push(stability);
  if (stability === 'maximum-time-reached' && !values['best-effort-readiness']) {
    throw new Error(
      `DOM did not remain stable for ${stabilityWindow}ms; `
      + 'use --ready-selector or explicitly opt into --best-effort-readiness',
    );
  }
}

/** axe-core scan of the page (or a subtree). */
async function runAxe() {
  if (!AxeBuilder) {
    return { status: 'skipped', reason: '@axe-core/playwright not installed' };
  }
  if (axePlaywrightVersion !== EXPECTED_AXE_PLAYWRIGHT_VERSION
      || axeCoreVersion !== EXPECTED_AXE_CORE_VERSION) {
    return {
      status: 'error',
      reason: `scanner version mismatch: expected @axe-core/playwright ${EXPECTED_AXE_PLAYWRIGHT_VERSION} `
        + `and axe-core ${EXPECTED_AXE_CORE_VERSION}; found `
        + `${axePlaywrightVersion || 'missing'} and ${axeCoreVersion || 'missing'}`,
      install: `npm install -D @axe-core/playwright@${EXPECTED_AXE_PLAYWRIGHT_VERSION} `
        + `axe-core@${EXPECTED_AXE_CORE_VERSION}`,
    };
  }
  const actualRuleIds = axeCore.getRules(SUPPORTED_AXE_TAGS)
    .map((rule) => rule.ruleId)
    .sort();
  const expectedRuleIds = [...scannerConfig.axe_rule_ids].sort();
  if (JSON.stringify(actualRuleIds) !== JSON.stringify(expectedRuleIds)) {
    return {
      status: 'error',
      reason: 'axe rule catalog parity check failed',
      expectedRuleIds,
      actualRuleIds,
    };
  }
  await gotoPage('axe');
  let builder = new AxeBuilder({ page }).withTags(requestedTags);
  builder = builder.disableRules(DISABLED_AXE_RULES);
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
  await gotoPage('keyboard');
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
  await gotoPage('coverage');

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
  await gotoPage('tree');
  if (axeCore?.source) {
    try {
      await page.addScriptTag({ content: axeCore.source });
      await page.evaluate(() => {
        if (window.axe?.setup) window.axe.setup(document);
      });
    } catch {
      // Tree names fall back to window.a11yAccessibleName.
    }
  }
  const structure = await page.evaluate(() => {
    const accessibleName = (el) => {
      let name = '';
      try {
        if (window.axe?.commons?.text?.accessibleText) {
          name = window.axe.commons.text.accessibleText(el) || '';
        }
      } catch {
        name = '';
      }
      if (!name) name = window.a11yAccessibleName(el);
      return String(name).replace(/\s+/g, ' ').trim();
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
      selector: window.a11ySelector(el),
    }));

    const roleCounts = {};
    for (const el of window.deepQueryAll(document, '[role]')) {
      const role = el.getAttribute('role');
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }

    const links = [...window.deepQueryAll(document, 'a[href]')].map((el) => ({
      selector: window.a11ySelector(el),
      name: accessibleName(el).slice(0, 80),
      href: el.getAttribute('href'),
      target: el.getAttribute('target'),
    }));

    const images = [...window.deepQueryAll(document, 'img')].map((el) => ({
      selector: window.a11ySelector(el),
      alt: el.getAttribute('alt'),
      src: el.getAttribute('src'),
    }));

    const customWidgetRoles = ['combobox', 'listbox', 'tablist', 'tree', 'grid', 'menu', 'menubar', 'slider', 'spinbutton'];
    const hasCustomWidgets = customWidgetRoles.some((role) => (roleCounts[role] || 0) > 0)
      || window.deepQueryAll(document, '[aria-expanded], [aria-haspopup]').length > 0;

    return {
      title: document.title,
      lang: document.documentElement.lang || null,
      landmarks,
      headings,
      roleCounts,
      hasSkipLink: Boolean(document.querySelector('a[href^="#"]')),
      inventory: {
        hasTables: window.deepQueryAll(document, 'table, [role="table"], [role="grid"]').length > 0,
        hasForms: window.deepQueryAll(
          document,
          'form, input, select, textarea, [role="form"], [role="textbox"], [role="searchbox"], [role="combobox"]',
        ).length > 0,
        hasMedia: window.deepQueryAll(document, 'video, audio, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"]').length > 0,
        hasDialogs: window.deepQueryAll(
          document,
          'dialog, [role="dialog"], [role="alertdialog"], [aria-haspopup="dialog"]',
        ).length > 0,
        hasLiveRegions: window.deepQueryAll(document, '[aria-live], [role="status"], [role="alert"], [role="log"]').length > 0,
        hasCustomWidgets,
        links,
        images,
      },
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

  const treeResult = {
    status: 'ok',
    ...structure,
    h1Count: structure.headings.filter((h) => h.level === 1).length,
    skippedHeadingLevels: skipped,
    missingLandmarks: required.filter((r) => !present.has(r)),
    ariaSnapshot,
  };
  const { inventory, ...treeWithoutInventory } = treeResult;
  if (inventory) {
    results.inventory = inventory;
  }
  return inventory ? treeWithoutInventory : treeResult;
}

/** Reflow (1.4.10) and target size (2.5.8) across viewport widths. */
async function runViewport() {
  const widths = values.viewports.split(',').map((w) => parseInt(w.trim(), 10));
  const perViewport = [];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    await gotoPage(`viewport-${width}`);

    const measurements = await page.evaluate(() => {
      const minTarget = 24; // WCAG 2.5.8 Level AA, CSS pixels

      const targets = [...window.deepQueryAll(document, [
        'a[href]', 'button', 'input', 'select', 'textarea', 'summary',
        '[onclick]', '[tabindex]:not([tabindex="-1"])',
        '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="radio"]',
        '[role="switch"]', '[role="tab"]', '[role="menuitem"]',
        '[role="menuitemcheckbox"]', '[role="menuitemradio"]', '[role="option"]',
        '[role="slider"]', '[role="spinbutton"]', '[role="treeitem"]',
        '[role="gridcell"]',
      ].join(', '))]
        .map((el) => ({ el, rect: el.getBoundingClientRect(), style: getComputedStyle(el) }))
        .filter(({ rect, style }) => rect.width > 0 && rect.height > 0
          && style.display !== 'none' && style.visibility !== 'hidden');

      // SC 2.5.8 exception "spacing": a 24px-diameter circle centred on an
      // undersized target must not intersect another undersized target's
      // circle or the bounding box of a target that is already at least 24px.
      const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
      const distanceToRect = (point, rect) => {
        const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
        const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
        return Math.hypot(dx, dy);
      };
      const hasClearance = (subject) => {
        const a = centre(subject.rect);
        return targets.every((other) => {
          if (other.el === subject.el) return true;
          const otherIsSmall = other.rect.width < minTarget || other.rect.height < minTarget;
          if (otherIsSmall) {
            const b = centre(other.rect);
            return Math.hypot(a.x - b.x, a.y - b.y) >= minTarget;
          }
          return distanceToRect(a, other.rect) >= minTarget / 2;
        });
      };

      const isInlineTextException = (target) => {
        if (target.style.display !== 'inline') return false;
        const container = target.el.closest('p, li, dd, dt, figcaption, label');
        if (!container) return false;
        const surrounding = (container.textContent || "")
          .replace(target.el.textContent || "", "")
          .trim();
        return surrounding.length > 0;
      };

      const smallTargets = targets
        .filter(({ rect }) => rect.width < minTarget || rect.height < minTarget)
        .map((t) => {
          // SC 2.5.8 inline exception applies to sentence/block text, not every
          // inline or inline-block control.
          const inline = isInlineTextException(t);
          return {
            selector: window.a11ySelector(t.el),
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

    perViewport.push({ width, ...measurements });
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
  status: completed === modes.length ? 'ok' : completed ? 'partial' : 'failed',
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

const axeFailed = modes.includes('axe') && results.scans.axe?.status !== 'ok';
if (completed === 0 || axeFailed) {
  process.exitCode = 1;
}
