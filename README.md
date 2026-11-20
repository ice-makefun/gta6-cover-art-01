# Vice Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ice-makefun/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ice-makefun/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-ff2975)](https://make.fun/bounty/gta6-cover-art-01)

A web app that turns your photo and a caption into GTA-style multi-panel cover art, exported as a PNG to share. Built for the [make.fun GTA 6 cover art bounty](https://make.fun/bounty/gta6-cover-art-01).

## What it does

- **Multi-panel posters** — six layouts (Hero Left, Hero Right, Triptych, Top Hero, Four Grid, Cinema Strip) with white gutters, in the style of a Vice City poster wall.
- **Any photo** — upload your own photos, or start from the two included sample photos. Each panel gets its own photo: click a panel to select it, drag to move its photo, scroll to zoom, or use the zoom slider.
- **Caption lettering** — a kicker, a script line and a big block title in Anton, with three lettering styles (Block, Neon Glow, Script Mix).
- **Neon-sunset grades** — five colour grades (Neon Sunset, Vice Nights, Palm Noir, Hot Pink, Golden Hour) plus a synthwave sun, halftone dots, film grain and a vignette, all drawn on canvas.
- **Fast export** — one click exports a PNG in 1080 × 1080, 1080 × 1350 or 1920 × 1080. Undo/redo and a shuffle button included.

## Run it

Serve `app/` with any static file server and open `index.html` — the app works fully offline; photos never leave your machine.

```sh
cd app && python3 -m http.server 8080
# open http://localhost:8080
```

## Fonts and photos

- Fonts are Anton and Pacifico under the SIL Open Font License; the font files and their licence texts live in `app/fonts/`.
- The two sample photos in `app/samples/` were made with an image model for make.fun and are free to use.
- No Rockstar Games logo, artwork, character or font is used anywhere.

## Hand in

`main.ts` (Node 22) copies `app/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored `vendor/makefun-app.ts` library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Licence

MIT — see [LICENSE](LICENSE).
