const EMPTY = 0;
const GREEN = 1;
const RED = 2;

let playerBoard;
let targetBoard;
let targetRedPos;
let hasWon = false;
let activeDrag = null;

const playerBoardEl = document.getElementById("player-board");
const targetBoardEl = document.getElementById("target-board");
const statusEl = document.getElementById("status");
const timerEl = document.getElementById("timer");
const levelEl = document.getElementById("level");
const resetBtn = document.getElementById("reset-btn");
const gameCombinationsEl = document.getElementById("game-combinations");
const gameProgressListEl = document.getElementById("game-progress-list");
const winModal = document.getElementById("win-modal");
const closeWinModalBtn = document.getElementById("close-win-modal");
const playAgainBtn = document.getElementById("play-again-btn");
const winMessageEl = document.getElementById("win-message");
const winTimeEl = document.getElementById("win-time");
const winPlayerEl = document.getElementById("win-player");

const totalGameCombinations = 9 * 8;
let secondsElapsed = 0;
let timerInterval = null;

if (gameCombinationsEl) {
  gameCombinationsEl.textContent = `Total combinations: ${totalGameCombinations}`;
}

function generatePlayerBoard() {
  const board = Array.from({ length: 3 }, () => Array(3).fill(GREEN));

  let redX = Math.floor(Math.random() * 3);
  let redY = Math.floor(Math.random() * 3);
  board[redY][redX] = RED;

  let emptyX, emptyY;
  do {
    emptyX = Math.floor(Math.random() * 3);
    emptyY = Math.floor(Math.random() * 3);
  } while (emptyX === redX && emptyY === redY);

  board[emptyY][emptyX] = EMPTY;

  return board;
}

function generateTargetBoard() {
  const board = Array.from({ length: 3 }, () => Array(3).fill(GREEN));

  targetRedPos = {
    x: Math.floor(Math.random() * 3),
    y: Math.floor(Math.random() * 3)
  };

  board[targetRedPos.y][targetRedPos.x] = RED;

  return board;
}

function getBoardDistance(boardA, boardB) {
  let distance = 0;

  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const aValue = boardA[y][x];
      const bValue = boardB[y][x];

      if (aValue !== bValue) {
        distance += 1;
      }
    }
  }

  return distance;
}

function getLevelLabel(boardA, boardB) {
  const distance = getBoardDistance(boardA, boardB);

  if (distance <= 1) return "Easy";
  if (distance <= 2) return "Medium";
  return "Hard";
}

function renderBoard(board, container) {
  container.innerHTML = "";
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      const tileEl = document.createElement("div");
      tileEl.classList.add("tile");
      tileEl.dataset.x = x;
      tileEl.dataset.y = y;

      if (board[y][x] === GREEN) tileEl.classList.add("green");
      if (board[y][x] === RED) tileEl.classList.add("red");
      if (board[y][x] === EMPTY) tileEl.classList.add("empty");

      tileEl.addEventListener("pointerdown", handleTilePointerDown);
      tileEl.addEventListener("pointermove", handleTilePointerMove);
      tileEl.addEventListener("pointerup", handleTilePointerUp);
      tileEl.addEventListener("pointercancel", handleTilePointerCancel);
      tileEl.addEventListener("touchstart", handleTileTouchStart, { passive: false });
      tileEl.addEventListener("touchend", handleTileTouchEnd, { passive: false });
      tileEl.addEventListener("click", handleTileClick);

      container.appendChild(tileEl);
    }
  }
}

function findEmpty(board) {
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (board[y][x] === EMPTY) return { x, y };
    }
  }
}

function move(board, direction) {
  const empty = findEmpty(board);
  let { x, y } = empty;

  let targetX = x;
  let targetY = y;

  if (direction === "ArrowUp") targetY--;
  if (direction === "ArrowDown") targetY++;
  if (direction === "ArrowLeft") targetX--;
  if (direction === "ArrowRight") targetX++;

  if (targetX < 0 || targetX > 2 || targetY < 0 || targetY > 2) return;

  [board[y][x], board[targetY][targetX]] = [board[targetY][targetX], board[y][x]];
}

