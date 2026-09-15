#!/usr/bin/env python3
"""WCAG contrast ratio checker for the a11y-audit agent.

Computes WCAG 2.x contrast ratios, evaluates them against the right threshold
for the text size and conformance level, and can suggest a passing colour.

Usage:
    contrast.py <foreground> <background> [options]
    contrast.py --batch <file.json> [options]

Colours accept hex (#rgb, #rrggbb, #rrggbbaa), rgb()/rgba(), hsl()/hsla(),
and the CSS named colours most common in design tokens.

Options:
    --large            Treat as large text (>=24px, or >=18.66px bold): 3:1 at AA
    --ui               Treat as a UI component or graphical object boundary: 3:1
    --level {AA,AAA}   Conformance level (default AA)
    --suggest          Propose the nearest passing foreground colour
    --json             Emit JSON only
    --batch <file>     JSON list of {"name","fg","bg","large"?,"ui"?} objects

Exit codes: 0 all checks pass, 1 at least one fails, 2 bad input.

Alpha handling: a foreground with alpha < 1 is composited over the background
before measuring, which is what a browser renders. A background with alpha is
composited over white unless --page-bg is given.
"""

import argparse
import json
import re
import sys

# CSS named colours that actually turn up in design tokens and audits.
NAMED_COLORS = {
    "black": "#000000", "silver": "#c0c0c0", "gray": "#808080", "grey": "#808080",
    "white": "#ffffff", "maroon": "#800000", "red": "#ff0000", "purple": "#800080",
    "fuchsia": "#ff00ff", "magenta": "#ff00ff", "green": "#008000", "lime": "#00ff00",
    "olive": "#808000", "yellow": "#ffff00", "navy": "#000080", "blue": "#0000ff",
    "teal": "#008080", "aqua": "#00ffff", "cyan": "#00ffff", "orange": "#ffa500",
    "pink": "#ffc0cb", "brown": "#a52a2a", "gold": "#ffd700", "indigo": "#4b0082",
    "violet": "#ee82ee", "tan": "#d2b48c", "beige": "#f5f5dc", "ivory": "#fffff0",
    "khaki": "#f0e68c", "salmon": "#fa8072", "coral": "#ff7f50", "crimson": "#dc143c",
    "darkgray": "#a9a9a9", "darkgrey": "#a9a9a9", "dimgray": "#696969",
    "dimgrey": "#696969", "lightgray": "#d3d3d3", "lightgrey": "#d3d3d3",
    "slategray": "#708090", "slategrey": "#708090", "transparent": "#00000000",
}


class ColorError(ValueError):
    """Raised when a colour string cannot be parsed."""


def _hsl_to_rgb(h, s, lightness):
    h = h % 360 / 360.0
    if s == 0:
        value = round(lightness * 255)
        return value, value, value

    def hue_to_channel(p, q, t):
        t = t % 1.0
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p

    q = lightness * (1 + s) if lightness < 0.5 else lightness + s - lightness * s
    p = 2 * lightness - q
    return tuple(round(hue_to_channel(p, q, h + offset) * 255)
                 for offset in (1 / 3, 0, -1 / 3))


def parse_color(value):
    """Parse a CSS colour string into an (r, g, b, a) tuple."""
    if not isinstance(value, str):
        raise ColorError(f"expected a colour string, got {type(value).__name__}")
    text = value.strip().lower()
    text = NAMED_COLORS.get(text, text)

    if text.startswith("#"):
        digits = text[1:]
        if len(digits) in (3, 4):
            digits = "".join(c * 2 for c in digits)
        if len(digits) not in (6, 8) or not re.fullmatch(r"[0-9a-f]+", digits):
            raise ColorError(f"invalid hex colour: {value}")
        r, g, b = (int(digits[i:i + 2], 16) for i in (0, 2, 4))
        a = int(digits[6:8], 16) / 255 if len(digits) == 8 else 1.0
        return r, g, b, a

    match = re.fullmatch(r"rgba?\(([^)]+)\)", text)
    if match:
        parts = [p.strip() for p in re.split(r"[,\s/]+", match.group(1)) if p.strip()]
        if len(parts) < 3:
            raise ColorError(f"invalid rgb colour: {value}")
        channels = []
        for part in parts[:3]:
            channels.append(round(float(part[:-1]) * 255 / 100) if part.endswith("%")
                            else int(round(float(part))))
        alpha = 1.0
        if len(parts) > 3:
            alpha = float(parts[3][:-1]) / 100 if parts[3].endswith("%") else float(parts[3])
        return (*channels, alpha)

    match = re.fullmatch(r"hsla?\(([^)]+)\)", text)
    if match:
        parts = [p.strip() for p in re.split(r"[,\s/]+", match.group(1)) if p.strip()]
        if len(parts) < 3:
            raise ColorError(f"invalid hsl colour: {value}")
        hue = float(re.sub(r"deg$", "", parts[0]))
        sat = float(parts[1].rstrip("%")) / 100
        light = float(parts[2].rstrip("%")) / 100
        alpha = 1.0
        if len(parts) > 3:
            alpha = float(parts[3][:-1]) / 100 if parts[3].endswith("%") else float(parts[3])
        return (*_hsl_to_rgb(hue, sat, light), alpha)

    raise ColorError(f"unrecognised colour: {value}")


