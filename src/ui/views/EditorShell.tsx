import { ToolbarIcon } from './ToolbarIcons';
/**
 * Build-time TSX page shell. No React hydration or runtime root is installed.
 * IDs and data-* hooks match EditorApp; its existing imperative event delegation
 * continues to work on ordinary DOM nodes emitted by this component.
 */
export function EditorShell({version = 'dev'}:{version?:string} = {}) {
  return <>
    <div id="app">
      <header className="topbar">
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
        <span className="spacer" />
        <span className="brand">Wiring UI</span>
        <span id="document-name" className="document-title">Untitled</span>
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
      </nav>      <main className="main" id="editor-main">
        <aside id="character-palette" aria-label="Electronic text characters" />
        <section id="workspace" aria-label="Schematic canvas">
          <canvas id="grid-canvas" aria-hidden="true" />
          <canvas id="editor-canvas" tabIndex={0} aria-label="Interactive schematic drawing surface" />
          <button id="hover-add-pin" className="hover-add" hidden>+ Terminal</button>
        </section>
        <button id="inspector-edge" className="inspector-edge" type="button"
          title="Show properties" aria-label="Show properties" aria-controls="inspector-panel"
          aria-expanded="false">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            strokeLinejoin="round" aria-hidden="true">
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
        <aside id="inspector-panel" aria-label="Properties panel">
          <div className="inspector-heading">
            <span>Properties</span>
            <button id="inspector-pin" type="button" aria-label="Pin properties panel"
              title="Pin properties panel open" aria-pressed="false">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
                stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M8 3h8m-7 0v5l-3 5v3h12v-3l-3-5V3"/>
                <path d="M12 16v6"/>
              </svg>
            </button>
          </div>
          <div id="inspector" aria-label="Properties" />
        </aside>
      </main>
      <footer className="status">
        <span id="status" className="status-message" role="status">Ready</span>
        <span className="status-spacer" />
        <span className="status-meta">
          <span data-version="" title="Wiring UI version">v{version}</span>
          <span className="footer-links">
            <a className="pages-kofi-link" href="https://ko-fi.com/kittycrow"
              target="_blank" rel="noopener noreferrer"
              title="Support Kitty Crow on Ko-fi">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h14v7a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6Z" />
                <path d="M18 9h2a2 2 0 0 1 0 4h-2" />
                <path d="M3 3h16" />
                <path d="M9.4 11.3c.6-1.2 1.8-1 2.4 0 .6-1 1.8-1.2 2.4 0 0 1.2-2.4 2.8-2.4 2.8s-2.4-1.6-2.4-2.8Z" />
              </svg>
              Buy me a coffee
            </a>
          </span>
        </span>
      </footer>
    </div>
    <input id="file-input" type="file" accept=".json,.html,.wiring.json,application/json,text/html" />
    <input id="template-input" type="file"
      accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" />
  </>;
}
