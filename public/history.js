// Snapshot-based undo/redo history for the studio canvas.
// Classic script (no modules): defines globalThis.EditHistory for the inline studio code and for Node tests.
//
// Each entry is the canvas markup as it was *before* an edit. Callers record a snapshot before mutating,
// and pass the current markup to undo()/redo() so it can be moved onto the opposite stack.
(function () {
  class EditHistory {
    constructor({ limit = 50, mergeWindowMs = 1000, now = () => Date.now() } = {}) {
      this.limit = limit;
      this.mergeWindowMs = mergeWindowMs;
      this.now = now;
      this.clear();
    }

    get canUndo() { return this.undoStack.length > 0; }
    get canRedo() { return this.redoStack.length > 0; }

    // Record the state before an edit. An edit with the same non-null `key` as the previous one,
    // within mergeWindowMs of it, is merged into that step (the earlier "before" state is kept).
    // Returns true when a new step was added.
    record(snapshot, key = null) {
      const t = this.now();
      const merge = key != null && key === this.lastKey && t - this.lastTime <= this.mergeWindowMs && this.undoStack.length > 0;
      this.lastKey = key;
      this.lastTime = t;
      this.redoStack.length = 0;
      if (merge) return false;
      this.undoStack.push(snapshot);
      if (this.undoStack.length > this.limit) this.undoStack.splice(0, this.undoStack.length - this.limit);
      return true;
    }

    // Returns the snapshot to restore, or null when there is nothing to undo.
    undo(current) {
      if (!this.canUndo) return null;
      this.breakMerge();
      this.redoStack.push(current);
      return this.undoStack.pop();
    }

    redo(current) {
      if (!this.canRedo) return null;
      this.breakMerge();
      this.undoStack.push(current);
      return this.redoStack.pop();
    }

    // Stop the next record() from merging into the current step.
    breakMerge() {
      this.lastKey = null;
      this.lastTime = -Infinity;
    }

    clear() {
      this.undoStack = [];
      this.redoStack = [];
      this.breakMerge();
    }
  }

  globalThis.EditHistory = EditHistory;
})();
