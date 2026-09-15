# Scored findings

If inventory `hasTables` is false, return an empty `findings` array and stop.

Chat may summarize counts. Return finding objects to the orchestrator; the only scored artifacts are its immutable phase/page `a11y-finding-batch` JSON files. Follow `a11y-severity-scoring/references/finding-batch.md` and `a11y-severity-scoring/references/rule-catalog.md`.

**May emit:** `table-caption-missing`, `table-layout`

**When the scanner completed, do not emit:** `td-headers-attr`, `th-has-data-cells`, `td-has-header`, `empty-table-header`, `table-fake-caption`, `scope-attr-valid`

Severity and WCAG come from the catalog. Location identity is `selector` or `file`. The orchestrator writes `"findings": []` when nothing matches `emit_if`. In code-review-only mode, definitive source defects may use exact scanner-owned catalog IDs.
