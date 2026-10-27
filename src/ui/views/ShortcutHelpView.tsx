/** Static keyboard reference; the ShortcutHelp controller owns opening/closing it. */
export function ShortcutHelpView() {
  const shortcuts: readonly (readonly [string,string])[]=[
    ['Undo / Redo','Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z (also Ctrl+Y)'],
    ['Copy / Cut / Paste','Ctrl/Cmd+C / X / V'],
    ['Duplicate / Select all','Ctrl/Cmd+D / A'],
    ['Delete / Deselect','Delete or Backspace / Esc'],
    ['Save project / Save HTML','Ctrl/Cmd+S / Ctrl/Cmd+Shift+S'],
    ['Open / New / Print','Ctrl/Cmd+O / N / P'],
    ['Nudge selected item','Arrow keys (10 units), Shift+Arrow (20), Alt+Arrow (1)'],
    ['Drawing tools','V Select, H Pan, W Cable, B Block, J Junction, T Text, S Symbol'],
    ['Rotate / Mirror','Ctrl/Cmd+R clockwise 90°, Ctrl/Cmd+Shift+R counter-clockwise 90°; Ctrl/Cmd+E left-right, Ctrl/Cmd+Shift+E up-down (hovered component or selected group)'],
    ['Marquee selection','Select tool: drag from empty canvas to select multiple components; Shift-click extends selection'],
    ['Shapes / Grid / Fit','R Rectangle, E Ellipse, L Line, P Polygon, Q Polyline, G Grid, F Fit'],
    ['Context menu','Right-click a cable, bend, terminal or block; Shift+F10'],
    ['Shortcut macro','Ctrl/Cmd+Alt+R record/stop, Ctrl/Cmd+Alt+P replay'],
    ['Help','?']
  ];
  return <>
    <h2>Keyboard shortcuts</h2>
    <p>Use Ctrl on Windows/Linux or Cmd on macOS. Shortcuts do not interfere with text fields.</p>
    <dl>{shortcuts.map(([name,value])=>
      <div key={name} className="shortcut-pair" style={{display:'contents'}}>
        <dt>{name}</dt><dd>{value}</dd>
      </div>)}</dl>
    <button type="button" className="wide" data-dismiss>Close</button>
  </>;
}
