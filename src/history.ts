import { clone, type Board } from "./model";
export class History {
  past: Board[] = [];
  future: Board[] = [];
  push(b: Board) {
    this.past.push(clone(b));
    if (this.past.length > 100) this.past.shift();
    this.future = [];
  }
  undo(b: Board) {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(clone(b));
    return prev;
  }
  redo(b: Board) {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(clone(b));
    return next;
  }
}
