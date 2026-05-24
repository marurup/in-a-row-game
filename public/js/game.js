'use strict';

// ── Constants ─────────────────────────────────────────────────
const ROWS = 6;
const COLS = 7;
const PLAYER_COLORS = ['#e74c3c', '#f1c40f'];

// ── State ─────────────────────────────────────────────────────
const State = {
  mode: null,        // 'local' | 'ai' | 'online'
  phase: 'menu',
  players: [
    { name: 'Spiller 1', color: PLAYER_COLORS[0] },
    { name: 'Spiller 2', color: PLAYER_COLORS[1] }
  ],
  currentTurn: 0,   // 0 or 1
  board: null,      // ROWS × COLS, null | 0 | 1
  winner: null,     // null | 0 | 1 | 'draw'
  winningCells: [],
  lastMove: null,
  aiDifficulty: 'medium', // 'easy' | 'medium' | 'hard' | 'expert'
  online: {
    peer: null,
    conn: null,
    myIndex: 0,
    roomCode: ''
  }
};

// ── Board Logic ───────────────────────────────────────────────
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

// ── AI ────────────────────────────────────────────────────────
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
    let bestScore = -Infinity;
    let bestCol = ordered[0];
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
  if (depth === 0 || valid.length === 0) {
    return valid.length === 0 ? 0 : scoreBoard(board, aiIdx);
  }
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

  function scoreWindow(w) {
    const ai    = w.filter(c => c === aiIdx).length;
    const opp   = w.filter(c => c === oppIdx).length;
    const empty = w.filter(c => c === null).length;
    if (ai  === 3 && empty === 1) return 5;
    if (ai  === 2 && empty === 2) return 2;
    if (opp === 3 && empty === 1) return -4;
    return 0;
  }

  for (let r = 0; r < ROWS; r++)
    if (board[r][3] === aiIdx) score += 3;

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]]);

  for (let c = 0; c < COLS; c++)
    for (let r = 0; r <= ROWS - 4; r++)
      score += scoreWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]]);

  for (let r = 0; r <= ROWS - 4; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]]);

  for (let r = 3; r < ROWS; r++)
    for (let c = 0; c <= COLS - 4; c++)
      score += scoreWindow([board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]]);

  return score;
}

// ── Network (PeerJS) ─────────────────────────────────────────
const Network = {
  host(name) {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const peerId = 'inrow2026-' + code.toLowerCase();
    State.online.myIndex = 0;
    State.online.roomCode = code;
    State.players[0].name = name || 'Spiller 1';

    const peer = new Peer(peerId);
    State.online.peer = peer;

    peer.on('open', () => {
      document.getElementById('room-code-display').textContent = code;
      showScreen('waiting');
    });

    peer.on('connection', conn => {
      State.online.conn = conn;
      conn.on('data', data => Network._recv(data));
      conn.on('close', () => {
        if (['game', 'gameover'].includes(State.phase)) {
          alert('Modstanderen afbrød forbindelsen.');
          Network.destroy();
          showScreen('menu');
        }
      });
    });

    peer.on('error', err => {
      if (err.type === 'unavailable-id') {
        // Peer ID already taken — retry with new code
        Network.destroy();
        Network.host(name);
      } else {
        alert('Netværksfejl: ' + err.message);
      }
    });
  },

  join(name, code) {
    const peerId = 'inrow2026-' + code.toLowerCase();
    State.online.myIndex = 1;
    State.online.roomCode = code;
    State.players[1].name = name || 'Spiller 2';

    const peer = new Peer();
    State.online.peer = peer;

    peer.on('open', () => {
      const conn = peer.connect(peerId, { reliable: true });
      State.online.conn = conn;
      conn.on('open', () => {
        conn.send({ type: 'join_name', name: name || 'Spiller 2' });
      });
      conn.on('data', data => Network._recv(data));
      conn.on('close', () => {
        if (['game', 'gameover'].includes(State.phase)) {
          alert('Forbindelsen blev afbrudt.');
          Network.destroy();
          showScreen('menu');
        }
      });
    });

    peer.on('error', () => {
      alert('Kan ikke forbinde. Tjek koden og prøv igen.');
    });
  },

  _recv(data) {
    switch (data.type) {
      case 'join_name':
        // Host receives joiner's name, sends back own name, starts game
        State.players[1].name = data.name;
        Network.send({ type: 'game_start', hostName: State.players[0].name });
        initGame();
        break;
      case 'game_start':
        // Joiner receives host's name, starts game
        State.players[0].name = data.hostName;
        initGame();
        break;
      case 'drop':
        processMove(data.col);
        break;
    }
  },

  send(data) {
    if (State.online.conn && State.online.conn.open) {
      State.online.conn.send(data);
    }
  },

  destroy() {
    try { if (State.online.conn) State.online.conn.close(); } catch (e) {}
    try { if (State.online.peer) State.online.peer.destroy(); } catch (e) {}
    State.online.peer = null;
    State.online.conn = null;
  }
};

