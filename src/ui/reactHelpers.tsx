import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Matches tracker-viewer's TSX rendering pattern. React is used for escaped,
 * declarative HTML generation only; application classes own state and events.
 */
export function render2Mkup(node: ReactNode): string {
  return renderToStaticMarkup(node);
}

/** Parse rendered markup into native DOM nodes without a React root. */
export function render2Frag(node: ReactNode): DocumentFragment {
  const template = document.createElement('template');
  template.innerHTML = render2Mkup(node);
  return template.content.cloneNode(true) as DocumentFragment;
}

/** Never install React event handlers: classes continue delegating DOM events. */
export function replaceChildrenWithReact(target: Element, node: ReactNode): void {
  target.replaceChildren(render2Frag(node));
}
