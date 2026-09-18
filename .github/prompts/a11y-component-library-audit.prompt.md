---
name: a11y-component-library-audit
description: Audit every component in a component library directory for accessibility. Generates a per-component scorecard with severity-ranked issues.
mode: agent
agent: a11y-audit
tools:
  - askQuestions
  - readFile
  - listDirectory
  - createFile
  - runInTerminal
  - getTerminalOutput
---

# Component Library Accessibility Audit

Audit all components in a library directory for accessibility compliance. Each component gets its own scorecard with score, grade, and issues.

These steps are local to this prompt; they are not the agent's numbered audit phases.

## Component Directory

**Path:** `${input:componentDir}`

## Instructions

When the target provides the **a11y-audit** agent, use it. Otherwise execute this prompt directly with the installed `a11y-*` skills and preserve the workflow order and safety requirements below.

### Step 1: Discovery

1. Create `$RUN=.a11y/runs/<timestamp>` and `$SCRATCH=$(mktemp -d)`.
2. Read the finding schema, rule catalog, and finding-batch contract.
3. Scan the directory for component files (`.jsx`, `.tsx`, `.vue`, `.svelte`, `.astro`).
4. Sort paths lexicographically, assign page numbers, and use
   `component://<workspace-relative-posix-path>` as each component URL.
5. Group components by type (forms, navigation, modals, data display, layout).

### Step 2: Per-Component Audit

Use the **a11y-audit component-library batch mode**. Read domain skills
(`a11y-aria`, `a11y-keyboard`, `a11y-forms`, `a11y-contrast`,
`a11y-modal`, `a11y-live-regions`, `a11y-tables`, `a11y-links`,
`a11y-alt-text-headings`, `a11y-text-quality`, `a11y-media`,
`a11y-design-system` as relevant) and check:

- **ARIA correctness** — Valid roles, states, properties for the component type
- **Keyboard interaction** — All interactive elements focusable and operable
- **Screen reader names** — Accessible names computed correctly
- **Focus management** — Focus trapped where needed, returned after close
- **Color/contrast** — No hardcoded colors with insufficient contrast
- **Form labeling** — All inputs have associated labels
- **Heading structure** — Headings used correctly within the component
- **Link text** — No ambiguous "click here" link text
- **Media** — Captions/transcripts when video/audio are present

Domain skills return catalog-valid finding objects; they do not write files.
After each applicable phase and component, the orchestrator writes:

```text
$SCRATCH/findings-agent-phase-<N>-page-<M>.json
```

Use `source: agent-review`. Since no runtime scanner ran, definitive source
findings may use scanner-owned catalog IDs. Do not infer runtime-only behavior,
rendered contrast, focus visibility, or reading order. Write at least one empty
batch for every clean component.

### Step 3: Scorecard Generation

Pass every immutable batch to `normalize-findings.py` and write
`$RUN/findings.json`. Score each component with **`a11y-severity-scoring`
only**. Never calculate or transcribe counts manually.

| Field | Value |
|-------|-------|
| Component | Name |
| Score | 0-100 |
| Grade | A-F |
| Critical Issues | Count |
| Serious Issues | Count |
| Moderate Issues | Count |
| Minor Issues | Count |

### Step 4: Cross-Component Analysis

Identify shared patterns:

- **Template-level issues** — Same issue in multiple components (fix once, fix everywhere)
- **Design token issues** — Color or spacing tokens causing multiple failures
- **Missing patterns** — Components that should exist but don't (skip link, live region wrapper)

### Step 5: Report

Run `export-findings.py --format summary`, paste its numeric block unchanged,
then write `$RUN/ACCESSIBILITY-AUDIT.md`. Sort by score ascending (worst
components first) and include:

1. Summary table of all components with scores
2. Per-component findings with remediation guidance
3. Template-level issues section
4. Priority fix list (highest-impact fixes first)

Delete `$SCRATCH` and print the full report path.
