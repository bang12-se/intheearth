const TARGET_COUNT = 6;
const DETECT_KM = 220;

const scoreEl = document.getElementById("score");
const shotsEl = document.getElementById("shots");
const hitsEl = document.getElementById("hits");
const cooldownEl = document.getElementById("cooldown");
const formEl = document.getElementById("strike-form");
const coordInput = document.getElementById("coord-input");
const fireBtn = document.getElementById("fire-btn");
const scanBtn = document.getElementById("scan-btn");
const logEl = document.getElementById("log");
const nodeListEl = document.getElementById("node-list");
const canvas = document.getElementById("globe-canvas");
const ctx = canvas.getContext("2d");

const dpr = window.devicePixelRatio || 1;
const state = {
  score: 0,
  scans: 0,
  detections: 0,
  round: 1,
  nodes: [],
  cooldownUntil: 0,
  yaw: -0.5,
  pitch: -0.2,
  dragging: false,
  lastX: 0,
  lastY: 0
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setupCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

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

function addLog(message, isAlert = false) {
  const li = document.createElement("li");
  li.textContent = message;
  if (isAlert) li.classList.add("log-alert");
  logEl.prepend(li);
  while (logEl.children.length > 14) {
    logEl.removeChild(logEl.lastChild);
  }
}

function latLonToVec(lat, lon) {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  return {
    x: Math.cos(latR) * Math.cos(lonR),
    y: Math.sin(latR),
    z: Math.cos(latR) * Math.sin(lonR)
  };
}

function rotateVec(v) {
  const cy = Math.cos(state.yaw);
  const sy = Math.sin(state.yaw);
  const cp = Math.cos(state.pitch);
  const sp = Math.sin(state.pitch);

  const x1 = v.x * cy - v.z * sy;
  const z1 = v.x * sy + v.z * cy;
  const y1 = v.y;

  return {
    x: x1,
    y: y1 * cp - z1 * sp,
    z: y1 * sp + z1 * cp
  };
}

function drawGlobe() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.46;

  ctx.clearRect(0, 0, width, height);

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#06273a";
  ctx.fill();

  const shade = ctx.createRadialGradient(
    cx - radius * 0.35,
    cy - radius * 0.4,
    radius * 0.2,
    cx,
    cy,
    radius * 1.15
  );
  shade.addColorStop(0, "#2f87ae");
  shade.addColorStop(1, "#02111b");
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = "rgba(190, 230, 255, 0.22)";
  ctx.lineWidth = 1;

  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    let started = false;
    for (let lon = -180; lon <= 180; lon += 4) {
      const p = rotateVec(latLonToVec(lat, lon));
      if (p.z <= 0) {
        started = false;
        continue;
      }
      const x = cx + p.x * radius;
      const y = cy - p.y * radius;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  for (let lon = -150; lon <= 180; lon += 30) {
    ctx.beginPath();
    let started = false;
    for (let lat = -90; lat <= 90; lat += 3) {
      const p = rotateVec(latLonToVec(lat, lon));
      if (p.z <= 0) {
        started = false;
        continue;
      }
      const x = cx + p.x * radius;
      const y = cy - p.y * radius;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  state.nodes.forEach((node) => {
    const p = rotateVec(latLonToVec(node.lat, node.lon));
    if (p.z <= 0) return;

    const x = cx + p.x * radius;
    const y = cy - p.y * radius;
    const size = node.detected ? 6 : 4;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = node.detected ? "#5ce1b9" : "#9de2ff";
    ctx.fill();

    if (node.detected) {
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(92, 225, 185, 0.55)";
      ctx.stroke();
    }
  });

  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(170, 220, 255, 0.5)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

function renderNodeList() {
  nodeListEl.innerHTML = "";
  state.nodes.forEach((node, idx) => {
    const li = document.createElement("li");
    const status = node.detected ? "detected" : "searching";
    li.textContent = `N${idx + 1} | ${status} | ${node.lat.toFixed(2)}, ${node.lon.toFixed(2)}`;
    if (node.detected) li.classList.add("detected");
    nodeListEl.appendChild(li);
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
  renderNodeList();
  drawGlobe();
  coordInput.value = "";
}

function runScan(rawInput) {
  const probe = parseLatLon(rawInput);
  if (!probe) {
    addLog("잘못된 좌표 형식입니다. 예: 37.5665, 126.9780", true);
    return;
  }

  if (Date.now() < state.cooldownUntil) {
    addLog("스캐너 쿨다운 중입니다.", true);
    return;
  }

  state.scans += 1;
  state.cooldownUntil = Date.now() + 1200;

  let nearest = null;
  let nearestIndex = -1;

  state.nodes.forEach((node, idx) => {
    if (node.detected) return;
    const d = haversineKm(probe, node);
    if (nearest === null || d < nearest) {
      nearest = d;
      nearestIndex = idx;
    }
  });

  if (nearest !== null && nearest <= DETECT_KM) {
    const node = state.nodes[nearestIndex];
    node.detected = true;
    state.detections += 1;
    const gained = Math.max(60, Math.round(250 - nearest));
    state.score += gained;
    addLog(`탐지 성공 N${nearestIndex + 1} | 거리 ${nearest.toFixed(1)}km | +${gained}`);
  } else {
    state.score = Math.max(0, state.score - 20);
    addLog(`미탐지 | 최근접 ${nearest === null ? "-" : `${nearest.toFixed(1)}km`}`, true);
  }

  if (state.nodes.every((n) => n.detected)) {
    state.round += 1;
    state.score += 300;
    addLog(`라운드 ${state.round - 1} 완료, 다음 스윕 시작.`);
    newRound();
  }

  updateHud();
  renderNodeList();
  drawGlobe();
}

function handlePointerDown(event) {
  state.dragging = true;
  canvas.classList.add("dragging");
  state.lastX = event.clientX;
  state.lastY = event.clientY;
}

function handlePointerMove(event) {
  if (!state.dragging) return;
  const dx = event.clientX - state.lastX;
  const dy = event.clientY - state.lastY;
  state.lastX = event.clientX;
  state.lastY = event.clientY;

  state.yaw += dx * 0.007;
  state.pitch = clamp(state.pitch + dy * 0.005, -1.2, 1.2);
  drawGlobe();
}

function handlePointerUp() {
  state.dragging = false;
  canvas.classList.remove("dragging");
}

function initEvents() {
  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    runScan(coordInput.value);
    coordInput.select();
  });

  scanBtn.addEventListener("click", () => {
    state.score = Math.max(0, state.score - 50);
    addLog("수동 스윕 실행. 점수 -50", true);
    newRound();
    updateHud();
  });

  canvas.addEventListener("pointerdown", handlePointerDown);
  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("resize", () => {
    setupCanvasSize();
    drawGlobe();
  });
}

setupCanvasSize();
initEvents();
newRound();
updateHud();
addLog("Tracker online. 지구를 드래그해 회전하고 좌표를 스캔하세요.");
setInterval(tickCooldown, 100);
