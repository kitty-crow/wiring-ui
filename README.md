# Wiring UI

An offline-first, canvas-based electronic wiring diagram editor. Draw component terminal headers, route and edit orthogonal cables, annotate drawings, place electrical symbols, and export a completely self-contained HTML document.

## Features

- Unlimited named and numbered terminals per block; create, edit, reorder by replacing numbers, or remove terminals without deleting the connected cables.
- Automatic orthogonal cable routing anchored to terminals, free ends or reusable junctions. Move a block and its cables follow. Edit bends, drag legs and reconnect cable ends.
- Non-connected cable crossings are shown with curved jump bridges. True electrical connections use persistent junction nodes.
- Wire colours, widths, patterns and labels; rectangles, ellipses, lines, editable polylines and polygons.\n- Rotate and mirror components around their centres; wiring terminals and obstacle hit tests follow the transformed geometry.\n- Rectangular marquee and Shift-click selection for editing several devices at once, including group clipboard, rotation, mirrors and deletion.\n- Circuit symbols carry separate reference **Label** and physical **Value** text; an electronics character palette inserts Ω, µ, °, Δ, ± and more into the active text field.
- Passive two-ended symbols (resistor, capacitor, inductor, diode, LED, fuse and switch) expose two persistent, cable-compatible terminal anchors. Ground, supply and test-point symbols expose their appropriate single terminal.
- Placing or dragging an unconnected two-ended symbol onto a sufficiently long cable leg inserts it inline: the original wire becomes the input lead and a new styled output lead attaches to the other terminal. The existing cable route and endpoint IDs remain intact outside the insertion. Short segments remain unspliced rather than manufacturing invalid links.
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

Use **Block**, then click the drawing to add a device. Select a block to edit its name and terminal header in the right panel. Use **Cable**, then click two terminals; clicking empty space creates an unconnected free cable end. Use **Select** to drag blocks, cable waypoints and loose anchors. Double-click a cable to add a bend; drag a cable leg to reposition that segment while keeping endpoints fixed. Use **Junction** and click a crossing to make two intersecting cables electrically connected. Right-hand properties provide style and terminal editing. Use **Pan** or middle-button drag to navigate and the mouse wheel to zoom. Delete/Backspace removes the selected object. With **Select** active, drag on an empty area to make a rectangular component selection; Shift-click extends or reduces the group.

## Keyboard and electronic symbols

- **Ctrl/Cmd+R** rotates hovered or selected component(s) clockwise by 90°. **Ctrl/Cmd+Shift+R** rotates counter-clockwise.
- **Ctrl/Cmd+E** mirrors the target left-right. **Ctrl/Cmd+Shift+E** mirrors it top-bottom. Plain **R** and **E** always activate Rectangle and Ellipse.
- **Ctrl/Cmd+Z** undo; **Ctrl/Cmd+Shift+Z** redo. **Ctrl/Cmd+C/X/V** copy/cut/paste, **Delete** removes the selected group, and arrow keys nudge selected objects.
- The **Select** tool supports dragging an empty-space rubber-band marquee and Shift-click membership changes. Group transforms use a shared centre; terminal IDs stay attached.
- Use **Symbol** and choose Resistor, Capacitor, Inductor or another glyph. The right inspector exposes separate **Label** (e.g. `R1`) and **Value** (e.g. `3R3`) fields. They render above and below the symbol.
- The compact **Characters** rail on the left inserts common electronics and engineering symbols directly at the caret in a focused text field. A field must be active before selecting a character.
- The standalone HTML and JSON exports retain component orientation, grouped wiring geometry and all symbol values. Older version-1 documents still load. Symbols' electrical terminal IDs and cable connections also survive export; old symbol-only projects receive stable new terminals on import.

## Architecture

`src/model` is serialisable domain state, `src/geometry` routes and computes crossing geometry, `src/input` handles hit tests and pointer interaction, `src/render` owns canvas drawing and GPU grid, `src/symbols` owns reusable SVG path definitions, `src/ui` edits properties, `src/io` owns imports and exports, `src/storage` holds persistence, and `src/app` wires the services together. No application state is stored in external dependencies or remote services.

`bun run validate` is mandatory before building. TypeScript strictness, `noUncheckedIndexedAccess`, AST checks for explicit `any`, nested `if`, JS source files and Bun regression tests are enforced locally. `vendor/pages` is an exact, pinned submodule commit used for responsive layout audit, not a floating dependency.

## Limitations

The document schema is version 1, the PDF background importer loads the first page, and the editor does not perform electrical-rule checking or certify safe wiring. Validate connector pinouts and voltage before using drawings for physical work. Saved HTML includes application source and the drawing data; PDF template pages are rasterised into the document.