function trySwapTileWithEmpty(board, tileX, tileY) {
  const empty = findEmpty(board);
  const isAdjacent = Math.abs(tileX - empty.x) + Math.abs(tileY - empty.y) === 1;

  if (!isAdjacent) return false;

  [board[tileY][tileX], board[empty.y][empty.x]] = [board[empty.y][empty.x], board[tileY][tileX]];
  return true;
}

function resetDragState(tileEl) {
  if (!tileEl) return;
  tileEl.classList.remove("dragging");
  tileEl.style.transform = "";
  tileEl.style.zIndex = "";
  tileEl.style.position = "";
}

function handleTilePointerDown(event) {
  const tileEl = event.currentTarget;
  const x = Number(tileEl.dataset.x);
  const y = Number(tileEl.dataset.y);

  if (playerBoard[y][x] === EMPTY || redIsInTargetPosition(playerBoard)) return;

  activeDrag = {
    tileEl,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    moved: false
  };

  tileEl.setPointerCapture?.(event.pointerId);
  tileEl.classList.add("dragging");
  tileEl.style.position = "relative";
  tileEl.style.zIndex = "3";
  event.preventDefault();
}

function handleTilePointerMove(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

  const dx = event.clientX - activeDrag.startX;
  const dy = event.clientY - activeDrag.startY;

  if (!activeDrag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
    activeDrag.moved = true;
  }

  if (activeDrag.moved) {
    activeDrag.tileEl.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;
  }
}

function handleTilePointerUp(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;

  const tileEl = activeDrag.tileEl;
  const x = Number(tileEl.dataset.x);
  const y = Number(tileEl.dataset.y);

  if (!activeDrag.moved) {
    if (trySwapTileWithEmpty(playerBoard, x, y)) {
      startTimer();
      update();
    }
  } else if (trySwapTileWithEmpty(playerBoard, x, y)) {
    startTimer();
    update();
  }

  resetDragState(tileEl);
  activeDrag = null;
}

function handleTilePointerCancel(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
  resetDragState(activeDrag.tileEl);
  activeDrag = null;
}

function handleTileTouchStart(event) {
  const tileEl = event.currentTarget;
  const touch = event.touches[0];
  const x = Number(tileEl.dataset.x);
  const y = Number(tileEl.dataset.y);

  if (playerBoard[y][x] === EMPTY || redIsInTargetPosition(playerBoard)) return;

  activeDrag = {
    tileEl,
    pointerId: touch ? touch.identifier : 0,
    startX: touch ? touch.clientX : 0,
    startY: touch ? touch.clientY : 0,
    moved: false
  };

  tileEl.classList.add("dragging");
  event.preventDefault();
}

function handleTileTouchEnd(event) {
  if (!activeDrag) return;

  const tileEl = activeDrag.tileEl;
  const x = Number(tileEl.dataset.x);
  const y = Number(tileEl.dataset.y);

  if (trySwapTileWithEmpty(playerBoard, x, y)) {
    startTimer();
    update();
  }

  resetDragState(tileEl);
  activeDrag = null;
  event.preventDefault();
}

function handleTileClick(event) {
  const tileEl = event.currentTarget;
  const x = Number(tileEl.dataset.x);
  const y = Number(tileEl.dataset.y);

  if (playerBoard[y][x] === EMPTY || redIsInTargetPosition(playerBoard)) return;

  if (trySwapTileWithEmpty(playerBoard, x, y)) {
    startTimer();
    update();
  }
}

function redIsInTargetPosition(board) {
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (board[y][x] === RED) {
        return x === targetRedPos.x && y === targetRedPos.y;
      }
    }
  }
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function updateTimer() {
  timerEl.textContent = formatTime(secondsElapsed);
}

