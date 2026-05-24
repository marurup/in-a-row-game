'use strict';
// Run with: node tests/test-logic.js

// ── Copy of board logic (keep in sync with game.js) ──────────
const ROWS = 6;
const COLS = 7;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function getLowestEmptyRow(board, col) {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) return row;
  }
  return -1;
}

function checkWin(board, lastRow, lastCol, player) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of directions) {
    const cells = [[lastRow, lastCol]];
    for (const sign of [-1, 1]) {
      let r = lastRow + dr * sign;
      let c = lastCol + dc * sign;
      while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
        cells.push([r, c]);
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (cells.length >= 4) return cells;
  }
  return null;
}

function isBoardFull(board) {
  return board[0].every(cell => cell !== null);
}

function getValidCols(board) {
  return Array.from({ length: COLS }, (_, i) => i).filter(c => board[0][c] === null);
}

const AI = {
  getMove(board, aiIdx) {
    const oppIdx = 1 - aiIdx;
    const valid = getValidCols(board);
    for (const col of valid) {
      const row = getLowestEmptyRow(board, col);
      board[row][col] = aiIdx;
      const wins = checkWin(board, row, col, aiIdx);
      board[row][col] = null;
      if (wins) return col;
    }
    for (const col of valid) {
      const row = getLowestEmptyRow(board, col);
      board[row][col] = oppIdx;
      const wins = checkWin(board, row, col, oppIdx);
      board[row][col] = null;
      if (wins) return col;
    }
    return [3, 2, 4, 1, 5, 0, 6].find(c => valid.includes(c)) ?? valid[0];
  }
};

// ── Tests ─────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('  ✓', name);
    passed++;
  } catch (e) {
    console.error('  ✗', name, '-', e.message);
    failed++;
  }
}

function assert(cond, msg = 'Assertion failed') {
  if (!cond) throw new Error(msg);
}

// checkWin
test('horizontal win detected', () => {
  const b = createBoard();
  for (let c = 0; c < 4; c++) b[5][c] = 0;
  assert(checkWin(b, 5, 3, 0) !== null);
});

test('vertical win detected', () => {
  const b = createBoard();
  for (let r = 2; r <= 5; r++) b[r][0] = 1;
  assert(checkWin(b, 5, 0, 1) !== null);
});

test('diagonal \\ win detected', () => {
  const b = createBoard();
  for (let i = 0; i < 4; i++) b[2 + i][i] = 0;
  assert(checkWin(b, 5, 3, 0) !== null);
});

test('diagonal / win detected', () => {
  const b = createBoard();
  for (let i = 0; i < 4; i++) b[5 - i][i] = 1;
  assert(checkWin(b, 5, 0, 1) !== null);
});

test('no win on 3 in a row', () => {
  const b = createBoard();
  for (let c = 0; c < 3; c++) b[5][c] = 0;
  assert(checkWin(b, 5, 2, 0) === null);
});

// isBoardFull
test('empty board not full', () => {
  assert(!isBoardFull(createBoard()));
});

test('full board detected', () => {
  const b = createBoard();
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      b[r][c] = (r + c) % 2;
  assert(isBoardFull(b));
});

// getLowestEmptyRow
test('lowest row is bottom of empty column', () => {
  const b = createBoard();
  assert(getLowestEmptyRow(b, 3) === ROWS - 1);
});

test('lowest row respects filled cells', () => {
  const b = createBoard();
  b[5][0] = 0; b[4][0] = 1;
  assert(getLowestEmptyRow(b, 0) === 3);
});

test('full column returns -1', () => {
  const b = createBoard();
  for (let r = 0; r < ROWS; r++) b[r][0] = 0;
  assert(getLowestEmptyRow(b, 0) === -1);
});

// AI
test('AI takes winning move', () => {
  const b = createBoard();
  for (let c = 0; c < 3; c++) b[5][c] = 1; // AI (idx 1) has 3 in a row
  const col = AI.getMove(b, 1);
  assert(col === 3, 'Expected col 3, got ' + col);
});

test('AI blocks opponent win', () => {
  const b = createBoard();
  for (let c = 0; c < 3; c++) b[5][c] = 0; // Opponent (idx 0) has 3 in a row
  const col = AI.getMove(b, 1);
  assert(col === 3, 'Expected col 3 (block), got ' + col);
});

test('AI prefers center on empty board', () => {
  const b = createBoard();
  const col = AI.getMove(b, 1);
  assert(col === 3, 'Expected center col 3, got ' + col);
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
