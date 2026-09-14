# Images and media

## Images

- Give meaningful images concise `alt` text that communicates their purpose in context. Use `alt=""` for decorative images, including decorative `next/image` output.
- Do not repeat an adjacent caption or link label in `alt`. If an image is the only content of a control, its alternative names the control’s action or destination.
- Hide decorative SVG/icons from assistive technology. Give standalone meaningful SVG a text alternative; do not name both an icon and adjacent text.
- Use `<figure>`/`<figcaption>` when a caption belongs to an image. Provide an adjacent structured explanation or data table for charts, maps, and other complex images.
- Do not use images of text when real text can provide the same presentation, except when the text’s visual presentation can be customized to the user’s requirements or that presentation is essential, such as a logo (1.4.5). Do not put meaningful content only in CSS backgrounds.
- Give embedded frames a concise `title` describing their content.

## Audio and video

- Provide captions for prerecorded synchronized media (1.2.2), captions for live synchronized media (1.2.4), and audio description for prerecorded video when important visuals are not conveyed in the main audio (1.2.5; EN 301 549 clause 7 as applicable).
- Provide a transcript for audio-only content and an equivalent alternative for video-only content.
- Expose keyboard-operable controls for play/pause, volume, captions, spoken subtitles, audio description, and seeking where available. Controls need accessible names and visible focus.
- Preserve and synchronize available captions, spoken subtitles, and audio-description data through transmission, conversion, and recording. When the player controls subtitle presentation, let users adjust the relevant display characteristics.
- For products primarily displaying video, make caption and audio-description activation available at the same interaction level as volume controls and operable with a single action where EN 301 549 clause 7 requires it.
- Do not autoplay audio for more than three seconds without a control to pause/stop it or control volume independently (1.4.2).
- Avoid flashing content above the three-flashes threshold (2.3.1).
