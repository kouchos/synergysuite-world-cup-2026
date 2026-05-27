# `public/`

Vite serves files in this directory as static assets at the site root.

## Required

- `synergysuite-wc-logo.png` — the branded SynergySuite World Cup 2026 logo
  rendered in the top-left of the header. The header component handles a
  missing file gracefully (the brand chip just hides), so the page renders
  fine without it — but ship it for the office TV.

  Recommended: ~600px wide, transparent or white background (the chip is a
  white card so either works). Height of the rendered chip auto-fits within
  ~48–64px depending on viewport.