function startTimer() {
  if (timerInterval) return;
  timerInterval = setInterval(() => {
    secondsElapsed += 1;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function update() {
  renderBoard(playerBoard, playerBoardEl);
  renderBoard(targetBoard, targetBoardEl);

  if (levelEl) {
    levelEl.textContent = getLevelLabel(playerBoard, targetBoard);
  }

  if (redIsInTargetPosition(playerBoard)) {
    if (!hasWon) {
      hasWon = true;
      stopTimer();
      showWinModal();
    }
    if (statusEl) {
      statusEl.textContent = "You matched the red tile position!";
    }
  } else {
    hasWon = false;
    if (statusEl) {
      statusEl.textContent = "Move the red tile to match the target red tile.";
    }
  }
}

function newGame() {
  let nextPlayerBoard;
  let nextTargetBoard;

  do {
    nextPlayerBoard = generatePlayerBoard();
    nextTargetBoard = generateTargetBoard();
  } while (redIsInTargetPosition(nextPlayerBoard));

  playerBoard = nextPlayerBoard;
  targetBoard = nextTargetBoard;
  secondsElapsed = 0;
  hasWon = false;
  closeWinModal();
  updateTimer();
  startTimer();
  update();
}

document.addEventListener("keydown", (e) => {
  if (redIsInTargetPosition(playerBoard)) return;
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;

  move(playerBoard, e.key);
  startTimer();
  update();
});

resetBtn.addEventListener("click", newGame);

/* Bottom Menu */
document.getElementById("menu-new").addEventListener("click", newGame);

/* Facts Modal */
const factsModal = document.getElementById("facts-modal");
const closeModal = document.getElementById("close-modal");
const closeFactsBtn = document.getElementById("close-facts-btn");

function closeFactsModal() {
  factsModal.style.display = "none";
}

document.querySelectorAll(".menu-facts-trigger").forEach((button) => {
  button.addEventListener("click", () => {
    factsModal.style.display = "block";
  });
});

closeModal.addEventListener("click", closeFactsModal);
closeFactsBtn.addEventListener("click", closeFactsModal);

/* User Modal */
const userModal = document.getElementById("user-modal");
const closeUserModal = document.getElementById("close-user-modal");
const editUserBtn = document.getElementById("edit-user-btn");
const saveUserBtn = document.getElementById("save-user-btn");
const nameDisplayRow = document.getElementById("name-display-row");
const nameEditRow = document.getElementById("name-edit-row");
const userNameDisplay = document.getElementById("user-name-display");
const playerNameInput = document.getElementById("player-name-input");
const storageKey = "red-shift-player-name";
const completedGamesKey = "red-shift-completed-games";

function getStoredUserName() {
  return localStorage.getItem(storageKey) || "Player";
}

function getCompletedGames() {
  try {
    const savedGames = localStorage.getItem(completedGamesKey);
    return savedGames ? JSON.parse(savedGames) : [];
  } catch (error) {
    return [];
  }
}

function updateProgressSummary() {
  if (!gameProgressListEl) return;

  const completedGames = getCompletedGames();

  if (!completedGames.length) {
    gameProgressListEl.innerHTML = '<div class="game-progress-item">No completed games yet.</div>';
    return;
  }

  const recentGames = completedGames.slice(-3).reverse();
  gameProgressListEl.innerHTML = recentGames
    .map((game) => `<div class="game-progress-item">${game.player} • ${formatTime(game.time)} • ${new Date(game.completedAt).toLocaleDateString()}</div>`)
    .join("");
}

function saveUserName(name) {
  const trimmedName = name.trim() || "Player";
  localStorage.setItem(storageKey, trimmedName);
  userNameDisplay.textContent = trimmedName;
  playerNameInput.value = trimmedName;
  if (winPlayerEl) {
    winPlayerEl.textContent = trimmedName;
  }
}

function saveCompletedGame() {
  const completedGames = getCompletedGames();
  const entry = {
    player: getStoredUserName(),
    time: secondsElapsed,
    completedAt: new Date().toISOString()
  };

  completedGames.push(entry);
  localStorage.setItem(completedGamesKey, JSON.stringify(completedGames));
  updateProgressSummary();
}

function showUserNameEditor() {
  nameDisplayRow.style.display = "none";
  nameEditRow.style.display = "flex";
  playerNameInput.value = getStoredUserName();
  playerNameInput.focus();
}

function showUserNameDisplay() {
  nameDisplayRow.style.display = "block";
  nameEditRow.style.display = "none";
}

function openUserModal() {
  userModal.style.display = "block";
  userNameDisplay.textContent = getStoredUserName();
  playerNameInput.value = getStoredUserName();
  updateProgressSummary();
  showUserNameDisplay();
}

document.getElementById("menu-user").addEventListener("click", openUserModal);

editUserBtn.addEventListener("click", showUserNameEditor);
saveUserBtn.addEventListener("click", () => {
  saveUserName(playerNameInput.value);
  showUserNameDisplay();
});

playerNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    saveUserName(playerNameInput.value);
    showUserNameDisplay();
  }
});

