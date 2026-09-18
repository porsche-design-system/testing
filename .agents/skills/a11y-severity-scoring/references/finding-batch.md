# Finding batch (scored artifact)

Domain skills may summarize in chat, but they return finding objects to the
orchestrator and never write shared files. The orchestrator writes one immutable
JSON file per phase and page:
`$SCRATCH/findings-agent-phase-<N>-page-<M>.json`.

`rule_id` must exist in [rule-catalog.json](rule-catalog.json). Severity and WCAG are overwritten from the catalog. Location identity is `selector` or `file` — do not put line numbers in the identity fields.

```json
{
  "type": "a11y-finding-batch",
  "url": "<page URL>",
  "source": "agent-review",
  "phase": "9",
  "findings": [
    {
      "rule_id": "link-name-ambiguous",
      "location": {"selector": "footer a[href='/help']"},
      "description": "Link accessible name is \"click here\".",
      "impact": "Screen reader users cannot tell the destination from the link text.",
      "remediation": "Use visible text that names the destination.",
      "phase": "9"
    }
  ]
}
```

Rules:

1. Omit `severity`, `confidence`, `wcag`, and `wcag_level` — the catalog supplies them. If present, they are ignored.
2. Emit a finding only when that rule's `emit_if` is true. Do not invent IDs.
3. Set `source` once at the batch top level (`agent-review`). Do not put `source` or `sources` on individual findings; the normalizer rejects that so an agent batch cannot claim `axe` or `playwright`.
4. If axe or Playwright completed for this page, do not emit rules owned by that
   scanner. In code-review-only mode, scanner-owned catalog IDs may be emitted
   from an `agent-review` batch.
5. Put the code-review phase at top level even when `findings` is empty. This
   records coverage for reproducible fix verification.
6. When nothing matches, write `"findings": []` still so the page appears in the scorecard.
7. Chat summary (counts) is optional and must not be used for scoring.
