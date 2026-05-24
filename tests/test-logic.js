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
  getMove(board, aiIdx, difficulty) {
    switch (difficulty) {
      case 'easy':   return this._random(board);
      case 'hard':   return this._minimaxBest(board, aiIdx, 5);
      case 'expert': return this._minimaxBest(board, aiIdx, 7);
      default:       return this._medium(board, aiIdx);
    }
  },
  _random(board) {
    const valid = getValidCols(board);
    return valid[Math.floor(Math.random() * valid.length)];
  },
  _medium(board, aiIdx) {
    const oppIdx = 1 - aiIdx;
    const valid = getValidCols(board);
    for (const col of valid) {
      const row = getLowestEmptyRow(board, col);
      board[row][col] = aiIdx;
      if (checkWin(board, row, col, aiIdx)) { board[row][col] = null; return col; }
      board[row][col] = null;
    }
    for (const col of valid) {
      const row = getLowestEmptyRow(board, col);
      board[row][col] = oppIdx;
      if (checkWin(board, row, col, oppIdx)) { board[row][col] = null; return col; }
      board[row][col] = null;
    }
    return [3, 2, 4, 1, 5, 0, 6].find(c => valid.includes(c)) ?? valid[0];
  },
  _minimaxBest(board, aiIdx, depth) {
    const valid = getValidCols(board);
    const ordered = [3, 2, 4, 1, 5, 0, 6].filter(c => valid.includes(c));
    let bestScore = -Infinity, bestCol = ordered[0];
    for (const col of ordered) {
      const row = getLowestEmptyRow(board, col);
      board[row][col] = aiIdx;
      const won = !!checkWin(board, row, col, aiIdx);
      const s = won ? 100000 + depth : minimaxScore(board, depth - 1, -Infinity, Infinity, false, aiIdx);
      board[row][col] = null;
      if (s > bestScore) { bestScore = s; bestCol = col; }
    }
    return bestCol;
  }
};

function minimaxScore(board, depth, alpha, beta, maximizing, aiIdx) {
  const valid = getValidCols(board);
  if (depth === 0 || valid.length === 0) return valid.length === 0 ? 0 : scoreBoard(board, aiIdx);
  const me = maximizing ? aiIdx : 1 - aiIdx;
  const ordered = [3, 2, 4, 1, 5, 0, 6].filter(c => valid.includes(c));
  let best = maximizing ? -Infinity : Infinity;
  for (const col of ordered) {
    const row = getLowestEmptyRow(board, col);
    board[row][col] = me;
    const won = !!checkWin(board, row, col, me);
    const s = won
      ? (maximizing ? 100000 + depth : -(100000 + depth))
      : minimaxScore(board, depth - 1, alpha, beta, !maximizing, aiIdx);
    board[row][col] = null;
    if (maximizing) { best = Math.max(best, s); alpha = Math.max(alpha, s); }
    else            { best = Math.min(best, s); beta  = Math.min(beta,  s); }
    if (beta <= alpha) break;
  }
  return best;
}

function scoreBoard(board, aiIdx) {
  const oppIdx = 1 - aiIdx;
  let score = 0;
  function sw(w) {
    const ai = w.filter(c => c === aiIdx).length;
    const op = w.filter(c => c === oppIdx).length;
    const em = w.filter(c => c === null).length;
    if (ai === 3 && em === 1) return 5;
    if (ai === 2 && em === 2) return 2;
    if (op === 3 && em === 1) return -4;
    return 0;
  }
  for (let r = 0; r < ROWS; r++) if (board[r][3] === aiIdx) score += 3;
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS-4; c++)
      score += sw([board[r][c],board[r][c+1],board[r][c+2],board[r][c+3]]);
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS-4; r++)
      score += sw([board[r][c],board[r+1][c],board[r+2][c],board[r+3][c]]);
  for (let r = 0; r <= ROWS-4; r++)
    for (let c = 0; c <= COLS-4; c++)
      score += sw([board[r][c],board[r+1][c+1],board[r+2][c+2],board[r+3][c+3]]);
  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS-4; c++)
      score += sw([board[r][c],board[r-1][c+1],board[r-2][c+2],board[r-3][c+3]]);
  return score;
}

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

// AI – medium
test('Medium AI takes winning move', () => {
  const b = createBoard();
  for (let c = 0; c < 3; c++) b[5][c] = 1;
  assert(AI.getMove(b, 1, 'medium') === 3);
});

test('Medium AI blocks opponent win', () => {
  const b = createBoard();
  for (let c = 0; c < 3; c++) b[5][c] = 0;
  assert(AI.getMove(b, 1, 'medium') === 3);
});

test('Medium AI prefers center on empty board', () => {
  assert(AI.getMove(createBoard(), 1, 'medium') === 3);
});

// AI – hard (minimax depth 5)
test('Hard AI takes winning move', () => {
  const b = createBoard();
  for (let c = 0; c < 3; c++) b[5][c] = 1;
  assert(AI.getMove(b, 1, 'hard') === 3);
});

test('Hard AI blocks opponent win', () => {
  const b = createBoard();
  for (let c = 0; c < 3; c++) b[5][c] = 0;
  assert(AI.getMove(b, 1, 'hard') === 3);
});

// AI – expert (minimax depth 7)
test('Expert AI takes winning move', () => {
  const b = createBoard();
  for (let c = 0; c < 3; c++) b[5][c] = 1;
  assert(AI.getMove(b, 1, 'expert') === 3);
});

test('Expert AI blocks opponent win', () => {
  const b = createBoard();
  for (let c = 0; c < 3; c++) b[5][c] = 0;
  assert(AI.getMove(b, 1, 'expert') === 3);
});

// AI – easy (random, just check it returns a valid column)
test('Easy AI returns a valid column', () => {
  const b = createBoard();
  b[5][3] = 0; // block center
  const col = AI.getMove(b, 1, 'easy');
  assert(col >= 0 && col < COLS && b[0][col] === null, 'Invalid column: ' + col);
});

// Summary
console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
