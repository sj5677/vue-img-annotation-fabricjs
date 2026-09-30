# Image Annotation POC

A proof-of-concept Vue 3 app for drawing annotations on top of images using [fabric.js](http://fabrijs.com/).

**Live demo:** https://vue-img-annotation-fabricjs.vercel.app/

## What it does

- Displays a page with two sample images (cat and duck), each with its own annotation toolbar.
- Clicking **Annotate** opens a fabric.js canvas editor over the image.
- The toolbar supports:
  - **Back** – exit the editor without saving
  - **Undo** – step back through canvas history
  - **Select** – select/move/resize existing elements
  - **Draw** – freehand pen/highlighter drawing with adjustable color and size
  - **Stamp** – place vector stamps (tick, cross, circle) onto the image
  - **Text** – add editable text boxes
  - **Done** – finalize the current set of drawn elements as a "save"
- Each **Annotate** action produces a new "save" — a grouped, normalized payload of elements plus a computed bounding box. Saves are persisted to `localStorage` (keyed per image) and re-rendered together over the image.
- A **Role** selector (Teacher / Student) changes the default stroke color (red for teacher, black for student).
- View mode lets you toggle bounding boxes, inspect the raw saved payloads, and clear all saves for an image.

## Tech stack

- [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`, TypeScript)
- [fabric.js](http://fabrijs.com/) v7 for the canvas drawing engine
- [Carbon Design System](https://carbondesignsystem.com/) (`@carbon/vue`, `@carbon/icons-vue`) for UI components/icons
- [Vite](https://vitejs.dev/) for dev server and build

## Project structure

```
src/
  App.vue                     # page shell, image list, role selector
  main.ts                     # app entry point
  annotation/
    ImageAnnotation.vue       # per-image container: view mode + editor mode
    AnnotationCanvas.vue      # fabric.js canvas editor (draw/stamp/text/select)
    AnnotationRenderer.vue    # static re-render of all saved elements + bounding boxes
    AnnotationToolbar.vue     # toolbar UI (tool buttons, color/size pickers)
    serialization.ts          # fabric.js <-> save payload conversion
    storage.ts                # localStorage persistence per image
    stamps.ts                 # stamp shape definitions (tick/cross/circle)
    constants.ts               # shared constants (colors, brush sizes, etc.)
    types.ts                  # shared TypeScript types
    utils.ts                  # misc helpers
```

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL in your browser.

Other scripts:

```bash
npm run build    # type-check (vue-tsc) + production build
npm run preview  # preview the production build locally
```

## Save format

Each annotation "save" is stored as a normalized payload:

```ts
{
  schemaVersion: number;
  elements: Element[]; // strokes, stamps, text, etc.
}
```

Saves are wrapped with metadata (`id`, `createdAt`, `payload`, `boundingBox`) and stored per image under a `img-annotation:<imageUrl>` key in `localStorage`.