// ── Screen ────────────────────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  State.phase = name;
}

// ── Mode Selection ────────────────────────────────────────────
function selectMode(mode) {
  State.mode = mode;
  if (mode === 'online') {
    showChoiceSection();
    showScreen('online-setup');
  } else {
    const p2Row   = document.getElementById('name-p2-row');
    const aiLabel = document.getElementById('ai-player-label');
    const diffRow = document.getElementById('difficulty-row');
    if (mode === 'ai') {
      p2Row.classList.add('hidden');
      aiLabel.classList.remove('hidden');
      diffRow.classList.remove('hidden');
    } else {
      p2Row.classList.remove('hidden');
      aiLabel.classList.add('hidden');
      diffRow.classList.add('hidden');
    }
    showScreen('names');
  }
}

function startLocalGame() {
  const raw1 = document.getElementById('name-p1').value.trim();
  const raw2 = document.getElementById('name-p2').value.trim();
  const name1 = raw1 || 'Spiller 1';
  const name2 = State.mode === 'ai' ? 'Computer' : (raw2 || 'Spiller 2');

  localStorage.setItem('inrow-my-name', raw1);
  if (State.mode !== 'ai') localStorage.setItem('inrow-p2-name', raw2);

  State.players[0].name = name1;
  State.players[1].name = name2;
  initGame();
}

// ── Online Setup ──────────────────────────────────────────────
function showSection(id) {
  const ids = ['online-section-choice', 'online-section-host', 'online-section-join'];
  ids.forEach(s => document.getElementById(s).classList.toggle('hidden', s !== id));
}

function showChoiceSection() { showSection('online-section-choice'); }
function showHostSection()   { showSection('online-section-host'); }
function showJoinSection()   { showSection('online-section-join'); }

function createRoom() {
  const raw = document.getElementById('name-online-host').value.trim();
  localStorage.setItem('inrow-my-name', raw);
  Network.host(raw || 'Spiller 1');
}

function joinOnlineGame() {
  const raw = document.getElementById('name-online-join').value.trim();
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (code.length < 4) {
    alert('Indtast en gyldig rum-kode');
    return;
  }
  localStorage.setItem('inrow-my-name', raw);
  Network.join(raw || 'Spiller 2', code);
}

function cancelOnline() {
  Network.destroy();
  showScreen('menu');
}

function copyRoomCode() {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(State.online.roomCode).catch(() => {});
  }
}

// ── Game Init ─────────────────────────────────────────────────
function initGame() {
  State.board = createBoard();
  State.currentTurn = 0;
  State.winner = null;
  State.winningCells = [];
  State.lastMove = null;
  renderGame();
  showScreen('game');
  if (State.mode === 'ai' && State.currentTurn === 1) {
    scheduleAIMove();
  }
}

// ── Move Processing ───────────────────────────────────────────
function handleDrop(col) {
  if (State.winner !== null) return;
  if (State.mode === 'online' && State.online.myIndex !== State.currentTurn) return;
  if (State.mode === 'online') {
    Network.send({ type: 'drop', col });
  }
  processMove(col);
}

function processMove(col) {
  const row = getLowestEmptyRow(State.board, col);
  if (row === -1) return;

  State.board[row][col] = State.currentTurn;
  State.lastMove = { row, col };

  const winning = checkWin(State.board, row, col, State.currentTurn);
  if (winning) {
    State.winningCells = winning;
    State.winner = State.currentTurn;
    renderGame();
    setTimeout(showGameOver, 1200);
    return;
  }

  if (isBoardFull(State.board)) {
    State.winner = 'draw';
    renderGame();
    setTimeout(showGameOver, 800);
    return;
  }

  State.currentTurn = 1 - State.currentTurn;
  renderGame();

  if (State.mode === 'ai' && State.currentTurn === 1) {
    scheduleAIMove();
  }
}

function setDifficulty(diff) {
  State.aiDifficulty = diff;
  localStorage.setItem('inrow-ai-difficulty', diff);
  document.querySelectorAll('.diff-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.diff === diff)
  );
}

function scheduleAIMove() {
  setTimeout(() => {
    const col = AI.getMove(State.board, 1, State.aiDifficulty);
    processMove(col);
  }, 580);
}

// ── Gameover ──────────────────────────────────────────────────
function showGameOver() {
  const chip  = document.getElementById('winner-chip');
  const title = document.getElementById('gameover-title');
  const sub   = document.getElementById('gameover-sub');

  if (State.winner === 'draw') {
    title.textContent = 'Uafgjort!';
    sub.textContent = 'Brættet er fuldt';
    chip.style.display = 'none';
  } else {
    const player = State.players[State.winner];
    title.textContent = player.name + ' vinder!';
    chip.style.display = '';
    chip.style.color = player.color;
    sub.textContent = '';
  }

  showScreen('gameover');
}

