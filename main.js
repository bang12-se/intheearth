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
const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
const tiltUpBtn = document.getElementById("tilt-up");
const tiltDownBtn = document.getElementById("tilt-down");
const compassBtn = document.getElementById("compass-btn");
const compassNeedle = document.getElementById("compass-needle");
const resetViewBtn = document.getElementById("reset-view");
const viewCoordEl = document.getElementById("view-coord");
const viewZoomEl = document.getElementById("view-zoom");
const viewHeadingEl = document.getElementById("view-heading");
const viewTiltEl = document.getElementById("view-tilt");
const viewAltEl = document.getElementById("view-alt");
const logEl = document.getElementById("log");
const nodeListEl = document.getElementById("node-list");
const canvas = document.getElementById("globe-canvas");
const ctx = canvas.getContext("2d");
const stageEl = document.querySelector(".globe-stage");
const topBarEl = document.querySelector(".top-bar");
const leftPanelEl = document.querySelector(".left-panel");
const mapToolsEl = document.querySelector(".map-tools");
const statusBarEl = document.querySelector(".status-bar");
const contentCardEls = Array.from(document.querySelectorAll(".content-card"));

const dpr = window.devicePixelRatio || 1;
const state = {
  score: 0,
  scans: 0,
  detections: 0,
  round: 1,
  nodes: [],
  cooldownUntil: 0,
  yaw: -0.5,
  pitch: -0.58,
  zoom: 0.9,
  dragging: false,
  lastX: 0,
  lastY: 0,
  cloudShift: 0,
  hoverLat: null,
  hoverLon: null,
  stars: [],
  starFieldWidth: 0,
  starFieldHeight: 0
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setupCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(260, Math.round(rect.width));
  const cssHeight = Math.max(260, Math.round(rect.height || rect.width));

  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (
    state.starFieldWidth !== cssWidth ||
    state.starFieldHeight !== cssHeight ||
    state.stars.length === 0
  ) {
    state.starFieldWidth = cssWidth;
    state.starFieldHeight = cssHeight;
    initStarField(cssWidth, cssHeight);
  }
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

function inverseRotateVec(v) {
  const cp = Math.cos(-state.pitch);
  const sp = Math.sin(-state.pitch);
  const y1 = v.y * cp - v.z * sp;
  const z1 = v.y * sp + v.z * cp;
  const x1 = v.x;

  const cy = Math.cos(-state.yaw);
  const sy = Math.sin(-state.yaw);
  return {
    x: x1 * cy - z1 * sy,
    y: y1,
    z: x1 * sy + z1 * cy
  };
}

function normalize(v) {
  const m = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / m, y: v.y / m, z: v.z / m };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function initStarField(width, height) {
  const area = width * height;
  const count = Math.max(180, Math.floor(area / 2400));
  state.stars = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 0.35 + Math.random() * 1.7,
    a: 0.16 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2
  }));
}

function getViewCenter(width, height) {
  return {
    cx: width * 0.64,
    cy: height * 0.57
  };
}

function getViewRadius(width, height) {
  return Math.min(width, height) * 0.32 * state.zoom;
}

