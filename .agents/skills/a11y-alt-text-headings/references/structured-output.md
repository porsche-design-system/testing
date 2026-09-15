# Scored findings

Chat may summarize counts. Return finding objects to the orchestrator; the only scored artifacts are its immutable phase/page `a11y-finding-batch` JSON files. Follow `a11y-severity-scoring/references/finding-batch.md` and `a11y-severity-scoring/references/rule-catalog.md`.

**May emit:** `alt-text-quality`, `language-of-parts`

**When the scanner completed, do not emit:** `image-alt`, `input-image-alt`, `svg-img-alt`, `role-img-alt`, `area-alt`, `object-alt`, `heading-order`, `page-has-heading-one`, `html-has-lang`, `html-lang-valid`, `valid-lang`, `document-title`, `bypass`, `landmark-missing`

Severity and WCAG come from the catalog. Location identity is `selector` or `file`, never a line number. The orchestrator writes `"findings": []` when nothing matches `emit_if`. In code-review-only mode, definitive source defects may use exact scanner-owned catalog IDs.