function playAgain() {
  if (State.mode === 'online') {
    Network.destroy();
    showScreen('menu');
  } else {
    initGame();
  }
}

function confirmQuit() {
  if (!confirm('Afslut spillet?')) return;
  if (State.mode === 'online') Network.destroy();
  showScreen('menu');
}

// ── Rendering ─────────────────────────────────────────────────
function renderGame() {
  renderBoard();
  renderTurnIndicator();
}

function renderBoard() {
  const boardEl  = document.getElementById('board');
  const arrowsEl = document.getElementById('col-arrows');
  boardEl.innerHTML  = '';
  arrowsEl.innerHTML = '';

  const isMyTurn   = State.mode !== 'online' || State.online.myIndex === State.currentTurn;
  const interactive = !State.winner && isMyTurn;

  // Column drop arrows
  for (let col = 0; col < COLS; col++) {
    const canDrop = interactive && State.board[0][col] === null;
    const btn = document.createElement('button');
    btn.className = 'col-arrow' + (canDrop ? '' : ' disabled');
    btn.setAttribute('aria-label', 'Sæt brik i kolonne ' + (col + 1));
    btn.textContent = '▼';
    if (canDrop) {
      btn.addEventListener('click', () => handleDrop(col));
      btn.addEventListener('mouseenter', () => showPreview(col));
      btn.addEventListener('mouseleave', hidePreview);
    }
    arrowsEl.appendChild(btn);
  }

  // Board cells
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const val   = State.board[row][col];
      const isWin = State.winningCells.some(([r, c]) => r === row && c === col);
      const isNew = State.lastMove &&
                    State.lastMove.row === row &&
                    State.lastMove.col === col &&
                    val !== null;

      let cls = 'cell';
      if      (val === 0) cls += ' p1';
      else if (val === 1) cls += ' p2';
      else                cls += ' empty';
      if (isWin) cls += ' win';
      if (isNew) cls += ' drop';

      const cell = document.createElement('div');
      cell.className = cls;
      cell.dataset.col = col;

      // Tap to drop on mobile (cells in any row of the column)
      if (interactive && val === null && State.board[0][col] === null) {
        cell.addEventListener('click', () => handleDrop(col));
      }

      boardEl.appendChild(cell);
    }
  }
}

function renderTurnIndicator() {
  if (State.winner !== null) return;
  const player = State.players[State.currentTurn];
  document.getElementById('turn-chip').style.color = player.color;

  let text;
  if (State.mode === 'ai' && State.currentTurn === 1) {
    text = 'Computer tænker…';
  } else if (State.mode === 'online') {
    const isMyTurn = State.online.myIndex === State.currentTurn;
    text = isMyTurn ? 'Din tur' : player.name + 's tur…';
  } else {
    text = player.name + 's tur';
  }
  document.getElementById('turn-text').textContent = text;
}

function showPreview(col) {
  const row = getLowestEmptyRow(State.board, col);
  if (row < 0) return;
  const cells = document.querySelectorAll('.cell');
  const cell  = cells[row * COLS + col];
  cell.classList.add('preview');
  cell.style.setProperty('--preview-color', PLAYER_COLORS[State.currentTurn] + '80');
}

function hidePreview() {
  document.querySelectorAll('.cell.preview').forEach(c => {
    c.classList.remove('preview');
    c.style.removeProperty('--preview-color');
  });
}

// ── PWA Install ───────────────────────────────────────────────
let deferredInstallPrompt = null;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                     || window.navigator.standalone === true;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('btn-install').classList.remove('hidden');
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  document.getElementById('btn-install').classList.add('hidden');
});

if (isIOS && !isStandalone) {
  document.getElementById('btn-install').classList.remove('hidden');
}

function installApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.then(() => {
      deferredInstallPrompt = null;
      document.getElementById('btn-install').classList.add('hidden');
    });
  } else if (isIOS) {
    alert('Tryk på Del-ikonet (firkant med pil op) og vælg "Tilføj til hjemmeskærm".');
  }
}

// ── Version ───────────────────────────────────────────────────
fetch('version.json')
  .then(r => r.json())
  .then(v => {
    const el = document.getElementById('version-info');
    if (el) el.textContent = v.version + ' · ' + v.date;
  })
  .catch(() => {});

// ── Saved names ───────────────────────────────────────────────
(function loadSavedNames() {
  const my   = localStorage.getItem('inrow-my-name') ?? '';
  const p2   = localStorage.getItem('inrow-p2-name') ?? '';
  const diff = localStorage.getItem('inrow-ai-difficulty') ?? 'medium';
  document.getElementById('name-p1').value = my;
  document.getElementById('name-p2').value = p2;
  document.getElementById('name-online-host').value = my;
  document.getElementById('name-online-join').value = my;
  setDifficulty(diff);
})();

// ── PWA ───────────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