def composite(top, bottom):
    """Alpha-composite `top` over opaque `bottom`, as a browser would paint it."""
    tr, tg, tb, ta = top
    br, bg_, bb, _ = bottom
    if ta >= 1.0:
        return tr, tg, tb, 1.0
    return (
        round(tr * ta + br * (1 - ta)),
        round(tg * ta + bg_ * (1 - ta)),
        round(tb * ta + bb * (1 - ta)),
        1.0,
    )


def relative_luminance(color):
    """WCAG 2.x relative luminance."""
    channels = []
    for raw in color[:3]:
        c = max(0, min(255, raw)) / 255.0
        channels.append(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]


def contrast_ratio(fg, bg):
    lighter, darker = sorted((relative_luminance(fg), relative_luminance(bg)), reverse=True)
    return (lighter + 0.05) / (darker + 0.05)


def required_ratio(level, large, ui):
    if ui:
        return 3.0
    if level == "AAA":
        return 4.5 if large else 7.0
    return 3.0 if large else 4.5


def suggest_passing(fg, bg, target):
    """Walk the foreground toward black or white until it clears `target`.

    Returns the first passing colour, preferring the direction that moves away
    from the background luminance, so the suggestion stays close to the original.
    """
    bg_luminance = relative_luminance(bg)
    toward = (0, 0, 0) if bg_luminance > 0.5 else (255, 255, 255)
    best = None
    for step in range(1, 101):
        ratio_step = step / 100
        candidate = tuple(
            round(fg[i] + (toward[i] - fg[i]) * ratio_step) for i in range(3)
        ) + (1.0,)
        if contrast_ratio(candidate, bg) >= target:
            best = candidate
            break
    if best is None:
        return None
    return {
        "hex": "#{:02x}{:02x}{:02x}".format(*best[:3]),
        "ratio": round(contrast_ratio(best, bg), 2),
        "direction": "darker" if toward == (0, 0, 0) else "lighter",
    }


def check(fg_raw, bg_raw, level="AA", large=False, ui=False, page_bg="#ffffff", suggest=False, name=None):
    page = parse_color(page_bg)
    bg = composite(parse_color(bg_raw), page)
    fg = composite(parse_color(fg_raw), bg)

    ratio = contrast_ratio(fg, bg)
    target = required_ratio(level, large, ui)
    passed = ratio >= target

    result = {
        "name": name,
        "foreground": fg_raw,
        "background": bg_raw,
        "ratio": round(ratio, 2),
        "required": target,
        "level": level,
        "context": "ui-component" if ui else ("large-text" if large else "normal-text"),
        "pass": passed,
        # Report what else the same pair would satisfy, so the audit can grade partial wins.
        "also_passes": {
            "AA normal (4.5:1)": ratio >= 4.5,
            "AA large (3:1)": ratio >= 3.0,
            "AAA normal (7:1)": ratio >= 7.0,
            "AAA large (4.5:1)": ratio >= 4.5,
            "UI component (3:1)": ratio >= 3.0,
        },
    }
    if suggest and not passed:
        result["suggestion"] = suggest_passing(fg, bg, target)
    return result


def format_line(result):
    verdict = "PASS" if result["pass"] else "FAIL"
    label = f'{result["name"]}: ' if result.get("name") else ""
    line = (f'{label}{result["foreground"]} on {result["background"]} — '
            f'{result["ratio"]}:1 (needs {result["required"]}:1 for '
            f'{result["context"]} at {result["level"]}) — {verdict}')
    suggestion = result.get("suggestion")
    if suggestion:
        line += f'\n  Suggested: {suggestion["hex"]} ({suggestion["ratio"]}:1, {suggestion["direction"]})'
    elif result.get("suggestion", "missing") is None:
        line += "\n  No suggestion found: the background itself may need to change."
    return line


def main():
    parser = argparse.ArgumentParser(add_help=True, description="WCAG contrast ratio checker.")
    parser.add_argument("foreground", nargs="?")
    parser.add_argument("background", nargs="?")
    parser.add_argument("--large", action="store_true")
    parser.add_argument("--ui", action="store_true")
    parser.add_argument("--level", choices=["AA", "AAA"], default="AA")
    parser.add_argument("--page-bg", default="#ffffff",
                        help="Opaque colour beneath a translucent background (default white)")
    parser.add_argument("--suggest", action="store_true")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--batch", help="JSON file: list of {name, fg, bg, large?, ui?}")
    args = parser.parse_args()

    try:
        if args.batch:
            with open(args.batch, encoding="utf-8") as handle:
                pairs = json.load(handle)
            results = [
                check(p["fg"], p["bg"], args.level, p.get("large", False),
                      p.get("ui", False), args.page_bg, args.suggest, p.get("name"))
                for p in pairs
            ]
        elif args.foreground and args.background:
            results = [check(args.foreground, args.background, args.level,
                             args.large, args.ui, args.page_bg, args.suggest)]
        else:
            parser.error("provide <foreground> <background>, or --batch <file>")
            return 2
    except ColorError as error:
        print(json.dumps({"error": str(error)}) if args.json else f"Error: {error}",
              file=sys.stderr)
        return 2
    except (OSError, json.JSONDecodeError, KeyError) as error:
        print(f"Error reading batch file: {error}", file=sys.stderr)
        return 2

    failures = [r for r in results if not r["pass"]]

    if args.json:
        print(json.dumps({
            "results": results,
            "summary": {"total": len(results), "passed": len(results) - len(failures),
                        "failed": len(failures)},
        }, indent=2))
    else:
        for result in results:
            print(format_line(result))
        if len(results) > 1:
            print(f"\n{len(results) - len(failures)}/{len(results)} passed.")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
