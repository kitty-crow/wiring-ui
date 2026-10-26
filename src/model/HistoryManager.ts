import type { Project, Selection } from './types';

/** Bounded, immutable project snapshot history for deterministic undo and redo. */
export class HistoryManager {
  private undoStack: Project[] = [];
  private redoStack: Project[] = [];
  private undoSelections: Selection[] = [];
  private redoSelections: Selection[] = [];

  public constructor(initial: Project, private readonly limit = 100) {
    this.reset(initial);
  }

  public reset(project: Project, selection: Selection = null): void {
    this.undoStack = [structuredClone(project)];
    this.redoStack = [];
    this.undoSelections = [selection ? structuredClone(selection) : null];
    this.redoSelections = [];
  }

  public record(project: Project, selection: Selection = null): void {
    const snapshot = structuredClone(project);
    const previous = this.undoStack.at(-1);
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;
    this.undoStack.push(snapshot);
    this.undoSelections.push(selection ? structuredClone(selection) : null);
    if (this.undoStack.length > this.limit) { this.undoStack.shift(); this.undoSelections.shift(); }
    this.redoStack = [];
    this.redoSelections = [];
  }

  public get selection(): Selection { return this.undoSelections.at(-1) ?? null; }
  public get canUndo(): boolean { return this.undoStack.length > 1; }
  public get canRedo(): boolean { return this.redoStack.length > 0; }

  public undo(): Project | null {
    if (!this.canUndo) return null;
    const removed = this.undoStack.pop();
    if (!removed) return null;
    this.redoStack.push(removed);
    this.redoSelections.push(this.undoSelections.pop() ?? null);
    const state = this.undoStack.at(-1);
    return state ? structuredClone(state) : null;
  }

  public redo(): Project | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(next);
    this.undoSelections.push(this.redoSelections.pop() ?? null);
    return structuredClone(next);
  }
}
