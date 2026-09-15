---
name: a11y-media
description: "Video, audio, captions, audio description, and media alternatives (WCAG 1.2.x) for accessibility audits."
user-invocable: false
---

# A11y Media

## Audit phase role

The `a11y-audit` agent owns phase numbering. During a phased site audit, this skill runs only in **Phase 2 (Structure)** when video, audio, or media iframes are present. Complete one pass: apply the checklist, return findings, and stop. Do not start another phase.

This skill is a checklist/procedure module for `a11y-audit` when reviewing time-based media. Apply the checklist below and return structured findings (description, severity, WCAG criterion, impact, location, confidence, recommended fix). This skill does not edit source files.

## Authoritative Sources

- **WCAG 1.2.1 Audio-only and Video-only (Prerecorded)** — https://www.w3.org/WAI/WCAG22/Understanding/audio-only-and-video-only-prerecorded.html
- **WCAG 1.2.2 Captions (Prerecorded)** — https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html
- **WCAG 1.2.3 Audio Description or Media Alternative (Prerecorded)** — https://www.w3.org/WAI/WCAG22/Understanding/audio-description-or-media-alternative-prerecorded.html
- **WCAG 1.2.4 Captions (Live)** — https://www.w3.org/WAI/WCAG22/Understanding/captions-live.html
- **WCAG 1.2.5 Audio Description (Prerecorded)** — https://www.w3.org/WAI/WCAG22/Understanding/audio-description-prerecorded.html
- **WAI Media Alternatives Tutorial** — https://www.w3.org/WAI/media/av/

## When to apply

Load this skill when the page or codebase includes:

- `<video>`, `<audio>`, or media players (custom or third-party)
- Embedded media iframes (YouTube, Vimeo, Wistia, etc.)
- Podcasts, webinars, animated explainer videos, or live streams
- Deep-dive audits (always scan for media even if not obvious in Phase 0)

For static images, SVG, and icon alternatives, use `a11y-alt-text-headings` instead.

## Checklist

### Prerecorded video with audio (typical product videos)

| Check | WCAG | Fail if |
|-------|------|---------|
| Captions available and synchronized | 1.2.2 (A) | No captions, or captions missing speech/important sounds |
| Audio description **or** full text alternative | 1.2.3 (A) | Visual-only information never described |
| Audio description (AA) | 1.2.5 (AA) | Important visuals not in soundtrack and no AD track/version |
| Player keyboard operable | 2.1.1 | Controls only work with mouse |
| Player has accessible name | 4.1.2 | Unlabeled play/mute/fullscreen controls |
| No unexpected autoplay of audio | 1.4.2 | Audio plays automatically and cannot be stopped within 3s |

### Prerecorded audio-only (podcasts, voice notes)

| Check | WCAG | Fail if |
|-------|------|---------|
| Transcript available | 1.2.1 (A) | No text alternative for spoken content |
| Player controls accessible | 2.1.1 / 4.1.2 | Cannot play/pause/seek by keyboard; unlabeled controls |

### Prerecorded video-only (silent animation / screen recording without narration)

| Check | WCAG | Fail if |
|-------|------|---------|
| Text alternative or audio track describing content | 1.2.1 (A) | No alternative describing the video |

### Live media

| Check | WCAG | Fail if |
|-------|------|---------|
| Live captions | 1.2.4 (AA) | Live audio/video event has no captions when captions are required for the target level |

### Player UX (all media)

- Prefer native `<video controls>` / `<audio controls>` or a documented accessible custom player
- Visible captions toggle; captions default on when that is product policy
- Do not trap keyboard focus inside the player
- Provide a text transcript link near the player when relying on transcript as an alternative
- Third-party embeds: verify caption/AD settings are enabled; note host limitations in findings (medium confidence if iframe is opaque)

## Preferred markup patterns

### HTML5 video with tracks

```html
<video controls aria-label="Product demo walkthrough">
  <source src="demo.mp4" type="video/mp4">
  <track kind="captions" src="captions.vtt" srclang="en" label="English captions" default>
  <track kind="descriptions" src="descriptions.vtt" srclang="en" label="Audio descriptions">
  Your browser does not support video. <a href="transcript.html">Read the transcript</a>.
</video>
```

### Audio with transcript

```html
<audio controls aria-label="Episode 42: Accessibility in 2025">
  <source src="podcast.mp3" type="audio/mpeg">
</audio>
<p><a href="transcript-ep42.html">Transcript for Episode 42</a></p>
```

### Avoid

```html
<!-- Autoplaying unmuted video -->
<video src="promo.mp4" autoplay></video>

<!-- Video with no captions track and no transcript -->
<video controls src="talk.mp4"></video>
```

## Finding severity guidance

| Issue | Typical severity |
|-------|------------------|
| Prerecorded video without captions | Critical |
| Audio-only without transcript | Critical |
| Missing AD when visuals convey unique info (AA target) | Serious |
| Inaccessible custom player controls | Critical / Serious |
| Autoplay with audio that cannot be stopped quickly | Serious |
| Embed present but caption availability unknown | Moderate (flag for manual verify) |

## Scored findings

If inventory `hasMedia` is false, do not load this skill. Otherwise return catalog-valid finding objects to `a11y-audit`; do not write a shared batch file. The orchestrator writes immutable `$SCRATCH/findings-agent-phase-<N>-page-<M>.json` batches. **May emit:** `audio-description-missing`, `transcript-missing`. When Phase 1 completed, do not emit `video-caption` or `no-autoplay-audio`; in code-review-only mode they may use those exact IDs when source evidence is definitive.
