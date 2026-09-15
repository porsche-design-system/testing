# Scored findings

Chat may summarize counts. Return finding objects to the orchestrator; the only scored artifacts are its immutable phase/page `a11y-finding-batch` JSON files. Follow `a11y-severity-scoring/references/finding-batch.md` and `a11y-severity-scoring/references/rule-catalog.md`.

**May emit:** `color-only-meaning`, `prefers-reduced-motion`

**When the scanner completed, do not emit:** `color-contrast`, `color-contrast-enhanced`, `link-in-text-block`, `target-size`, `reflow`. Do not re-measure contrast; axe-core owns it.

Severity and WCAG come from the catalog. Location identity is `file`. The orchestrator writes `"findings": []` when nothing matches `emit_if`. In code-review-only mode, definitive source defects may use exact scanner-owned catalog IDs.
