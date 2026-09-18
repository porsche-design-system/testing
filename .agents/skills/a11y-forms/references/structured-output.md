# Scored findings

Chat may summarize counts. Return finding objects to the orchestrator; the only scored artifacts are its immutable phase/page `a11y-finding-batch` JSON files. Follow `a11y-severity-scoring/references/finding-batch.md` and `a11y-severity-scoring/references/rule-catalog.md`.

**May emit:** `placeholder-only-label`, `error-not-associated`, `autocomplete-missing`, `wizard-step-focus`

**When the scanner completed, do not emit:** `label`, `label-title-only`, `form-field-multiple-labels`, `select-name`, `input-button-name`, `autocomplete-valid`, `button-name`

Severity and WCAG come from the catalog. Location identity is `file` for these rules. The orchestrator writes `"findings": []` when nothing matches `emit_if`. In code-review-only mode, definitive source defects may use exact scanner-owned catalog IDs.
