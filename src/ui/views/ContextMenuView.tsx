export interface ContextMenuEntry {
  readonly action: string;
  readonly label: string;
}

/** Pure view for a context menu. The controller still owns focus and commands. */
export function ContextMenuView({entries}:{entries:readonly ContextMenuEntry[]}) {
  return <>{entries.map(entry=>
    <button key={entry.action} type="button" role="menuitem"
      data-action={entry.action}>
      {entry.label}
    </button>)}</>;
}
