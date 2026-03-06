const TARGET_COUNT = 6;
const DETECT_KM = 220;

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
  scans: 0,
  detections: 0,
  round: 1,
  nodes: [],
  cooldownUntil: 0
};

function parseLatLon(input) {
  const match = input
    .trim()
    .match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lon = Number(match[2]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

  return { lat, lon };
}

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * r * Math.asin(Math.sqrt(h));
}

function addLog(message) {
  const li = document.createElement("li");
  li.textContent = message;
  logEl.prepend(li);
  while (logEl.children.length > 14) {
    logEl.removeChild(logEl.lastChild);
  }
}

function renderGrid() {
  gridEl.innerHTML = "";
  state.nodes.forEach((node, i) => {
    const item = document.createElement("div");
    item.className = "cell";
    if (node.detected) item.classList.add("hit");
    item.textContent = `N${i + 1}`;
    gridEl.appendChild(item);
  });
}

function updateHud() {
  scoreEl.textContent = String(state.score);
  shotsEl.textContent = String(state.scans);
  hitsEl.textContent = String(state.detections);
}

function tickCooldown() {
  const remain = Math.max(0, state.cooldownUntil - Date.now());
  if (remain > 0) {
    cooldownEl.textContent = `${(remain / 1000).toFixed(1)}s`;
    fireBtn.disabled = true;
  } else {
    cooldownEl.textContent = "Ready";
    fireBtn.disabled = false;
  }
}

function newRound() {
  state.nodes = Array.from({ length: TARGET_COUNT }, () => ({
    lat: -70 + Math.random() * 140,
    lon: -180 + Math.random() * 360,
    detected: false
  }));
  renderGrid();
  updateHud();
  coordInput.value = "";
}

function runScan(rawInput) {
  const probe = parseLatLon(rawInput);
  if (!probe) {
    addLog("잘못된 좌표입니다. 위도,경도 형식으로 입력하세요.");
    return;
  }

  if (Date.now() < state.cooldownUntil) {
    addLog("스캐너 쿨다운 중입니다.");
    return;
  }

  state.scans += 1;
  state.cooldownUntil = Date.now() + 1200;

  let nearest = null;
  let nearestIndex = -1;

  state.nodes.forEach((node, idx) => {
    if (node.detected) return;
    const d = haversineKm(probe, node);
    if (!nearest || d < nearest) {
      nearest = d;
      nearestIndex = idx;
    }
  });

  if (nearest !== null && nearest <= DETECT_KM) {
    state.nodes[nearestIndex].detected = true;
    state.detections += 1;
    const gained = Math.max(60, Math.round(250 - nearest));
    state.score += gained;
    addLog(
      `탐지 성공: N${nearestIndex + 1} (${nearest.toFixed(1)}km), +${gained}점`
    );
  } else {
    state.score = Math.max(0, state.score - 20);
    const text = nearest === null ? "-" : `${nearest.toFixed(1)}km`;
    addLog(`신호 미탐지. 최근접 거리: ${text}`);
  }

  if (state.nodes.every((n) => n.detected)) {
    state.round += 1;
    state.score += 300;
    addLog(`라운드 ${state.round - 1} 완료. 다음 스윕 시작.`);
    newRound();
    return;
  }

  renderGrid();
  updateHud();
}

newRound();
addLog("Tracker online. 현실 좌표를 입력해 스캔하세요.");

formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  runScan(coordInput.value);
  coordInput.select();
});

scanBtn.addEventListener("click", () => {
  state.score = Math.max(0, state.score - 50);
  addLog("수동 스윕 실행. 점수 -50.");
  newRound();
});

setInterval(tickCooldown, 100);
updateHud();
