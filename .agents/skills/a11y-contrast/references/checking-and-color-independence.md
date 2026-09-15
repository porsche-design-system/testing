# Contrast Checking and Color Independence

## How to Check Contrast

Run `scripts/contrast.py` rather than computing ratios by hand — the formula is easy to get subtly wrong, and estimated ratios are the most common source of false findings in an audit.

```bash
# Single pair
python3 scripts/contrast.py "#767676" "#ffffff"

# Large text (>=24px, or >=18.66px bold) uses the 3:1 threshold
python3 scripts/contrast.py "#949494" "#ffffff" --large

# UI component boundaries and graphical objects: 3:1
python3 scripts/contrast.py "#80bdff" "#ffffff" --ui

# Get a passing replacement colour
python3 scripts/contrast.py "#bbbbbb" "#ffffff" --suggest
```

For an audit, extract every text-on-background pair from CSS or Tailwind config and check them in one batch:

```bash
cat > pairs.json <<'EOF'
[
  {"name": "body text",      "fg": "#333333", "bg": "#ffffff"},
  {"name": "muted text",     "fg": "#999999", "bg": "#ffffff"},
  {"name": "primary button", "fg": "#ffffff", "bg": "#0066cc"},
  {"name": "focus ring",     "fg": "#80bdff", "bg": "#ffffff", "ui": true}
]
EOF
python3 scripts/contrast.py --batch pairs.json --suggest
```

Add `--json` for machine-readable output to fold into findings. The script exits `1` when any pair fails, so it also works as a CI gate.

It accepts hex, `rgb()`, `hsl()`, and named colours, and composites alpha over the background the way a browser paints it — so `#76767680` is measured as what the user actually sees, not as if it were opaque.

**Token values are not the whole story.** This checks declared colour pairs. Elements can still fail at runtime through inherited or overlapping backgrounds, so run `a11y-playwright` with `--mode axe` whenever a URL is available and manually verify cases the scanner marks as not checked.

## Color Independence

Never convey information through color alone. Every color-coded element needs a secondary indicator.

### Status Indicators
```html
<!-- BAD: Color only -->
<span class="text-red-500">Error</span>
<span class="text-green-500">Success</span>

<!-- GOOD: Color plus text/icon -->
<span class="text-red-500">
  <svg aria-hidden="true"><!-- X icon --></svg>
  Error: Invalid email address
</span>
<span class="text-green-500">
  <svg aria-hidden="true"><!-- Check icon --></svg>
  Success: Changes saved
</span>
```

### Form Errors
- Red border alone is not sufficient
- Include error text associated with `aria-describedby`
- Include an icon or prefix ("Error:")
- Focus moves to first error field

### Charts and Data Visualization
- Use patterns, shapes, or labels in addition to color
- Direct labels on data points are better than color-coded legends
- If using color-coded legend, add pattern fills or distinct markers

### Links
- Links within body text must be visually distinct beyond color
- Underline is the most reliable indicator
- If not underlined, must have 3:1 contrast against surrounding text AND a non-color visual change on hover/focus

