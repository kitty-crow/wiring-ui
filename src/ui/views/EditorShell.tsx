/**
 * Build-time TSX page shell. No React hydration or runtime root is installed.
 * IDs and data-* hooks match EditorApp; its existing imperative event delegation
 * continues to work on ordinary DOM nodes emitted by this component.
 */
export function EditorShell() {
  return <>
    <div id="app">
      <header className="topbar">
        <span className="brand">Wiring UI</span>
        <span id="document-name" className="document-title">Untitled</span>
        <span className="spacer" />
        <button data-command="new" title="Load the sample schematic as a new document">New</button>
        <button data-command="undo" title="Undo (Ctrl/Cmd+Z)">Undo</button>
        <button data-command="redo" title="Redo (Ctrl/Cmd+Shift+Z)">Redo</button>
        <button data-command="open">Open</button>
        <button data-command="json">Save project</button>
        <button data-command="html" title="Export this editor and document as one standalone HTML file">Download HTML</button>
        <button data-command="png">PNG</button>
        <button data-command="print">Print</button>
      </header>
      <nav className="toolbar" aria-label="Drawing tools">
        {([
          ['select','Select'],['pan','Pan'],['wire','Cable'],['junction','Junction'],
          ['component','Block'],['text','Text'],['rectangle','Rectangle'],
          ['ellipse','Ellipse'],['line','Line'],['polyline','Polyline'],['polygon','Polygon'],
          ['symbol','Symbol']
        ] as const).map(([tool,label])=>
          <button key={tool} data-tool={tool} className={tool==='select'?'active':undefined}
            title={tool==='polyline'||tool==='polygon'?'Click vertices, double-click to finish':undefined}>
            {label}
          </button>)}
        <select id="symbol-picker" aria-label="Choose schematic symbol" />
        <button data-command="pdf">Import template</button>
        <button data-command="remove-template">Remove template</button>
        <button data-command="fit">Fit</button>
        <button data-command="shortcuts" title="Keyboard shortcuts (?)">Shortcuts</button>
        <span className="spacer" />
        <label>Theme <select id="theme">
          <option value="light">Light</option><option value="dark">Dark</option>
        </select></label>
        <label><input type="checkbox" id="snap" defaultChecked />Snap</label>
        <label><input type="checkbox" id="grid" defaultChecked />Grid</label>
      </nav>
      <main className="main">
        <aside id="character-palette" aria-label="Electronic text characters" />
        <section id="workspace" aria-label="Schematic canvas">
          <canvas id="grid-canvas" aria-hidden="true" />
          <canvas id="editor-canvas" tabIndex={0} aria-label="Interactive schematic drawing surface" />
          <button id="hover-add-pin" className="hover-add" hidden>+ Terminal</button>
        </section>
        <aside id="inspector" aria-label="Properties" />
      </main>
      <footer id="status" className="status" role="status">Ready</footer>
    </div>
    <input id="file-input" type="file" accept=".json,.html,.wiring.json,application/json,text/html" />
    <input id="template-input" type="file"
      accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" />
  </>;
}
