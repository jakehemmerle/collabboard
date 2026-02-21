import type { BoardObject } from '../contracts.ts';

const MAX_STACK_DEPTH = 50;

class UndoManager {
  private undoStack: BoardObject[][] = [];
  private redoStack: BoardObject[][] = [];

  pushState(objects: BoardObject[]): void {
    this.undoStack.push(structuredClone(objects));
    if (this.undoStack.length > MAX_STACK_DEPTH) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo(currentObjects: BoardObject[]): BoardObject[] | null {
    if (this.undoStack.length === 0) return null;
    this.redoStack.push(structuredClone(currentObjects));
    return this.undoStack.pop()!;
  }

  redo(currentObjects: BoardObject[]): BoardObject[] | null {
    if (this.redoStack.length === 0) return null;
    this.undoStack.push(structuredClone(currentObjects));
    return this.redoStack.pop()!;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}

export const undoManager = new UndoManager();
