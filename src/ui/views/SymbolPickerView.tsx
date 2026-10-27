import type { SymbolKind } from '../../model/types';

/** Options remain plain browser <option> elements; the class owns change events. */
export function SymbolPickerView({kinds}:{kinds:readonly SymbolKind[]}) {
  return <>{kinds.map(kind=>
    <option key={kind} value={kind}>{kind}</option>)}</>;
}
