import { ToolbarIcon } from './ToolbarIcons';
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
        {([
          ['new','New','New drawing (Ctrl/Cmd+N)'],
          ['undo','Undo','Undo (Ctrl/Cmd+Z)'],
          ['redo','Redo','Redo (Ctrl/Cmd+Shift+Z)'],
          ['open','Open','Open project (Ctrl/Cmd+O)'],
          ['json','Save project','Save project (Ctrl/Cmd+S)'],
          ['html','Download HTML','Download standalone HTML (Ctrl/Cmd+Shift+S)'],
          ['png','Export PNG','Export PNG image'],
          ['print','Print','Print drawing (Ctrl/Cmd+P)']
        ] as const).map(([command,label,tooltip])=>
          <button key={command} type="button" data-command={command}
            className="topbar-action" title={tooltip} aria-label={label}>
            <ToolbarIcon name={command} />
          </button>)}
      </header>
      <nav className="toolbar" aria-label="Drawing tools">
        {([
          ['select','Select','Select and marquee-select (V)'],
          ['pan','Pan','Pan canvas (H)'],
          ['wire','Cable','Draw a cable (W)'],
          ['junction','Junction','Create a junction (J)'],
          ['component','Block','Place a component (B)'],
          ['text','Text','Place text (T)'],
          ['rectangle','Rectangle','Draw a rectangle (R)'],
          ['ellipse','Ellipse','Draw an ellipse (E)'],
          ['line','Line','Draw a line (L)'],
          ['polyline','Polyline','Click vertices; double-click to finish (Q)'],
          ['polygon','Polygon','Click vertices; double-click to close (P)'],
          ['symbol','Symbol','Place a circuit symbol (S)']
        ] as const).map(([tool,label,tooltip])=>
          <button key={tool} type="button" data-tool={tool}
            className={'toolbar-action'+(tool==='select'?' active':'')}
            title={tooltip} aria-label={label}>
            <ToolbarIcon name={tool} />
          </button>)}
        <select id="symbol-picker" title="Choose schematic symbol"
          aria-label="Choose schematic symbol" />
        {([
          ['pdf','Import template','Import a PDF or image template'],
          ['remove-template','Remove template','Remove the background template'],
          ['fit','Fit','Fit the schematic to the canvas (F)'],
          ['shortcuts','Shortcuts','View keyboard shortcuts (?)']
        ] as const).map(([command,label,tooltip])=>
          <button key={command} type="button" data-command={command}
            className="toolbar-action" title={tooltip} aria-label={label}>
            <ToolbarIcon name={command} />
          </button>)}
        <span className="spacer" />
        <label>Theme <select id="theme">
          <option value="light">Light</option><option value="dark">Dark</option>
        </select></label>
        <label><input type="checkbox" id="snap" defaultChecked />Snap</label>
        <label><input type="checkbox" id="grid" defaultChecked />Grid</label>
      </nav>      <main className="main">
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
