import type { Project } from './types';

/** Bounded, immutable project snapshot history for deterministic undo and redo. */
export class HistoryManager {
  private undoStack: Project[] = [];
  private redoStack: Project[] = [];

  public constructor(initial: Project, private readonly limit = 100) {
    this.reset(initial);
  }

  public reset(project: Project): void {
    this.undoStack = [structuredClone(project)];
    this.redoStack = [];
  }

  public record(project: Project): void {
    const snapshot = structuredClone(project);
    const previous = this.undoStack.at(-1);
    if (previous && JSON.stringify(previous) === JSON.stringify(snapshot)) return;
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
  }

  public get canUndo(): boolean { return this.undoStack.length > 1; }
  public get canRedo(): boolean { return this.redoStack.length > 0; }

  public undo(): Project | null {
    if (!this.canUndo) return null;
    const removed = this.undoStack.pop();
    if (!removed) return null;
    this.redoStack.push(removed);
    const state = this.undoStack.at(-1);
    return state ? structuredClone(state) : null;
  }

  public redo(): Project | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(next);
    return structuredClone(next);
  }
}
