const ROWS = "ABCDEFGHIJ";
const COLS = 10;
const TARGET_COUNT = 6;

const scoreEl = document.getElementById("score");
const shotsEl = document.getElementById("shots");
const hitsEl = document.getElementById("hits");
const cooldownEl = document.getElementById("cooldown");
const gridEl = document.getElementById("grid");
const formEl = document.getElementById("strike-form");
const coordInput = document.getElementById("coord-input");
const fireBtn = document.getElementById("fire-btn");
const scanBtn = document.getElementById("scan-btn");
const logEl = document.getElementById("log");

const state = {
  score: 0,
  shots: 0,
  hits: 0,
  round: 1,
  targets: new Set(),
  resolved: new Set(),
  cooldownUntil: 0
};

function coordToId(row, col) {
  return `${row}${col}`;
}

function parseCoordinate(input) {
  const clean = input.trim().toUpperCase().replace(/\s+/g, "");
  const match = clean.match(/^([A-J])(10|[1-9])$/);
  if (!match) return null;
  return coordToId(match[1], Number(match[2]));
}

function buildGrid() {
  gridEl.innerHTML = "";
  for (const row of ROWS) {
    for (let col = 1; col <= COLS; col += 1) {
      const id = coordToId(row, col);
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.id = id;
      cell.textContent = id;
      cell.addEventListener("click", () => {
        coordInput.value = id;
        coordInput.focus();
      });
      gridEl.appendChild(cell);
    }
  }
}

function pickTargets() {
  state.targets.clear();
  while (state.targets.size < TARGET_COUNT) {
    const row = ROWS[Math.floor(Math.random() * ROWS.length)];
    const col = 1 + Math.floor(Math.random() * COLS);
    state.targets.add(coordToId(row, col));
  }
}

function addLog(message) {
  const li = document.createElement("li");
  li.textContent = message;
  logEl.prepend(li);
  while (logEl.children.length > 14) {
    logEl.removeChild(logEl.lastChild);
  }
}

function markCell(id, className) {
  const cell = gridEl.querySelector(`[data-id="${id}"]`);
  if (!cell) return;
  cell.classList.add(className);
}

function resetGridMarks() {
  gridEl.querySelectorAll(".cell").forEach((el) => {
    el.classList.remove("hit", "miss", "target-reveal");
  });
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  shotsEl.textContent = String(state.shots);
  hitsEl.textContent = String(state.hits);
}

function tickCooldown() {
  const now = Date.now();
  const remain = Math.max(0, state.cooldownUntil - now);

  if (remain > 0) {
    const sec = (remain / 1000).toFixed(1);
    cooldownEl.textContent = `${sec}s`;
    fireBtn.disabled = true;
  } else {
    cooldownEl.textContent = "Ready";
    fireBtn.disabled = false;
  }
}

function launchStrike(raw) {
  const id = parseCoordinate(raw);
  if (!id) {
    addLog("Invalid coordinate. Use A1 to J10 format.");
    return;
  }

  if (state.resolved.has(id)) {
    addLog(`${id}: already engaged.`);
    return;
  }

  if (Date.now() < state.cooldownUntil) {
    addLog("Launcher cooling down.");
    return;
  }

  state.shots += 1;
  state.resolved.add(id);
  state.cooldownUntil = Date.now() + 1200;

  if (state.targets.has(id)) {
    state.hits += 1;
    state.score += 120;
    markCell(id, "hit");
    addLog(`${id}: direct hit.`);
  } else {
    state.score = Math.max(0, state.score - 15);
    markCell(id, "miss");
    addLog(`${id}: miss.`);
  }

  if (state.hits % TARGET_COUNT === 0) {
    state.round += 1;
    state.score += 250;
    addLog(`Round ${state.round - 1} cleared. New scan started.`);
    startRound();
    return;
  }

  updateHud();
}

function revealTargets() {
  state.targets.forEach((id) => {
    if (!state.resolved.has(id)) markCell(id, "target-reveal");
  });
}

function startRound() {
  state.targets.clear();
  state.resolved.clear();
  pickTargets();
  resetGridMarks();
  updateHud();
  coordInput.value = "";
  revealTargets();
}

buildGrid();
startRound();
addLog("Simulation online. Enter a coordinate and launch.");

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  launchStrike(coordInput.value);
  coordInput.select();
});

scanBtn.addEventListener("click", () => {
  state.score = Math.max(0, state.score - 40);
  addLog("Manual scan requested. Score -40.");
  startRound();
});

setInterval(tickCooldown, 100);
updateHud();
