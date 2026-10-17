// Unit tests for public/history.js (the studio's undo/redo stack), loaded as a classic script via node:vm.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const src = readFileSync(fileURLToPath(new URL('../public/history.js', import.meta.url)), 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'history.js' });
const { EditHistory } = sandbox;

let fails = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error(`✗ FAIL: ${msg}`);
    fails++;
  } else {
    console.log(`✓ PASS: ${msg}`);
  }
}

assert(typeof EditHistory === 'function', 'history.js defines globalThis.EditHistory');

// 1. Basic undo/redo
{
  const h = new EditHistory();
  assert(!h.canUndo && !h.canRedo, 'New history has nothing to undo or redo');
  assert(h.undo('A') === null && h.redo('A') === null, 'Undo/redo on empty history return null');
  h.record('A'); // state A, edited to B
  h.record('B'); // state B, edited to C
  assert(h.canUndo && !h.canRedo, 'After two edits: can undo, cannot redo');
  assert(h.undo('C') === 'B', 'Undo returns the state before the last edit');
  assert(h.undo('B') === 'A', 'Second undo returns the original state');
  assert(!h.canUndo && h.canRedo, 'At the start of history: cannot undo, can redo');
  assert(h.redo('A') === 'B', 'Redo returns the next state');
  assert(h.redo('B') === 'C', 'Second redo returns the latest state');
  assert(!h.canRedo, 'Redo stack exhausted');
}

// 2. A new edit drops the redo branch
{
  const h = new EditHistory();
  h.record('A');
  h.undo('B');
  assert(h.canRedo, 'Redo available after undo');
  h.record('A');
  assert(!h.canRedo, 'New edit clears redo stack');
}

// 3. Size limit keeps the newest steps
{
  const h = new EditHistory({ limit: 50 });
  for (let i = 0; i < 60; i++) h.record(`S${i}`);
  assert(h.undoStack.length === 50, `Undo stack capped at 50 (got ${h.undoStack.length})`);
  let last = null;
  let count = 0;
  for (let s; (s = h.undo(`cur${count}`)) !== null;) { last = s; count++; }
  assert(count === 50 && last === 'S10', `Oldest steps dropped first (oldest kept: ${last})`);
}

// 4. Coalescing by key within the merge window
{
  let t = 0;
  const h = new EditHistory({ mergeWindowMs: 1000, now: () => t });
  assert(h.record('A', 'nudge:boy') === true, 'First keyed edit adds a step');
  t = 300;
  assert(h.record('A1', 'nudge:boy') === false, 'Same key within window merges');
  t = 900;
  assert(h.record('A2', 'nudge:boy') === false, 'Window is measured from the previous edit');
  assert(h.undoStack.length === 1, 'Merged nudges form one step');
  assert(h.undo('A3') === 'A', 'Undoing a merged step restores the state before the first nudge');

  h.clear();
  t = 0;
  h.record('A', 'nudge:boy');
  t = 2500;
  assert(h.record('B', 'nudge:boy') === true, 'Same key after the window adds a new step');
  t = 2600;
  assert(h.record('C', 'nudge:sun') === true, 'Different key adds a new step');
  t = 2700;
  assert(h.record('D') === true, 'Unkeyed edit always adds a step');
  t = 2800;
  assert(h.record('E') === true, 'Consecutive unkeyed edits never merge');
  assert(h.undoStack.length === 5, `Five separate steps (got ${h.undoStack.length})`);

  h.clear();
  t = 0;
  h.record('A', 'k');
  h.undo('B');
  h.redo('A');
  t = 100;
  assert(h.record('B', 'k') === true, 'Undo/redo breaks coalescing');
}

// 5. clear()
{
  const h = new EditHistory();
  h.record('A');
  h.record('B');
  h.undo('C');
  h.clear();
  assert(!h.canUndo && !h.canRedo, 'clear() empties both stacks');
}

if (fails > 0) {
  console.error(`\n${fails} history test(s) failed.`);
  process.exit(1);
}
console.log('\nAll history tests passed.');