closeUserModal.addEventListener("click", () => {
  userModal.style.display = "none";
  showUserNameDisplay();
});

saveUserName(getStoredUserName());
updateProgressSummary();

/* Win Modal */
function showWinModal() {
  saveCompletedGame();
  if (winMessageEl) {
    winMessageEl.textContent = `You solved the puzzle in ${formatTime(secondsElapsed)}.`;
  }
  if (winTimeEl) {
    winTimeEl.textContent = formatTime(secondsElapsed);
  }
  if (winPlayerEl) {
    winPlayerEl.textContent = getStoredUserName();
  }
  if (winModal) {
    winModal.style.display = "flex";
    requestAnimationFrame(() => {
      winModal.style.display = "flex";
    });
  }
}

function closeWinModal() {
  if (winModal) {
    winModal.style.display = "none";
  }
}

playAgainBtn.addEventListener("click", newGame);
closeWinModalBtn.addEventListener("click", closeWinModal);

/* Print Modal */
const printModal = document.getElementById("print-modal");
const closePrintModal = document.getElementById("close-print-modal");
const printCurrentBtn = document.getElementById("print-current-puzzle");
const printAllTargetPatternsBtn = document.getElementById("print-all-target-patterns");
const printAllArrangementTilesBtn = document.getElementById("print-all-arrangement-tiles");
const printAllBtn = document.getElementById("print-all-combinations");

function createPrintableCell(value) {
  const valueClass = value === RED ? "pdf-red" : value === EMPTY ? "pdf-empty" : "pdf-green";
  return `<div class="pdf-cell ${valueClass}"></div>`;
}

function createPrintableBoard(board) {
  const cells = board.flatMap((row) => row.map((cell) => createPrintableCell(cell))).join("");
  return `<div class="pdf-board">${cells}</div>`;
}

function createPrintablePuzzle(puzzle, number) {
  return `
    <div class="pdf-puzzle">
      <h3>Puzzle ${number}</h3>
      <p>Target Pattern</p>
      ${createPrintableBoard(puzzle.targetBoard)}
      <p>Arrange the Tiles</p>
      ${createPrintableBoard(puzzle.playerBoard)}
    </div>
  `;
}

