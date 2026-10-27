import type { ReactNode } from 'react';

/**
 * Lightweight inline SVGs in the static TSX shell. No icon package, font,
 * network request, runtime React root, or dynamic HTML string is required.
 */
export type ToolbarIconName =
  | 'select' | 'pan' | 'wire' | 'junction' | 'component' | 'text'
  | 'rectangle' | 'ellipse' | 'line' | 'polyline' | 'polygon' | 'symbol'
  | 'pdf' | 'remove-template' | 'fit' | 'shortcuts'
  | 'new' | 'undo' | 'redo' | 'open' | 'json' | 'html' | 'png' | 'print';

const shapes: Record<ToolbarIconName, ReactNode> = {
  select: <path d="m5 3 13 9-6.4 1.2L9 20 5 3Z M12 13l4 7"/>,
  pan: <><path d="M8 12V6a1.5 1.5 0 0 1 3 0v5-7a1.5 1.5 0 0 1 3 0v7-5a1.5 1.5 0 0 1 3 0v5-2a1.5 1.5 0 0 1 3 0v6c0 4-3 6-7 6h-1c-2 0-3-1-4-3l-3-5a1.7 1.7 0 0 1 3-2l2 2"/></>,
  wire: <><path d="M3 17h5V7h8v10h5"/><circle cx="3" cy="17" r="1.5"/><circle cx="21" cy="17" r="1.5"/></>,
  junction: <><path d="M12 3v18M3 12h18"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></>,
  component: <><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M2 8h3m-3 5h3m-3 5h3m14-10h3m-3 5h3m-3 5h3"/></>,
  text: <path d="M4 6V4h16v2M12 4v16m-4 0h8"/>,
  rectangle: <rect x="4" y="6" width="16" height="12" rx="1"/>,
  ellipse: <ellipse cx="12" cy="12" rx="9" ry="6.5"/>,
  line: <><path d="M4 19 20 5"/><circle cx="4" cy="19" r="1.5"/><circle cx="20" cy="5" r="1.5"/></>,
  polyline: <><polyline points="3,18 8,7 14,15 21,5"/><circle cx="3" cy="18" r="1.3"/><circle cx="8" cy="7" r="1.3"/><circle cx="14" cy="15" r="1.3"/><circle cx="21" cy="5" r="1.3"/></>,
  polygon: <><polygon points="12,3 21,10 17,20 5,20 3,9"/><circle cx="12" cy="3" r="1.3"/><circle cx="21" cy="10" r="1.3"/><circle cx="17" cy="20" r="1.3"/><circle cx="5" cy="20" r="1.3"/><circle cx="3" cy="9" r="1.3"/></>,
  symbol: <><path d="M2 12h4m12 0h4M6 6v12h12V6H6Z"/><path d="M8.5 14.5 11 9l2 6 2.5-5.5"/></>,
  pdf: <><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M5 17v3h14v-3"/><path d="M5 7h3m-3 4h2"/></>,
  'remove-template': <><path d="M6 3h9l4 4v13H6Z M15 3v5h4"/><path d="m9 12 7 7m0-7-7 7"/></>,
  fit: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M3 8l5-5m8 0 5 5M3 16l5 5m8 0 5-5"/>,
  shortcuts: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h1m3 0h1m3 0h1m3 0h1M6 13h1m3 0h1m3 0h1m3 0h1M8 16h8"/></>,
  new: <><path d="M5 3h10l4 4v14H5zM15 3v5h4"/><path d="M12 11v7m-3.5-3.5h7"/></>,
  undo: <><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/></>,
  redo: <><path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h2"/></>,
  open: <><path d="M3 8V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v2"/><path d="M3 11h18l-3 10H6z"/></>,
  json: <><path d="M5 3h10l4 4v14H5zM15 3v5h4"/><path d="m10 12-2 2 2 2m4-4 2 2-2 2"/></>,
  html: <><path d="M5 3h10l4 4v14H5zM15 3v5h4"/><path d="m10 12-2 2 2 2m4-4 2 2-2 2"/></>,
  png: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m4 18 5.5-5.5 3.5 3.5 2.5-2.5L20 18"/></>,
  print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6zM18 12h.01"/></>
};

export function ToolbarIcon({name}:{name:ToolbarIconName}) {
  return <svg className="toolbar-icon" xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" width="20" height="20"
    fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {shapes[name]}
  </svg>;
}
