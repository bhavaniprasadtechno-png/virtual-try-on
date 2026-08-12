# Virtual Try-On — threeview Scene Viewer

A "Virtual Try-On" mode for a product configurator across two categories —
**Eyewear** and **Jewellery**. Alongside the static **Preview** mode, users
can open their device camera and see a live overlay tracking the body part
appropriate to the selected product: eyeglasses/necklaces/earrings track the
face, rings/bracelets track the hand.

Implemented from a Claude Design handoff (`scene-viewer-desktop.html` /
`scene-viewer-mobile.html` prototypes) as a single responsive React app
rather than separate desktop/mobile builds, then extended with the
category/product system and hand tracking.

## Stack

- React 18 + TypeScript, built with Vite
- [face-api.js](https://github.com/justadudewhohacks/face-api.js) (TinyFaceDetector) for face tracking (eyewear, necklaces, earrings)
- [@mediapipe/tasks-vision](https://github.com/google-ai-edge/mediapipe) (HandLandmarker) for hand tracking (rings, bracelets)
- Both models' weights **and** the MediaPipe wasm runtime are **self-hosted** under `public/` rather than fetched from a public CDN at runtime, and both libraries are loaded via dynamic `import()` so their (sizeable) bundles only download once Try-On mode actually needs them
- No UI framework dependency — plain CSS using design tokens (`src/styles/tokens.css`) lifted from the handoff's design system

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build
npm run lint       # eslint
```

## Features

- **Two categories, five products** — Eyewear (Chamberlain glasses) and
  Jewellery (Aurora necklace, Stardust earrings, Solstice ring, Halo
  bracelet), switchable via pill tabs at the top of the Customize panel.
- **Preview mode** — product line-art viewer with a customize panel (color
  swatches, size segmented control) that becomes a right-hand sidebar on
  wide viewports and a bottom sheet on narrow ones.
- **Virtual Try-On mode** — requests `getUserMedia` and draws a canvas
  overlay tracking the body part matching the selected product: eye-line for
  glasses, neck for necklaces, both ears for earrings, ring finger for
  rings, wrist for bracelets. Color and size selections apply live without
  restarting the camera.
- **Rendering is decoupled from detection** — the canvas redraws every
  animation frame using the last known tracked position, while face/hand
  detection runs as a separate, self-throttling async loop that updates
  that position whenever it finishes. On-device inference time varies a lot
  by hardware; coupling redraw to detection would make the overlay flicker
  blank on slower devices instead of just updating position less often.
- **Demo fallback** — if the camera is denied, unavailable, or blocked, the
  view falls back to a radial-gradient silhouette (face or hand, matching
  the product's tracking target) with a gently swaying overlay and a "Demo
  camera feed" label, so the flow always advances instead of dead-ending.
- **Responsive** — one layout with a single breakpoint (860px), not two
  separate desktop/mobile builds.

## Project structure

```
src/
  components/
    AppShell/            top nav + side icon rail (app chrome)
    SceneViewer/          Preview/Try-On viewer, category + product pickers,
                          customize panel, floating controls
  hooks/
    useTryOn.ts           camera lifecycle + decoupled render/detect loops
    useFaceModels.ts      lazy-loaded face-api.js + self-hosted weights
    useHandModel.ts       lazy-loaded MediaPipe HandLandmarker + self-hosted
                          wasm runtime and model
  lib/
    drawGlasses.ts        canvas drawing routine — eyewear
    drawJewellery.ts      canvas drawing routines — necklace/earring/ring/bracelet
    overlay.ts            dispatches placement -> draw routine + anchor geometry
  data/
    products.ts           product catalog (category, tracking target, placement, colors)
public/
  models/                 self-hosted TinyFaceDetector weights + hand_landmarker.task
  mediapipe/wasm/         self-hosted MediaPipe vision wasm runtime
```

## Notes / scope

- No capture or download in this iteration — Try-On is preview-only, closed
  via the X control.
- Product art is placeholder line-drawing (`ProductPreviewArt`); swap for the
  real product renderer/photography pipeline when integrating with a live
  catalog.
- `Add to cart` and the material/color selections are UI-only — wire them up
  to real product/cart state when integrating with the broader app.
- Ring/bracelet anchor math assumes a single, front-facing hand in frame;
  it doesn't attempt multi-hand disambiguation.