function generateCurrentPuzzlePDF() {
  const puzzlesHtml = createPrintablePuzzle({ targetBoard, playerBoard }, 1);
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Current Puzzle</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
          h1 { margin-bottom: 8px; }
          .summary { margin-bottom: 20px; font-size: 15px; color: #4b5563; }
          .pdf-puzzle { page-break-inside: avoid; border: 1px solid #ccc; padding: 15px; margin: 15px; display: inline-block; vertical-align: top; width: 260px; }
          .pdf-board { display: grid; grid-template-columns: repeat(3, 32px); gap: 4px; justify-content: center; margin: 10px auto 16px auto; }
          .pdf-cell { width: 32px; height: 32px; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; }
          .pdf-green { background: #ffffff; border-color: #111827; }
          .pdf-red { background: #000000; }
          .pdf-empty { background: #e5e7eb; border-color: #111827; }
          @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        </style>
      </head>
      <body>
        <h1>Current Puzzle</h1>
        <div class="summary">Printable worksheet for the current board.</div>
        <button onclick="window.print()">Save as PDF / Print</button>
        <hr>
        ${puzzlesHtml}
      </body>
    </html>`);

  printWindow.document.close();
  printWindow.focus();
  printModal.style.display = "none";
}

function generateAllTargetPatternsPDF() {
  const targetPatterns = [];
  for (let redIndex = 0; redIndex < 9; redIndex += 1) {
    const board = Array.from({ length: 3 }, () => Array(3).fill(GREEN));
    const redX = redIndex % 3;
    const redY = Math.floor(redIndex / 3);
    board[redY][redX] = RED;
    targetPatterns.push({ targetBoard: board });
  }

  const puzzlesHtml = targetPatterns.map((puzzle, index) => `
    <div class="pdf-puzzle">
      <h3>Target Pattern ${index + 1}</h3>
      <p>Target Pattern</p>
      ${createPrintableBoard(puzzle.targetBoard)}
    </div>
  `).join("");
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>All Possible Target Patterns</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
          h1 { margin-bottom: 8px; }
          .summary { margin-bottom: 20px; font-size: 15px; color: #4b5563; }
          .pdf-puzzle { page-break-inside: avoid; border: 1px solid #ccc; padding: 15px; margin: 15px; display: inline-block; vertical-align: top; width: 260px; }
          .pdf-board { display: grid; grid-template-columns: repeat(3, 32px); gap: 4px; justify-content: center; margin: 10px auto 16px auto; }
          .pdf-cell { width: 32px; height: 32px; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; }
          .pdf-green { background: #ffffff; border-color: #111827; }
          .pdf-red { background: #000000; }
          .pdf-empty { background: #e5e7eb; border-color: #111827; }
          @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        </style>
      </head>
      <body>
        <h1>All Possible Target Patterns</h1>
        <div class="summary">Printable target patterns for every possible red tile position.</div>
        <button onclick="window.print()">Save as PDF / Print</button>
        <hr>
        ${puzzlesHtml}
      </body>
    </html>`);

  printWindow.document.close();
  printWindow.focus();
  printModal.style.display = "none";
}

function generateAllArrangementTilesPDF() {
  const tiles = [];
  for (let redIndex = 0; redIndex < 9; redIndex += 1) {
    for (let emptyIndex = 0; emptyIndex < 9; emptyIndex += 1) {
      if (redIndex === emptyIndex) continue;

      const board = Array.from({ length: 3 }, () => Array(3).fill(GREEN));
      const redX = redIndex % 3;
      const redY = Math.floor(redIndex / 3);
      board[redY][redX] = RED;

      const emptyX = emptyIndex % 3;
      const emptyY = Math.floor(emptyIndex / 3);
      board[emptyY][emptyX] = EMPTY;

      tiles.push(board);
    }
  }

  const puzzlesHtml = tiles.map((board, index) => `
    <div class="pdf-puzzle">
      <h3>Tile ${index + 1}</h3>
      ${createPrintableBoard(board)}
    </div>
  `).join("");

  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>All Possible Arrangement Tiles</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
          h1 { margin-bottom: 8px; }
          .summary { margin-bottom: 20px; font-size: 15px; color: #4b5563; }
          .pdf-puzzle { page-break-inside: avoid; border: 1px solid #ccc; padding: 15px; margin: 15px; display: inline-block; vertical-align: top; width: 220px; }
          .pdf-board { display: grid; grid-template-columns: repeat(3, 32px); gap: 4px; justify-content: center; margin: 10px auto 16px auto; }
          .pdf-cell { width: 32px; height: 32px; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; }
          .pdf-green { background: #ffffff; border-color: #111827; }
          .pdf-red { background: #000000; }
          .pdf-empty { background: #e5e7eb; border-color: #111827; }
          @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        </style>
      </head>
      <body>
        <h1>All Possible Arrangement Tiles</h1>
        <div class="summary">Printable arrangement tiles for every possible red tile position.</div>
        <button onclick="window.print()">Save as PDF / Print</button>
        <hr>
        ${puzzlesHtml}
      </body>
    </html>`);

  printWindow.document.close();
  printWindow.focus();
  printModal.style.display = "none";
}

function generateAllPuzzlesPDF() {
  const allPuzzles = buildAllPossiblePuzzles();
  const puzzlesHtml = allPuzzles.map((puzzle, index) => createPrintablePuzzle(puzzle, index + 1)).join("");
  const printWindow = window.open("", "_blank", "width=900,height=900");
  if (!printWindow) return;

  printWindow.document.write(`<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>All Puzzle Combinations</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; text-align: center; }
          h1 { margin-bottom: 8px; }
          .summary { margin-bottom: 20px; font-size: 15px; color: #4b5563; }
          .pdf-puzzle { page-break-inside: avoid; border: 1px solid #ccc; padding: 15px; margin: 15px; display: inline-block; vertical-align: top; width: 260px; }
          .pdf-board { display: grid; grid-template-columns: repeat(3, 32px); gap: 4px; justify-content: center; margin: 10px auto 16px auto; }
          .pdf-cell { width: 32px; height: 32px; border: 1px solid #333; display: flex; align-items: center; justify-content: center; font-weight: 700; color: white; }
          .pdf-green { background: #ffffff; border-color: #111827; }
          .pdf-red { background: #000000; }
          .pdf-empty { background: #e5e7eb; border-color: #111827; }
          @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
        </style>
      </head>
      <body>
        <h1>All Puzzle Combinations</h1>
        <div class="summary">Each puzzle shows the target pattern and the matching arrangement tiles.</div>
        <button onclick="window.print()">Save as PDF / Print</button>
        <hr>
        ${puzzlesHtml}
      </body>
    </html>`);

  printWindow.document.close();
  printWindow.focus();
  printModal.style.display = "none";
}

function openPrintModal() {
  printModal.style.display = "block";
}

function buildAllPossiblePuzzles() {
  const puzzles = [];
  for (let redIndex = 0; redIndex < 9; redIndex += 1) {
    for (let emptyIndex = 0; emptyIndex < 9; emptyIndex += 1) {
      if (redIndex === emptyIndex) continue;

      const targetBoard = Array.from({ length: 3 }, () => Array(3).fill(GREEN));
      targetBoard[Math.floor(redIndex / 3)][redIndex % 3] = RED;

      const playerBoard = Array.from({ length: 3 }, () => Array(3).fill(GREEN));
      playerBoard[Math.floor(emptyIndex / 3)][emptyIndex % 3] = EMPTY;
      const redX = redIndex % 3;
      const redY = Math.floor(redIndex / 3);
      playerBoard[redY][redX] = RED;

      puzzles.push({ targetBoard, playerBoard });
    }
  }
  return puzzles;
}

document.querySelectorAll(".menu-print-trigger").forEach((button) => {
  button.addEventListener("click", openPrintModal);
});

closePrintModal.addEventListener("click", () => {
  printModal.style.display = "none";
});

printCurrentBtn.addEventListener("click", generateCurrentPuzzlePDF);
printAllTargetPatternsBtn.addEventListener("click", generateAllTargetPatternsPDF);
printAllArrangementTilesBtn.addEventListener("click", generateAllArrangementTilesPDF);
printAllBtn.addEventListener("click", generateAllPuzzlesPDF);

/* Close modals when clicking outside */
window.addEventListener("click", (e) => {
  if (e.target === factsModal) factsModal.style.display = "none";
  if (e.target === userModal) userModal.style.display = "none";
  if (e.target === winModal) winModal.style.display = "none";
  if (e.target === printModal) printModal.style.display = "none";
});

newGame();
