# Wiring UI

An offline-first, canvas-based electronic wiring diagram editor. Draw component terminal headers, route and edit orthogonal cables, annotate drawings, place electrical symbols, and export a completely self-contained HTML document.

## Features

- Unlimited named and numbered terminals per block; create, edit, reorder by replacing numbers, or remove terminals without deleting the connected cables.
- Automatic orthogonal cable routing anchored to terminals, free ends or reusable junctions. Move a block and its cables follow. Edit bends, drag legs and reconnect cable ends.
- Non-connected cable crossings are shown with curved jump bridges. True electrical connections use persistent junction nodes.
- Wire colours, widths, patterns and labels; rectangles, ellipses, lines, annotations and schematic SVG glyphs.
- Pan, zoom, high-DPI drawing, switchable WebGL2 grid presentation with Canvas2D fallback.
- Import a PDF's first page or an image as an embedded drawing template.
- IndexedDB auto-recovery for the most recent project; localStorage for personal settings.
- Portable `.wiring.json` project files and downloadable self-contained `.html` files.

## Develop

Install Bun (1.3.14 or newer) and clone with the pinned template submodule:

```sh
git clone --recurse-submodules https://github.com/kitty-crow/wiring-ui.git
cd wiring-ui
bun install
bun run validate
bun run build
```

Open `dist/index.html` directly in Chromium, Firefox or Edge. The finished HTML needs no server and no network. `bun run audit:mobile` runs the template's portrait and rotation layout audit using Playwright Chromium after a build.

## Controls

Use **Block**, then click the drawing to add a device. Select a block to edit its name and terminal header in the right panel. Use **Cable**, then click two terminals; clicking empty space creates an unconnected free cable end. Use **Select** to drag blocks, cable waypoints and loose anchors. Double-click a cable to add a bend; drag a cable leg to reposition that segment while keeping endpoints fixed. Use **Junction** and click a crossing to make two intersecting cables electrically connected. Right-hand properties provide style and terminal editing. Use **Pan** or Shift-drag to navigate and the mouse wheel to zoom. Delete/Backspace removes the selected object.

## Architecture

`src/model` is serialisable domain state, `src/geometry` routes and computes crossing geometry, `src/input` handles hit tests and pointer interaction, `src/render` owns canvas drawing and GPU grid, `src/symbols` owns reusable SVG path definitions, `src/ui` edits properties, `src/io` owns imports and exports, `src/storage` holds persistence, and `src/app` wires the services together. No application state is stored in external dependencies or remote services.

`bun run validate` is mandatory before building. TypeScript strictness, `noUncheckedIndexedAccess`, AST checks for explicit `any`, nested `if`, JS source files and Bun regression tests are enforced locally. `vendor/pages` is an exact, pinned submodule commit used for responsive layout audit, not a floating dependency.

## Limitations

The document schema is version 1, the PDF background importer loads the first page, and the editor does not perform electrical-rule checking or certify safe wiring. Validate connector pinouts and voltage before using drawings for physical work. Saved HTML includes application source and the drawing data; PDF template pages are rasterised into the document.