function drawSpaceBackground(width, height, now, cx, cy, radius) {
  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#03070e");
  bg.addColorStop(0.55, "#040b15");
  bg.addColorStop(1, "#02050d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const nebulaA = ctx.createRadialGradient(width * 0.18, height * 0.24, 20, width * 0.18, height * 0.24, width * 0.42);
  nebulaA.addColorStop(0, "rgba(80, 122, 199, 0.22)");
  nebulaA.addColorStop(1, "rgba(80, 122, 199, 0)");
  ctx.fillStyle = nebulaA;
  ctx.fillRect(0, 0, width, height);

  const nebulaB = ctx.createRadialGradient(width * 0.82, height * 0.74, 10, width * 0.82, height * 0.74, width * 0.32);
  nebulaB.addColorStop(0, "rgba(43, 135, 174, 0.18)");
  nebulaB.addColorStop(1, "rgba(43, 135, 174, 0)");
  ctx.fillStyle = nebulaB;
  ctx.fillRect(0, 0, width, height);

  for (const star of state.stars) {
    const twinkle = 0.7 + 0.3 * Math.sin(now * 0.001 + star.phase);
    ctx.globalAlpha = star.a * twinkle;
    ctx.fillStyle = "#d8ecff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const orbitGlow = ctx.createRadialGradient(cx, cy, radius * 1.2, cx, cy, radius * 2.25);
  orbitGlow.addColorStop(0, "rgba(49, 114, 153, 0.06)");
  orbitGlow.addColorStop(1, "rgba(49, 114, 153, 0)");
  ctx.fillStyle = orbitGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2.25, 0, Math.PI * 2);
  ctx.fill();
}

function updateStatusBar() {
  const latText =
    state.hoverLat === null ? "---" : `${state.hoverLat >= 0 ? "N" : "S"} ${Math.abs(state.hoverLat).toFixed(2)}°`;
  const lonText =
    state.hoverLon === null ? "---" : `${state.hoverLon >= 0 ? "E" : "W"} ${Math.abs(state.hoverLon).toFixed(2)}°`;

  viewCoordEl.textContent = `Lat ${latText}, Lon ${lonText}`;
  viewZoomEl.textContent = `Zoom x${state.zoom.toFixed(2)}`;
  const heading = ((state.yaw * 180) / Math.PI) % 360;
  const headingNormalized = (heading + 360) % 360;
  const tiltDeg = clamp((Math.abs(state.pitch) * 180) / Math.PI, 0, 89);
  const altitudeKm = 23500 / Math.pow(state.zoom, 1.45);
  viewHeadingEl.textContent = `Heading ${headingNormalized.toFixed(1)}°`;
  viewTiltEl.textContent = `Tilt ${tiltDeg.toFixed(1)}°`;
  viewAltEl.textContent = `Alt ${Math.round(altitudeKm).toLocaleString()} km`;
  compassNeedle.style.setProperty("--heading", `${-headingNormalized}deg`);
}

function hash2(a, b) {
  const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

const CONTINENT_BLOBS = [
  { lat: 54, lon: -110, rx: 42, ry: 27, w: 1.35 }, // North America
  { lat: 38, lon: -96, rx: 30, ry: 20, w: 0.8 },
  { lat: 18, lon: -98, rx: 18, ry: 12, w: 0.75 }, // Mexico/Central
  { lat: 68, lon: -42, rx: 17, ry: 13, w: 0.95 }, // Greenland
  { lat: -15, lon: -60, rx: 26, ry: 33, w: 1.2 }, // South America
  { lat: -40, lon: -66, rx: 13, ry: 17, w: 0.85 },
  { lat: 8, lon: 20, rx: 26, ry: 34, w: 1.35 }, // Africa
  { lat: 27, lon: 18, rx: 22, ry: 14, w: 0.8 },
  { lat: 48, lon: 32, rx: 36, ry: 18, w: 1.1 }, // Europe + West Asia
  { lat: 48, lon: 82, rx: 74, ry: 28, w: 1.4 }, // Siberia
  { lat: 22, lon: 78, rx: 17, ry: 13, w: 0.95 }, // India
  { lat: 29, lon: 110, rx: 24, ry: 16, w: 1.1 }, // China
  { lat: -4, lon: 118, rx: 19, ry: 11, w: 0.8 }, // Indonesia
  { lat: -24, lon: 134, rx: 20, ry: 13, w: 1.05 }, // Australia
  { lat: -43, lon: 171, rx: 8, ry: 7, w: 0.55 }, // New Zealand
  { lat: -76, lon: 10, rx: 160, ry: 11, w: 1.8 } // Antarctica
];

function lonDistance(a, b) {
  let d = Math.abs(a - b);
  if (d > 180) d = 360 - d;
  return d;
}

function baseRelief(lat, lon) {
  return (
    Math.sin((lon + 25) * 0.12) * Math.cos((lat - 7) * 0.1) * 0.22 +
    Math.sin((lon - lat * 0.9) * 0.19) * 0.16 +
    Math.cos((lon * 0.09 + lat * 0.13) * Math.PI) * 0.09
  );
}

function continentMask(lat, lon) {
  let m = -0.82;
  for (const blob of CONTINENT_BLOBS) {
    const dx = lonDistance(lon, blob.lon) / blob.rx;
    const dy = (lat - blob.lat) / blob.ry;
    const d = dx * dx + dy * dy;
    m += Math.exp(-d * 1.85) * blob.w;
  }

  m += baseRelief(lat, lon);
  return m;
}

function terrainDetail(lat, lon) {
  const c = continentMask(lat, lon);
  const polar = Math.abs(lat) > 68;
  const seaLevel = 0.05;
  const isLand = c > seaLevel;
  const coastness = 1 - clamp(Math.abs(c - seaLevel) * 2.5, 0, 1);
  const mountain = clamp(
    Math.sin((lon + lat * 1.7) * 0.2) * 0.5 +
      Math.cos((lon * 0.18 - lat * 0.33) * Math.PI) * 0.32 +
      (c - 0.42),
    -1,
    1
  );

  return {
    c,
    polar,
    isLand,
    coastness,
    mountain
  };
}

function cloudNoise(lat, lon) {
  const n1 = Math.sin((lon + 40) * 0.16) * Math.cos(lat * 0.18);
  const n2 = Math.sin((lon - lat * 1.4) * 0.23) * 0.65;
  const n3 = Math.cos((lon + lat) * 0.31) * 0.5;
  return (n1 + n2 + n3) / 2.15;
}

function drawGlobe() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const { cx, cy } = getViewCenter(width, height);
  const radius = getViewRadius(width, height);
  const nowMs = Date.now();
  const now = nowMs * 0.00008;
  const sun = normalize({
    x: Math.cos(now),
    y: 0.32,
    z: Math.sin(now)
  });

  drawSpaceBackground(width, height, nowMs, cx, cy, radius);

  const halo = ctx.createRadialGradient(cx, cy, radius * 0.96, cx, cy, radius * 1.22);
  halo.addColorStop(0, "rgba(93, 190, 255, 0.12)");
  halo.addColorStop(1, "rgba(93, 190, 255, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = "#031521";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  for (let lat = -88; lat <= 88; lat += 2.8) {
    for (let lon = -180; lon <= 180; lon += 2.8) {
      const rotated = rotateVec(latLonToVec(lat, lon));
      if (rotated.z <= 0) continue;

      const x = cx + rotated.x * radius;
      const y = cy - rotated.y * radius;

      const detail = terrainDetail(lat, lon);

      const light = clamp(dot(rotated, sun) * 0.85 + 0.15, 0.08, 1);
      let r;
      let g;
      let b;

      if (detail.polar) {
        const iceMix = clamp((Math.abs(lat) - 64) / 24, 0, 1);
        r = 206 + 33 * iceMix;
        g = 224 + 25 * iceMix;
        b = 232 + 18 * iceMix;
      } else if (detail.isLand) {
        const humid = clamp(1 - Math.abs(lat) / 52, 0, 1);
        const aridBelt = clamp(1 - Math.abs(Math.abs(lat) - 24) / 10, 0, 1);
        const mountain = clamp((detail.mountain + 0.4) / 1.4, 0, 1);
        const coastBoost = detail.coastness * 0.45;

        r = 55 + humid * 16 + aridBelt * 34 + mountain * 45 + coastBoost * 14;
        g = 92 + humid * 82 + mountain * 22 - aridBelt * 8 + coastBoost * 16;
        b = 44 + humid * 28 + mountain * 14 - aridBelt * 7;
      } else {
        const depth = clamp((0.12 - detail.c) * 0.95, 0, 1);
        const shelf = detail.coastness;
        r = 8 + shelf * 20 + (1 - depth) * 6;
        g = 47 + shelf * 58 + (1 - depth) * 26;
        b = 82 + shelf * 92 + (1 - depth) * 70;
      }

      if (!detail.polar && !detail.isLand) {
        const latBand = 1 - Math.min(1, Math.abs(lat) / 90);
        g += 14 * latBand;
        b += 10 * latBand;
      }

      ctx.fillStyle = `rgb(${Math.round(r * light)}, ${Math.round(g * light)}, ${Math.round(b * light)})`;
      const size = 1.35 + rotated.z * 1.05;
      ctx.fillRect(x, y, size, size);

      const nightFactor = clamp(0.36 - dot(rotated, sun), 0, 0.36) / 0.36;
      if (nightFactor > 0.65 && detail.isLand && !detail.polar && hash2(lat, lon) > 0.964) {
        ctx.fillStyle = `rgba(255, 206, 117, ${0.22 + nightFactor * 0.5})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
  }

  const cloudDrift = state.cloudShift * 20;
  for (let lat = -85; lat <= 85; lat += 4.4) {
    for (let lon = -180; lon <= 180; lon += 4.4) {
      const mapLon = lon + cloudDrift;
      const c = cloudNoise(lat, mapLon);
      if (c < 0.36) continue;

      const rotated = rotateVec(latLonToVec(lat, lon));
      if (rotated.z <= 0) continue;

      const x = cx + rotated.x * radius;
      const y = cy - rotated.y * radius;
      const light = clamp(dot(rotated, sun) * 0.75 + 0.2, 0.12, 1);
      const alpha = clamp((c - 0.36) * 0.8, 0.05, 0.24) * light;
      ctx.fillStyle = `rgba(235, 246, 255, ${alpha})`;
      const size = 1.8 + rotated.z * 1.25;
      ctx.fillRect(x, y, size, size);
    }
  }

  const shadow = ctx.createRadialGradient(
    cx + sun.x * radius * -0.35,
    cy - sun.y * radius * -0.35,
    radius * 0.25,
    cx,
    cy,
    radius * 1.05
  );
  shadow.addColorStop(0, "rgba(0, 0, 0, 0)");
  shadow.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  ctx.fillStyle = shadow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  state.nodes.forEach((node) => {
    const p = rotateVec(latLonToVec(node.lat, node.lon));
    if (p.z <= 0) return;

    const x = cx + p.x * radius;
    const y = cy - p.y * radius;
    const size = node.detected ? 4.6 : 3.2;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = node.detected ? "#6df2c8" : "#b2ebff";
    ctx.fill();

    if (node.detected) {
      ctx.beginPath();
      ctx.arc(x, y, 10.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(109, 242, 200, 0.5)";
      ctx.stroke();
    }
  });

  ctx.restore();

  const glare = ctx.createRadialGradient(
    cx + sun.x * radius * 0.55,
    cy - sun.y * radius * 0.55,
    radius * 0.08,
    cx + sun.x * radius * 0.55,
    cy - sun.y * radius * 0.55,
    radius * 0.65
  );
  glare.addColorStop(0, "rgba(240, 251, 255, 0.2)");
  glare.addColorStop(1, "rgba(240, 251, 255, 0)");
  ctx.fillStyle = glare;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(170, 228, 255, 0.6)";
  ctx.lineWidth = 1.1;
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

function setZoom(nextZoom) {
  state.zoom = clamp(nextZoom, 0.6, 1.55);
  updateStatusBar();
}

function updateHoverCoordinate(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const { cx, cy } = getViewCenter(rect.width, rect.height);
  const radius = getViewRadius(rect.width, rect.height);

  const nx = (x - cx) / radius;
  const ny = (cy - y) / radius;
  const r2 = nx * nx + ny * ny;

  if (r2 > 1) {
    state.hoverLat = null;
    state.hoverLon = null;
    updateStatusBar();
    return;
  }

  const nz = Math.sqrt(Math.max(0, 1 - r2));
  const world = inverseRotateVec({ x: nx, y: ny, z: nz });
  const lat = (Math.asin(clamp(world.y, -1, 1)) * 180) / Math.PI;
  const lon = (Math.atan2(world.z, world.x) * 180) / Math.PI;

  state.hoverLat = lat;
  state.hoverLon = lon;
  updateStatusBar();
}

function handlePointerDown(event) {
  state.dragging = true;
  canvas.classList.add("dragging");
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  updateHoverCoordinate(event.clientX, event.clientY);
}

function handlePointerMove(event) {
  if (state.dragging) {
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.lastX = event.clientX;
    state.lastY = event.clientY;

    state.yaw -= dx * 0.007;
    state.pitch = clamp(state.pitch + dy * 0.005, -1.2, 1.2);
    drawGlobe();
  }
  updateHoverCoordinate(event.clientX, event.clientY);
}

function handlePointerUp() {
  state.dragging = false;
  canvas.classList.remove("dragging");
}

function applyUiDepth(nx, ny) {
  const shiftX = nx * 12;
  const shiftY = ny * 8;

  if (stageEl) {
    stageEl.style.transform = `rotateX(${(-ny * 1.5).toFixed(2)}deg) rotateY(${(nx * 2.1).toFixed(2)}deg)`;
  }
  if (topBarEl) {
    topBarEl.style.transform = `translate3d(${shiftX.toFixed(1)}px, ${(-shiftY * 0.45).toFixed(1)}px, 22px)`;
  }
  if (leftPanelEl) {
    leftPanelEl.style.transform = `translate3d(${(-shiftX * 0.9).toFixed(1)}px, ${(-shiftY * 0.75).toFixed(1)}px, 36px) rotateX(${(-ny * 2.4).toFixed(2)}deg) rotateY(${(2.4 + nx * 4.5).toFixed(2)}deg)`;
  }
  if (mapToolsEl) {
    mapToolsEl.style.transform = `translate3d(${(shiftX * 0.8).toFixed(1)}px, ${(-shiftY * 0.7).toFixed(1)}px, 32px) rotateX(${(-ny * 2.2).toFixed(2)}deg) rotateY(${(-2 + nx * 4).toFixed(2)}deg)`;
  }
  if (statusBarEl) {
    statusBarEl.style.transform = `translate3d(${(-shiftX * 0.35).toFixed(1)}px, ${(-shiftY * 0.35).toFixed(1)}px, 26px) rotateX(${(-ny * 1.5).toFixed(2)}deg)`;
  }

  contentCardEls.forEach((card, idx) => {
    const depth = 8 + idx * 0.8;
    card.style.transform = `translate3d(${(-shiftX * 0.25).toFixed(1)}px, ${(-shiftY * 0.25).toFixed(1)}px, ${depth.toFixed(1)}px) rotateX(${(1.4 - ny * 1.2).toFixed(2)}deg) rotateY(${(nx * 1.4).toFixed(2)}deg)`;
  });
}

function initUiParallax() {
  if (!stageEl || window.matchMedia("(pointer: coarse)").matches) return;

  applyUiDepth(0, 0);

  const applyParallax = (clientX, clientY) => {
    const rect = stageEl.getBoundingClientRect();
    const nx = clamp((clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
    const ny = clamp((clientY - rect.top) / rect.height, 0, 1) * 2 - 1;
    applyUiDepth(nx, ny);
  };

  stageEl.addEventListener("pointermove", (event) => {
    applyParallax(event.clientX, event.clientY);
  });

  stageEl.addEventListener("pointerleave", () => {
    applyUiDepth(0, 0);
  });
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
  canvas.addEventListener("pointerenter", (event) => {
    updateHoverCoordinate(event.clientX, event.clientY);
  });
  canvas.addEventListener("pointerleave", () => {
    state.hoverLat = null;
    state.hoverLon = null;
    updateStatusBar();
  });
  canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.08 : 0.08;
      setZoom(state.zoom + delta);
      drawGlobe();
    },
    { passive: false }
  );

  zoomInBtn.addEventListener("click", () => {
    setZoom(state.zoom + 0.12);
    drawGlobe();
  });

  zoomOutBtn.addEventListener("click", () => {
    setZoom(state.zoom - 0.12);
    drawGlobe();
  });

  tiltUpBtn.addEventListener("click", () => {
    state.pitch = clamp(state.pitch - 0.08, -1.25, 1.25);
    updateStatusBar();
    drawGlobe();
  });

  tiltDownBtn.addEventListener("click", () => {
    state.pitch = clamp(state.pitch + 0.08, -1.25, 1.25);
    updateStatusBar();
    drawGlobe();
  });

  compassBtn.addEventListener("click", () => {
    state.yaw = 0;
    updateStatusBar();
    drawGlobe();
  });

  resetViewBtn.addEventListener("click", () => {
    state.yaw = -0.5;
    state.pitch = -0.58;
    setZoom(0.9);
    updateStatusBar();
    drawGlobe();
  });

  window.addEventListener("pointermove", handlePointerMove);
  window.addEventListener("pointerup", handlePointerUp);
  window.addEventListener("pointercancel", handlePointerUp);
  window.addEventListener("resize", () => {
    setupCanvasSize();
    drawGlobe();
  });

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(() => {
      setupCanvasSize();
      drawGlobe();
    });
    observer.observe(canvas);
  }
}

function animate() {
  if (!state.dragging) {
    state.yaw += 0.00035;
  }
  state.cloudShift = (state.cloudShift + 0.00065) % (Math.PI * 2);
  drawGlobe();
  requestAnimationFrame(animate);
}

initEvents();
initUiParallax();
newRound();
updateHud();
updateStatusBar();
addLog("Tracker online. 지구를 드래그해 회전하고 좌표를 스캔하세요.");
setInterval(tickCooldown, 100);
requestAnimationFrame(() => {
  setupCanvasSize();
  drawGlobe();
  requestAnimationFrame(animate);
});
