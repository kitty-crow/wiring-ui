# TSX markup architecture

Wiring UI now follows the same **static TSX view + imperative controller** pattern as
`kitty-crow/tracker-viewer` (`src/ui/reactHelpers.tsx`).

## React's role

`react` and `react-dom/server` are used **only** to transform TSX into escaped
static HTML via `renderToStaticMarkup`. This is not a React-managed application:
there is no `createRoot`, hydration, hooks, virtual-DOM state, or React event handler.
Editor state, keyboard commands, canvas drawing, routing, persistence and delegated
DOM listeners remain in the existing modular TypeScript classes.

The helper exports:

- `render2Mkup(node)` — static markup, including build-time shell output
- `render2Frag(node)` — template-parsed native DOM fragment
- `replaceChildrenWithReact(target,node)` — replace a controller's native nodes

## Structure and build

- `src/ui/views/EditorShell.tsx` defines the stable page shell and its `id`/`data-*` hooks.
- `src/ui/views/InspectorViews.tsx` contains typed property views for document, components,
  terminals, wires, text, symbols, nodes and shapes.
- `src/ui/views/ShortcutHelpView.tsx`, `CharacterPaletteView.tsx`,
  `ContextMenuView.tsx`, and `SymbolPickerView.tsx` define the other HTML views.
- `src/ui/Inspector.ts`, `ShortcutHelp.ts`, `CharacterPalette.ts`,
  `ContextMenuController.ts`, and `src/app/EditorApp.ts` bind native events
  after rendering, as before.
- `scripts/build.mts` statically renders the shell using `EditorShell`,
  injects it into the minimal `index.template.html` envelope, then inlines CSS,
  bundled browser JavaScript and the PDF worker into `dist/index.html`.

To add a new property control, add a typed field in the relevant TSX view and
keep the `data-key`/`data-action` hook handled by the inspector controller.
Values are escaped by React instead of manually interpolated into HTML strings.
Use `defaultValue` for static inputs because React does not own their editing state.

**Do not** embed JSON or untrusted markup through `dangerouslySetInnerHTML`.

## Validation

`bun run validate` still enforces strict TypeScript, the no-nested-`if` architecture
rule, no explicit `any`, and regressions. `test/ui-tsx.test.mts` verifies escaping,
the shell's stable selectors and delegated interaction attributes.
The production Chromium smoke tests verify editing, wiring, symbol placement,
colour changes, undo/redo and static-TSX interface behaviour.

GitHub Actions builds the single-file Pages output and blocks deployment on failures.
