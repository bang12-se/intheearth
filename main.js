const TARGET_COUNT = 6;
const DETECT_KM = 220;

const scoreEl = document.getElementById("score");
const shotsEl = document.getElementById("shots");
const hitsEl = document.getElementById("hits");
const cooldownEl = document.getElementById("cooldown");
const formEl = document.getElementById("strike-form");
const planetSelectEl = document.getElementById("planet-select");
const fireBtn = document.getElementById("fire-btn");
const scanBtn = document.getElementById("scan-btn");
const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
const dragModeBtn = document.getElementById("drag-mode");
const cinemaModeBtn = document.getElementById("cinema-mode");
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
const planetInfoEl = document.getElementById("planet-info");
const statusBarEl = document.querySelector(".status-bar");
const contentCardEls = Array.from(document.querySelectorAll(".content-card"));
const missionTitleEl = document.getElementById("mission-title");
const missionSubEl = document.getElementById("mission-sub");
const viewTargetEl = document.getElementById("view-target");
const infoTypeEl = document.getElementById("info-type");
const infoRadiusEl = document.getElementById("info-radius");
const infoGravityEl = document.getElementById("info-gravity");
const infoDayEl = document.getElementById("info-day");
const infoYearEl = document.getElementById("info-year");
const infoMoonsEl = document.getElementById("info-moons");

const dpr = window.devicePixelRatio || 1;
const RENDER_THEME = "solar-smash";

function shouldUseLowPerf() {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
  const memory = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : null;
  const smallScreen = window.innerWidth < 860;

  if (reducedMotion) return true;
  if (coarsePointer && smallScreen && cores <= 4) return true;
  if (cores <= 2) return true;
  if (memory !== null && memory <= 2) return true;
  return false;
}

const state = {
  score: 0,
  scans: 0,
  detections: 0,
  round: 1,
  nodes: [],
  cooldownUntil: 0,
  yaw: -0.5,
  pitch: -0.58,
  bgYaw: 0,
  bgPitch: 0,
  zoom: 0.9,
  dragging: false,
  dragMode: "planet",
  lastX: 0,
  lastY: 0,
  cloudShift: 0,
  hoverLat: null,
  hoverLon: null,
  stars: [],
  starFieldWidth: 0,
  starFieldHeight: 0,
  renderScale: dpr,
  lastRenderTs: 0,
  lowPerf: shouldUseLowPerf(),
  currentPlanet: "earth",
  cinemaMode: false,
  impacts: [],
  pointerDownX: 0,
  pointerDownY: 0,
  dragDistance: 0
};

const PLANET_PRESETS = {
  sun: {
    label: "Sun",
    title: "Solar Core Observer",
    subtitle: "태양 표면 플라즈마 패턴을 관측합니다.",
    altitudeBase: 696340,
    spinSpeed: 0.0002,
    cloudSpeed: 0.0014,
    style: "sun",
    halo: ["rgba(255, 197, 102, 0.26)", "rgba(255, 197, 102, 0)"],
    ring: null,
    marker: "#ffd58b"
  },
  mercury: {
    label: "Mercury",
    title: "Mercury Recon Orbit",
    subtitle: "암석 지형과 충돌 분지를 가상 스캔합니다.",
    altitudeBase: 2440,
    spinSpeed: 0.00035,
    cloudSpeed: 0.00035,
    style: "rocky",
    palette: { a: [122, 116, 108], b: [84, 78, 72], c: [146, 135, 122] },
    halo: ["rgba(196, 190, 178, 0.13)", "rgba(196, 190, 178, 0)"],
    ring: null,
    marker: "#cfd0d2"
  },
  venus: {
    label: "Venus",
    title: "Venus Atmosphere Track",
    subtitle: "두꺼운 대기층 아래 열 신호를 추적합니다.",
    altitudeBase: 6052,
    spinSpeed: 0.00024,
    cloudSpeed: 0.001,
    style: "venus",
    palette: { a: [223, 170, 95], b: [167, 117, 61], c: [238, 201, 134] },
    halo: ["rgba(255, 197, 128, 0.17)", "rgba(255, 197, 128, 0)"],
    ring: null,
    marker: "#ffd597"
  },
  earth: {
    label: "Earth",
    title: "Earth From Space",
    subtitle: "우주에서 지구를 바라보는 탐색 화면입니다. 드래그와 줌으로 자유롭게 둘러보세요.",
    altitudeBase: 6371,
    spinSpeed: 0.00035,
    cloudSpeed: 0.00065,
    style: "earth",
    halo: ["rgba(93, 190, 255, 0.12)", "rgba(93, 190, 255, 0)"],
    ring: null,
    marker: "#6df2c8"
  },
  mars: {
    label: "Mars",
    title: "Mars Surface Sweep",
    subtitle: "건조한 협곡 지형과 분화구 지대를 탐사합니다.",
    altitudeBase: 3390,
    spinSpeed: 0.0004,
    cloudSpeed: 0.0003,
    style: "mars",
    palette: { a: [177, 90, 56], b: [120, 54, 35], c: [212, 126, 84] },
    halo: ["rgba(219, 124, 85, 0.15)", "rgba(219, 124, 85, 0)"],
    ring: null,
    marker: "#ffbf96"
  },
  jupiter: {
    label: "Jupiter",
    title: "Jupiter Storm Monitor",
    subtitle: "거대 가스 대기의 밴드와 폭풍 패턴을 관측합니다.",
    altitudeBase: 69911,
    spinSpeed: 0.00065,
    cloudSpeed: 0.001,
    style: "gas",
    palette: { a: [215, 173, 132], b: [171, 129, 94], c: [233, 205, 169] },
    halo: ["rgba(232, 195, 152, 0.14)", "rgba(232, 195, 152, 0)"],
    ring: null,
    marker: "#ffe0b1"
  },
  saturn: {
    label: "Saturn",
    title: "Saturn Ring Station",
    subtitle: "토성 대기층과 고리 단면을 추적합니다.",
    altitudeBase: 58232,
    spinSpeed: 0.00055,
    cloudSpeed: 0.0009,
    style: "gas",
    palette: { a: [226, 200, 150], b: [176, 147, 101], c: [242, 223, 186] },
    halo: ["rgba(243, 216, 173, 0.16)", "rgba(243, 216, 173, 0)"],
    ring: { inner: 1.16, outer: 1.52, color: "rgba(236, 206, 152, 0.44)" },
    marker: "#ffe3b4"
  },
  uranus: {
    label: "Uranus",
    title: "Uranus Polar Orbit",
    subtitle: "청록색 상층 대기와 극권 기류를 모니터링합니다.",
    altitudeBase: 25362,
    spinSpeed: 0.00043,
    cloudSpeed: 0.00075,
    style: "ice",
    palette: { a: [136, 212, 216], b: [96, 168, 178], c: [182, 232, 233] },
    halo: ["rgba(164, 223, 230, 0.16)", "rgba(164, 223, 230, 0)"],
    ring: { inner: 1.14, outer: 1.32, color: "rgba(176, 220, 226, 0.26)" },
    marker: "#bdf8ff"
  },
  neptune: {
    label: "Neptune",
    title: "Neptune Deep Blue View",
    subtitle: "심층 대기 밴드와 고속 바람권을 추적합니다.",
    altitudeBase: 24622,
    spinSpeed: 0.00048,
    cloudSpeed: 0.00085,
    style: "ice",
    palette: { a: [77, 117, 218], b: [49, 79, 168], c: [127, 160, 239] },
    halo: ["rgba(112, 151, 243, 0.17)", "rgba(112, 151, 243, 0)"],
    ring: null,
    marker: "#b7d2ff"
  },
  pluto: {
    label: "Pluto",
    title: "Pluto Dwarf Survey",
    subtitle: "왜소행성의 얼음 지형과 명암 대비를 스캔합니다.",
    altitudeBase: 1188,
    spinSpeed: 0.0003,
    cloudSpeed: 0.00024,
    style: "dwarf",
    palette: { a: [186, 163, 150], b: [125, 107, 98], c: [214, 195, 181] },
    halo: ["rgba(203, 184, 171, 0.14)", "rgba(203, 184, 171, 0)"],
    ring: null,
    marker: "#f0e0d2"
  }
};

const PLANET_INFO = {
  sun: { type: "G-type Star", gravity: "274 m/s²", day: "25-35 d", year: "-", moons: "0" },
  mercury: { type: "Rocky Planet", gravity: "3.7 m/s²", day: "58.6 d", year: "88 d", moons: "0" },
  venus: { type: "Rocky Planet", gravity: "8.87 m/s²", day: "243 d", year: "225 d", moons: "0" },
  earth: { type: "Rocky Planet", gravity: "9.8 m/s²", day: "24 h", year: "365 d", moons: "1" },
  mars: { type: "Rocky Planet", gravity: "3.71 m/s²", day: "24.6 h", year: "687 d", moons: "2" },
  jupiter: { type: "Gas Giant", gravity: "24.8 m/s²", day: "9.9 h", year: "11.86 y", moons: "95+" },
  saturn: { type: "Gas Giant", gravity: "10.4 m/s²", day: "10.7 h", year: "29.4 y", moons: "140+" },
  uranus: { type: "Ice Giant", gravity: "8.69 m/s²", day: "17.2 h", year: "84 y", moons: "27" },
  neptune: { type: "Ice Giant", gravity: "11.2 m/s²", day: "16.1 h", year: "164.8 y", moons: "14" },
  pluto: { type: "Dwarf Planet", gravity: "0.62 m/s²", day: "6.4 d", year: "248 y", moons: "5" }
};

const PLANET_SATELLITES = {
  sun: [
    { name: "Mercury", orbit: 1.4, size: 0.018, speed: 0.00018, phase: 0.1, color: "#b9aba1", incl: 0.12 },
    { name: "Venus", orbit: 1.62, size: 0.024, speed: 0.00014, phase: 1.2, color: "#dfb07b", incl: 0.07 },
    { name: "Earth", orbit: 1.88, size: 0.026, speed: 0.00011, phase: 2.2, color: "#7fb9ff", incl: 0.06 },
    { name: "Mars", orbit: 2.1, size: 0.021, speed: 0.00009, phase: 2.9, color: "#c37b57", incl: 0.11 }
  ],
  mercury: [
    { name: "Bepi", orbit: 1.42, size: 0.02, speed: 0.0018, phase: 0.7, color: "#d4d8df", incl: 0.2 }
  ],
  venus: [
    { name: "Akatsuki", orbit: 1.5, size: 0.021, speed: 0.00155, phase: 1.1, color: "#f2f3ff", incl: 0.16 }
  ],
  earth: [
    { name: "Moon", orbit: 1.58, size: 0.07, speed: 0.0013, phase: 0.4, color: "#d8dde4", incl: 0.18 }
  ],
  mars: [
    { name: "Phobos", orbit: 1.37, size: 0.03, speed: 0.0022, phase: 0.8, color: "#bca58f", incl: 0.16 },
    { name: "Deimos", orbit: 1.66, size: 0.024, speed: 0.0014, phase: 2.1, color: "#cfb7a2", incl: 0.12 }
  ],
  jupiter: [
    { name: "Io", orbit: 1.46, size: 0.038, speed: 0.0017, phase: 0.2, color: "#f0d58f", incl: 0.09 },
    { name: "Europa", orbit: 1.64, size: 0.034, speed: 0.00145, phase: 1.3, color: "#d9c8a8", incl: 0.11 },
    { name: "Ganymede", orbit: 1.86, size: 0.046, speed: 0.00118, phase: 2.3, color: "#b9a792", incl: 0.13 },
    { name: "Callisto", orbit: 2.08, size: 0.043, speed: 0.00092, phase: 3.1, color: "#8f7f6f", incl: 0.15 }
  ],
  saturn: [
    { name: "Titan", orbit: 1.7, size: 0.05, speed: 0.0011, phase: 0.3, color: "#d9bc8f", incl: 0.1 },
    { name: "Enceladus", orbit: 1.44, size: 0.027, speed: 0.00185, phase: 1.8, color: "#dce8f3", incl: 0.08 },
    { name: "Rhea", orbit: 1.92, size: 0.031, speed: 0.0013, phase: 2.7, color: "#c5baa8", incl: 0.12 }
  ],
  uranus: [
    { name: "Titania", orbit: 1.68, size: 0.039, speed: 0.00105, phase: 0.6, color: "#d6ecef", incl: 0.14 },
    { name: "Oberon", orbit: 1.92, size: 0.036, speed: 0.0009, phase: 2.4, color: "#c2dce0", incl: 0.13 }
  ],
  neptune: [
    { name: "Triton", orbit: 1.64, size: 0.043, speed: 0.0012, phase: 1.5, color: "#d4e5f7", incl: 0.18 }
  ],
  pluto: [
    { name: "Charon", orbit: 1.45, size: 0.06, speed: 0.00125, phase: 0.2, color: "#d8c9be", incl: 0.22 },
    { name: "Nix", orbit: 1.76, size: 0.025, speed: 0.00095, phase: 1.9, color: "#d9d4cd", incl: 0.18 },
    { name: "Hydra", orbit: 2.02, size: 0.023, speed: 0.0008, phase: 3.0, color: "#e7e1da", incl: 0.16 }
  ]
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRenderQuality() {
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const cores = typeof navigator.hardwareConcurrency === "number" ? navigator.hardwareConcurrency : 4;
  const memory = typeof navigator.deviceMemory === "number" ? navigator.deviceMemory : null;
  let quality = coarsePointer ? 1.22 : 1.72;
  if (!coarsePointer && cores >= 10) quality += 0.1;
  if (memory !== null && memory >= 8) quality += 0.08;
  if (cores <= 6) quality -= 0.12;
  if (memory !== null && memory <= 4) quality -= 0.12;
  if (window.innerWidth < 900) quality -= 0.1;
  if (!coarsePointer && window.innerWidth > 1400) quality += 0.08;
  return clamp(quality, 1.08, 2.8);
}

function setupCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(260, Math.round(rect.width));
  const cssHeight = Math.max(260, Math.round(rect.height || rect.width));
  state.lowPerf = shouldUseLowPerf();
  const targetScale = dpr * getRenderQuality();
  state.renderScale = targetScale;

  canvas.width = Math.round(cssWidth * targetScale);
  canvas.height = Math.round(cssHeight * targetScale);
  ctx.setTransform(targetScale, 0, 0, targetScale, 0, 0);

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
  const driftX = state.bgYaw * 120;
  const driftY = state.bgPitch * 95;

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#03070e");
  bg.addColorStop(0.55, "#040b15");
  bg.addColorStop(1, "#02050d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const nebulaAX = width * 0.18 + driftX * 0.35;
  const nebulaAY = height * 0.24 + driftY * 0.28;
  const nebulaA = ctx.createRadialGradient(nebulaAX, nebulaAY, 20, nebulaAX, nebulaAY, width * 0.42);
  nebulaA.addColorStop(0, "rgba(80, 122, 199, 0.22)");
  nebulaA.addColorStop(1, "rgba(80, 122, 199, 0)");
  ctx.fillStyle = nebulaA;
  ctx.fillRect(0, 0, width, height);

  const nebulaBX = width * 0.82 - driftX * 0.3;
  const nebulaBY = height * 0.74 - driftY * 0.24;
  const nebulaB = ctx.createRadialGradient(nebulaBX, nebulaBY, 10, nebulaBX, nebulaBY, width * 0.32);
  nebulaB.addColorStop(0, "rgba(43, 135, 174, 0.18)");
  nebulaB.addColorStop(1, "rgba(43, 135, 174, 0)");
  ctx.fillStyle = nebulaB;
  ctx.fillRect(0, 0, width, height);

  for (const star of state.stars) {
    const twinkle = 0.7 + 0.3 * Math.sin(now * 0.001 + star.phase);
    const x = ((star.x + driftX * 0.85) % width + width) % width;
    const y = ((star.y + driftY * 0.65) % height + height) % height;
    ctx.globalAlpha = star.a * twinkle;
    ctx.fillStyle = "#d8ecff";
    ctx.beginPath();
    ctx.arc(x, y, star.r, 0, Math.PI * 2);
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
  const planet = getCurrentPlanet();
  const latText =
    state.hoverLat === null ? "---" : `${state.hoverLat >= 0 ? "N" : "S"} ${Math.abs(state.hoverLat).toFixed(2)}°`;
  const lonText =
    state.hoverLon === null ? "---" : `${state.hoverLon >= 0 ? "E" : "W"} ${Math.abs(state.hoverLon).toFixed(2)}°`;

  viewCoordEl.textContent = `Lat ${latText}, Lon ${lonText}`;
  viewZoomEl.textContent = `Zoom x${state.zoom.toFixed(2)}`;
  const heading = ((state.yaw * 180) / Math.PI) % 360;
  const headingNormalized = (heading + 360) % 360;
  const tiltDeg = clamp((Math.abs(state.pitch) * 180) / Math.PI, 0, 89);
  const altitudeKm = (planet.altitudeBase * 4.1) / Math.pow(state.zoom, 1.35);
  viewHeadingEl.textContent = `Heading ${headingNormalized.toFixed(1)}°`;
  viewTiltEl.textContent = `Tilt ${tiltDeg.toFixed(1)}°`;
  viewAltEl.textContent = `Alt ${Math.round(altitudeKm).toLocaleString()} km`;
  viewTargetEl.textContent = `Target ${planet.label}`;
  compassNeedle.style.setProperty("--heading", `${-headingNormalized}deg`);
}

function applyPlanetInfo() {
  const planet = getCurrentPlanet();
  if (missionTitleEl) missionTitleEl.textContent = planet.title;
  if (missionSubEl) missionSubEl.textContent = planet.subtitle;
  updatePlanetInfoPanel();
}

function updatePlanetInfoPanel() {
  const preset = getCurrentPlanet();
  const meta = PLANET_INFO[state.currentPlanet] || PLANET_INFO.earth;
  if (!infoTypeEl) return;

  infoTypeEl.textContent = meta.type;
  infoRadiusEl.textContent = `${Math.round(preset.altitudeBase).toLocaleString()} km`;
  infoGravityEl.textContent = meta.gravity;
  infoDayEl.textContent = meta.day;
  infoYearEl.textContent = meta.year;
  infoMoonsEl.textContent = meta.moons;
}

function setCinemaMode(enabled, silent = false) {
  state.cinemaMode = Boolean(enabled);
  if (cinemaModeBtn) {
    cinemaModeBtn.classList.toggle("active", state.cinemaMode);
    cinemaModeBtn.textContent = state.cinemaMode ? "C*" : "C";
    cinemaModeBtn.setAttribute("aria-label", state.cinemaMode ? "Cinema mode on" : "Cinema mode off");
  }
  if (!silent) {
    addLog(state.cinemaMode ? "시네마 모드 활성화." : "시네마 모드 비활성화.");
  }
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

function getCurrentPlanet() {
  return PLANET_PRESETS[state.currentPlanet] || PLANET_PRESETS.earth;
}

function mix(a, b, t) {
  return a + (b - a) * t;
}

function mixColor(a, b, t) {
  return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
}

function terrainNoise(lat, lon, scaleA, scaleB) {
  return (
    Math.sin((lon + lat * 0.8) * scaleA) * 0.55 +
    Math.cos((lon * 1.2 - lat) * scaleB) * 0.35 +
    Math.sin((lon - lat * 1.7) * (scaleA * 0.62)) * 0.25
  );
}

function getPlanetColor(planet, lat, lon, detail, light, now) {
  let base;
  let reliefBoost = 0;

  if (planet.style === "earth") {
    if (detail.polar) {
      const iceMix = clamp((Math.abs(lat) - 64) / 24, 0, 1);
      base = [206 + 33 * iceMix, 224 + 25 * iceMix, 232 + 18 * iceMix];
    } else if (detail.isLand) {
      const humid = clamp(1 - Math.abs(lat) / 52, 0, 1);
      const aridBelt = clamp(1 - Math.abs(Math.abs(lat) - 24) / 10, 0, 1);
      const mountain = clamp((detail.mountain + 0.4) / 1.4, 0, 1);
      const coastBoost = detail.coastness * 0.45;
      base = [
        55 + humid * 16 + aridBelt * 34 + mountain * 45 + coastBoost * 14,
        92 + humid * 82 + mountain * 22 - aridBelt * 8 + coastBoost * 16,
        44 + humid * 28 + mountain * 14 - aridBelt * 7
      ];
      reliefBoost = mountain * 0.16;
    } else {
      const depth = clamp((0.12 - detail.c) * 0.95, 0, 1);
      const shelf = detail.coastness;
      base = [
        8 + shelf * 20 + (1 - depth) * 6,
        47 + shelf * 58 + (1 - depth) * 26,
        82 + shelf * 92 + (1 - depth) * 70
      ];
      const latBand = 1 - Math.min(1, Math.abs(lat) / 90);
      base[1] += 14 * latBand;
      base[2] += 10 * latBand;
    }
  } else if (planet.style === "gas" || planet.style === "ice") {
    const p = planet.palette;
    const bands = 0.5 + 0.5 * Math.sin(lat * 0.37 + Math.sin((lon + now * 12000) * 0.045) * 1.65);
    const vortex = 0.5 + 0.5 * Math.cos((lon * 0.13 + now * 8800) + lat * 0.11);
    base = mixColor(p.a, p.b, bands * 0.78);
    base = mixColor(base, p.c, vortex * 0.45);

    if (planet.label === "Jupiter") {
      const spotDist = Math.hypot((lat + 19) / 12, (lon - 35) / 16);
      const redSpot = clamp(1 - spotDist, 0, 1);
      base = mixColor(base, [184, 96, 72], redSpot * 0.85);
    }
    if (planet.label === "Neptune") {
      const darkSpot = clamp(1 - Math.hypot((lat + 24) / 10, (lon + 32) / 14), 0, 1);
      base = mixColor(base, [30, 55, 124], darkSpot * 0.8);
    }
  } else if (planet.style === "sun") {
    const pulse = 0.5 + 0.5 * Math.sin((lon + now * 25000) * 0.078 + lat * 0.19);
    const flare = 0.5 + 0.5 * Math.cos((lat - now * 15000) * 0.16 + lon * 0.032);
    const granule = 0.5 + 0.5 * terrainNoise(lat, lon + now * 5000, 0.22, 0.15);
    base = [
      190 + pulse * 56 + flare * 22,
      94 + pulse * 65 + flare * 26,
      22 + pulse * 44 + granule * 16
    ];
    reliefBoost = 0.08 + granule * 0.08;
  } else {
    const p = planet.palette;
    const rough = 0.5 + 0.5 * terrainNoise(lat, lon, 0.2, 0.14);
    const crater = 0.5 + 0.5 * Math.cos((lon * 0.31 - lat * 0.26) * Math.PI);
    base = mixColor(p.a, p.b, rough * 0.72);
    base = mixColor(base, p.c, crater * 0.4);

    if (planet.label === "Mars") {
      const cap = clamp((Math.abs(lat) - 70) / 16, 0, 1);
      base = mixColor(base, [229, 214, 196], cap * 0.95);
      const canyon = clamp(1 - Math.abs(lat + 10) / 10, 0, 1) * (0.5 + 0.5 * Math.sin((lon - 40) * 0.13));
      base = mixColor(base, [126, 61, 40], canyon * 0.45);
    }

    if (planet.label === "Mercury") {
      const craterBelt = clamp(0.5 + 0.5 * Math.sin((lon * 0.8 + lat * 1.3) * 0.35), 0, 1);
      base = mixColor(base, [150, 144, 136], craterBelt * 0.22);
    }

    if (planet.label === "Pluto") {
      const heart = clamp(1 - Math.hypot((lat - 20) / 24, (lon + 4) / 26), 0, 1);
      base = mixColor(base, [236, 224, 210], heart * 0.85);
    }

    if (planet.label === "Venus") {
      const haze = 0.5 + 0.5 * Math.sin((lon + now * 6000) * 0.05 + lat * 0.1);
      base = mixColor(base, [246, 210, 146], haze * 0.32);
    }
  }

  const lit = clamp(light + reliefBoost, 0.07, 1.12);
  return `rgb(${Math.round(base[0] * lit)}, ${Math.round(base[1] * lit)}, ${Math.round(base[2] * lit)})`;
}

function drawPlanetRing(cx, cy, radius, planet) {
  if (!planet.ring) return;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(state.yaw * 0.24);
  ctx.scale(1, 0.45 + Math.cos(state.pitch) * 0.12);

  const inner = radius * planet.ring.inner;
  const outer = radius * planet.ring.outer;
  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, Math.PI * 2);
  ctx.arc(0, 0, inner, 0, Math.PI * 2, true);
  const ringGrad = ctx.createRadialGradient(0, 0, inner, 0, 0, outer);
  ringGrad.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  ringGrad.addColorStop(0.45, planet.ring.color);
  ringGrad.addColorStop(1, "rgba(52, 42, 31, 0.45)");
  ctx.fillStyle = ringGrad;
  ctx.fill();

  ctx.restore();
}

function drawRingShadowOnPlanet(cx, cy, radius, planet) {
  if (!planet.ring) return;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  ctx.translate(cx, cy);
  ctx.rotate(state.yaw * 0.24);
  ctx.scale(1, 0.45 + Math.cos(state.pitch) * 0.12);
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.02, 0, Math.PI * 2);
  ctx.lineWidth = radius * 0.28;
  ctx.strokeStyle = "rgba(7, 12, 20, 0.28)";
  ctx.stroke();

  ctx.restore();
}

function drawAtmosphere(cx, cy, radius, planet) {
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.96, cx, cy, radius * 1.19);
  glow.addColorStop(0, "rgba(255, 255, 255, 0)");
  glow.addColorStop(0.7, planet.halo[0]);
  glow.addColorStop(1, planet.halo[1]);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.19, 0, Math.PI * 2);
  ctx.fill();
}

function getPlanetRimColor(planet) {
  if (planet.style === "sun") return "rgba(255, 178, 102, 0.75)";
  if (planet.label === "Mars") return "rgba(255, 169, 133, 0.66)";
  if (planet.label === "Jupiter") return "rgba(245, 212, 176, 0.66)";
  if (planet.label === "Saturn") return "rgba(248, 226, 185, 0.7)";
  if (planet.label === "Neptune") return "rgba(158, 191, 255, 0.7)";
  if (planet.label === "Uranus") return "rgba(172, 239, 245, 0.68)";
  return "rgba(170, 228, 255, 0.6)";
}

function drawGasBandOverlay(cx, cy, radius, planet, now) {
  if (!(planet.style === "gas" || planet.style === "ice")) return;

  for (let lat = -72; lat <= 72; lat += 4.8) {
    const band = 0.5 + 0.5 * Math.sin(lat * 0.55 + now * 0.0012);
    for (let lon = -180; lon <= 180; lon += 3.1) {
      const rotated = rotateVec(latLonToVec(lat, lon));
      if (rotated.z <= 0) continue;
      const x = cx + rotated.x * radius;
      const y = cy - rotated.y * radius;
      const alpha = (0.02 + band * 0.05) * rotated.z;
      ctx.fillStyle = `rgba(255, 250, 240, ${alpha})`;
      ctx.fillRect(x, y, 0.92, 0.92);
    }
  }
}

function drawRockyCraterOverlay(cx, cy, radius, planet) {
  if (!(planet.style === "rocky" || planet.style === "mars" || planet.style === "dwarf")) return;

  for (let lat = -78; lat <= 78; lat += 5.2) {
    for (let lon = -180; lon <= 180; lon += 5.2) {
      if (hash2(lat * 3.1, lon * 1.7) < 0.978) continue;
      const rotated = rotateVec(latLonToVec(lat, lon));
      if (rotated.z <= 0) continue;

      const x = cx + rotated.x * radius;
      const y = cy - rotated.y * radius;
      const craterR = 0.7 + hash2(lat * 0.8, lon * 0.9) * 1.2;
      ctx.beginPath();
      ctx.arc(x, y, craterR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(44, 36, 34, ${0.12 + rotated.z * 0.12})`;
      ctx.lineWidth = 0.45;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x - craterR * 0.25, y - craterR * 0.25, craterR * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 244, 226, ${0.04 + rotated.z * 0.08})`;
      ctx.fill();
    }
  }
}

function drawSolarFlares(cx, cy, radius, planet, now) {
  if (planet.style !== "sun") return;

  ctx.save();
  for (let i = 0; i < 28; i += 1) {
    const angle = (i / 28) * Math.PI * 2 + now * 0.00012;
    const wave = 0.5 + 0.5 * Math.sin(now * 0.002 + i * 0.9);
    const inner = radius * (1.01 + wave * 0.05);
    const outer = radius * (1.16 + wave * 0.18);
    const x1 = cx + Math.cos(angle) * inner;
    const y1 = cy + Math.sin(angle) * inner;
    const x2 = cx + Math.cos(angle) * outer;
    const y2 = cy + Math.sin(angle) * outer;
    ctx.strokeStyle = `rgba(255, 184, 96, ${0.14 + wave * 0.2})`;
    ctx.lineWidth = 1 + wave * 1.6;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();
}

function getSatelliteStates(planetKey, cx, cy, radius, nowMs) {
  const satellites = PLANET_SATELLITES[planetKey] || [];
  const tilt = state.pitch * 0.6;
  const cp = Math.cos(tilt);
  const sp = Math.sin(tilt);

  return satellites.map((sat) => {
    const angle = nowMs * sat.speed + sat.phase + state.yaw * 0.48;
    const orbitR = radius * sat.orbit;
    const xOrbit = Math.cos(angle) * orbitR;
    const zOrbit = Math.sin(angle) * orbitR;
    const yOrbit = Math.sin(angle * 1.2 + sat.phase) * orbitR * sat.incl;
    const yRot = yOrbit * cp - zOrbit * sp;
    const zRot = yOrbit * sp + zOrbit * cp;
    const size = Math.max(1.8, radius * sat.size * (0.76 + zRot * 0.12));

    return {
      ...sat,
      x: cx + xOrbit,
      y: cy + yRot,
      z: zRot,
      orbitR,
      angle
    };
  });
}

function drawSatelliteOrbits(cx, cy, states) {
  for (const sat of states) {
    const alpha = 0.09 + clamp(sat.incl, 0, 0.2) * 0.2;
    ctx.strokeStyle = `rgba(201, 224, 255, ${alpha})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, sat.orbitR, sat.orbitR * (0.18 + sat.incl * 0.65), sat.angle * 0.15, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawSatellites(states, front = true) {
  for (const sat of states) {
    if (front && sat.z < 0) continue;
    if (!front && sat.z >= 0) continue;

    const alpha = front ? 0.95 : 0.45;
    const glow = ctx.createRadialGradient(sat.x, sat.y, sat.size * 0.2, sat.x, sat.y, sat.size * 2.5);
    glow.addColorStop(0, `rgba(255, 255, 255, ${0.24 * alpha})`);
    glow.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sat.x, sat.y, sat.size * 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(sat.x, sat.y, sat.size, 0, Math.PI * 2);
    ctx.fillStyle = sat.color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawContinuousPlanetSurface(cx, cy, radius, planet, sun, nowMs) {
  const base = planet.palette ? planet.palette.a : [86, 128, 176];
  const litX = cx + sun.x * radius * 0.45;
  const litY = cy - sun.y * radius * 0.38;
  const surface = ctx.createRadialGradient(litX, litY, radius * 0.07, cx, cy, radius * 1.08);
  surface.addColorStop(0, `rgb(${Math.min(255, base[0] + 54)}, ${Math.min(255, base[1] + 54)}, ${Math.min(255, base[2] + 54)})`);
  surface.addColorStop(0.62, `rgb(${base[0]}, ${base[1]}, ${base[2]})`);
  surface.addColorStop(1, `rgb(${Math.max(0, base[0] - 62)}, ${Math.max(0, base[1] - 62)}, ${Math.max(0, base[2] - 62)})`);
  ctx.fillStyle = surface;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

function getPlanetTextureSettings(planet) {
  if (state.dragging) {
    return { latStep: 1.95, lonStep: 1.95, pointSize: 1.18, cloudStep: 3.9 };
  }
  if (state.lowPerf) {
    return { latStep: 1.25, lonStep: 1.25, pointSize: 0.92, cloudStep: 2.4 };
  }
  if (planet.style === "sun" || planet.style === "gas" || planet.style === "ice") {
    return { latStep: 0.62, lonStep: 0.62, pointSize: 0.52, cloudStep: 1.18 };
  }
  if (planet.style === "earth") {
    return { latStep: 0.48, lonStep: 0.48, pointSize: 0.44, cloudStep: 0.94 };
  }
  return { latStep: 0.56, lonStep: 0.56, pointSize: 0.48, cloudStep: 1.02 };
}

function drawPlanetTexture(cx, cy, radius, sun, nowMs, planet) {
  const now = nowMs * 0.00008;
  const settings = getPlanetTextureSettings(planet);

  for (let lat = -90; lat <= 90; lat += settings.latStep) {
    for (let lon = -180; lon <= 180; lon += settings.lonStep) {
      const rotated = rotateVec(latLonToVec(lat, lon));
      if (rotated.z <= 0) continue;

      const light = clamp(dot(rotated, sun) * 0.88 + 0.22, 0.08, 1.06);
      const detail = terrainDetail(lat, lon);
      ctx.fillStyle = getPlanetColor(planet, lat, lon, detail, light, now);

      const x = cx + rotated.x * radius;
      const y = cy - rotated.y * radius;
      const size = settings.pointSize * (0.7 + rotated.z * 0.8);
      ctx.fillRect(x - size * 0.5, y - size * 0.5, size, size);
    }
  }

  const needsClouds =
    planet.style === "earth" || planet.style === "venus" || planet.style === "gas" || planet.style === "ice";

  if (!needsClouds) {
    return;
  }

  for (let lat = -78; lat <= 78; lat += settings.cloudStep) {
    for (let lon = -180; lon <= 180; lon += settings.cloudStep * 1.25) {
      const shiftedLon = lon + state.cloudShift * 140;
      const cloud = cloudNoise(lat, shiftedLon);
      if (cloud < 0.2) continue;

      const rotated = rotateVec(latLonToVec(lat, shiftedLon));
      if (rotated.z <= 0) continue;

      const alpha = clamp((cloud - 0.18) * 0.2, 0.02, 0.16) * (0.45 + rotated.z * 0.7);
      const x = cx + rotated.x * radius;
      const y = cy - rotated.y * radius;
      const s = settings.pointSize * 1.25;
      let cloudColor = "238, 248, 255";
      if (planet.style === "venus") cloudColor = "255, 218, 164";
      if (planet.style === "gas") cloudColor = "245, 226, 198";
      if (planet.style === "ice") cloudColor = "210, 236, 255";
      ctx.fillStyle = `rgba(${cloudColor}, ${alpha})`;
      ctx.fillRect(x - s * 0.5, y - s * 0.5, s, s);
    }
  }
}

function drawEarthContinents(cx, cy, radius, nowMs) {
  const segments = state.lowPerf ? 96 : 180;
  for (const blob of CONTINENT_BLOBS) {
    const p = rotateVec(latLonToVec(blob.lat, blob.lon));
    if (p.z <= -0.04) continue;

    const x = cx + p.x * radius;
    const y = cy - p.y * radius;
    const vis = 0.6 + p.z * 0.42;
    const rx = (blob.rx / 180) * radius * 1.2 * vis;
    const ry = (blob.ry / 90) * radius * 0.72 * vis;

    ctx.beginPath();
    for (let i = 0; i <= segments; i += 1) {
      const t = (i / segments) * Math.PI * 2;
      const n =
        Math.sin(t * 2.7 + blob.lon * 0.04 + nowMs * 0.00006) * 0.09 +
        Math.cos(t * 5.1 + blob.lat * 0.05) * 0.06 +
        Math.sin(t * 8.3 + blob.rx * 0.08) * 0.03;
      const px = x + Math.cos(t) * rx * (1 + n);
      const py = y + Math.sin(t) * ry * (1 + n * 0.7);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = `rgba(82, 142, 75, ${0.26 + p.z * 0.14})`;
    ctx.fill();

    ctx.strokeStyle = `rgba(133, 188, 116, ${0.16 + p.z * 0.12})`;
    ctx.lineWidth = state.lowPerf ? 0.75 : 1.05;
    ctx.stroke();
  }

  // Polar ice caps
  ctx.fillStyle = "rgba(228, 243, 252, 0.45)";
  ctx.beginPath();
  ctx.ellipse(cx, cy - radius * 0.91, radius * 0.23, radius * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius * 0.91, radius * 0.27, radius * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(245, 252, 255, 0.58)";
  ctx.lineWidth = state.lowPerf ? 0.85 : 1.2;
  ctx.beginPath();
  ctx.ellipse(cx, cy - radius * 0.91, radius * 0.23, radius * 0.12, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy + radius * 0.91, radius * 0.27, radius * 0.13, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawPlanetEventOverlay(cx, cy, radius, planet, nowMs) {
  const eventT = nowMs * 0.001;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";

  if (planet.label === "Earth") {
    for (let i = 0; i < 22; i += 1) {
      const lon = -180 + i * 16 + Math.sin(eventT + i) * 4;
      const north = rotateVec(latLonToVec(74 + Math.sin(eventT * 0.9 + i) * 6, lon));
      const south = rotateVec(latLonToVec(-74 - Math.sin(eventT * 1.1 + i) * 6, lon));
      for (const p of [north, south]) {
        if (p.z <= 0) continue;
        const alpha = 0.05 + 0.1 * p.z;
        ctx.fillStyle = `rgba(112, 255, 195, ${alpha})`;
        ctx.beginPath();
        ctx.arc(cx + p.x * radius, cy - p.y * radius, 1.3 + p.z * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (planet.label === "Mars") {
    for (let i = 0; i < 34; i += 1) {
      const a = eventT * 0.6 + i * 0.26;
      const lat = Math.sin(a * 0.6) * 26;
      const lon = (a * 95) % 360 - 180;
      const p = rotateVec(latLonToVec(lat, lon));
      if (p.z <= 0) continue;
      ctx.fillStyle = `rgba(235, 166, 96, ${0.025 + p.z * 0.07})`;
      ctx.beginPath();
      ctx.arc(cx + p.x * radius, cy - p.y * radius, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (planet.label === "Jupiter") {
    const p = rotateVec(latLonToVec(-18, 35 + Math.sin(eventT * 0.5) * 12));
    if (p.z > 0) {
      const x = cx + p.x * radius;
      const y = cy - p.y * radius;
      const storm = ctx.createRadialGradient(x, y, radius * 0.03, x, y, radius * 0.16);
      storm.addColorStop(0, "rgba(242, 146, 105, 0.3)");
      storm.addColorStop(1, "rgba(242, 146, 105, 0)");
      ctx.fillStyle = storm;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (planet.label === "Saturn") {
    const phase = 0.5 + 0.5 * Math.sin(eventT * 1.2);
    ctx.fillStyle = `rgba(255, 232, 184, ${0.05 + phase * 0.08})`;
    ctx.fillRect(cx - radius, cy - radius * 0.15, radius * 2, radius * 0.3);
  } else if (planet.label === "Neptune" || planet.label === "Uranus") {
    for (let i = 0; i < 18; i += 1) {
      const a = eventT * (planet.label === "Neptune" ? 1.25 : 0.9) + i * 0.35;
      const lat = Math.sin(a) * 34;
      const lon = ((a * 80 + i * 12) % 360) - 180;
      const p = rotateVec(latLonToVec(lat, lon));
      if (p.z <= 0) continue;
      ctx.fillStyle = `rgba(164, 216, 255, ${0.025 + p.z * 0.06})`;
      ctx.beginPath();
      ctx.arc(cx + p.x * radius, cy - p.y * radius, 1.3 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawImpactMarks(cx, cy, radius, nowMs) {
  if (state.impacts.length === 0) return;
  state.impacts = state.impacts.filter((impact) => nowMs - impact.createdAt < impact.ttl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  for (const impact of state.impacts) {
    const age = (nowMs - impact.createdAt) / impact.ttl;
    const p = rotateVec(latLonToVec(impact.lat, impact.lon));
    if (p.z <= 0) continue;

    const x = cx + p.x * radius;
    const y = cy - p.y * radius;
    const r = radius * (0.018 + impact.strength * 0.02) * (0.8 + age * 0.6);
    const glow = ctx.createRadialGradient(x, y, r * 0.25, x, y, r * 2.8);
    glow.addColorStop(0, `rgba(255, 225, 190, ${0.22 * (1 - age)})`);
    glow.addColorStop(1, "rgba(255, 140, 90, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(44, 19, 12, ${0.45 - age * 0.25})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x - r * 0.18, y - r * 0.14, r * 0.55, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 190, 144, ${0.22 * (1 - age)})`;
    ctx.stroke();
  }

  ctx.restore();
}

function getSolarSmashAccent(planet) {
  if (planet.style === "sun") return "255, 170, 96";
  if (planet.style === "gas") return "255, 198, 142";
  if (planet.style === "ice") return "156, 211, 255";
  if (planet.label === "Earth") return "126, 194, 255";
  if (planet.label === "Mars") return "255, 144, 102";
  return "255, 178, 132";
}

function drawSolarSmashCracks(cx, cy, radius, planet, nowMs) {
  if (planet.style === "sun" || planet.style === "gas" || planet.style === "ice") return;

  const pulse = 0.55 + 0.45 * Math.sin(nowMs * 0.0021);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = "screen";

  for (let i = 0; i < 11; i += 1) {
    const seed = i * 17.11 + planet.label.length * 3.7;
    const a = hash2(seed, 1.3) * Math.PI * 2 + nowMs * 0.00004 * (i % 2 ? 1 : -1);
    const b = a + (hash2(seed, 7.9) - 0.5) * 1.25;
    const r1 = radius * (0.12 + hash2(seed, 3.1) * 0.72);
    const r2 = radius * (0.34 + hash2(seed, 5.7) * 0.62);
    const cp = radius * (0.18 + hash2(seed, 9.6) * 0.56);
    const x1 = cx + Math.cos(a) * r1;
    const y1 = cy + Math.sin(a) * r1;
    const x2 = cx + Math.cos(b) * r2;
    const y2 = cy + Math.sin(b) * r2;
    const xc = cx + Math.cos((a + b) * 0.5) * cp;
    const yc = cy + Math.sin((a + b) * 0.5) * cp;

    const alpha = (0.09 + hash2(seed, 11.2) * 0.2) * pulse;
    ctx.strokeStyle = `rgba(255, 166, 106, ${alpha})`;
    ctx.lineWidth = 0.7 + hash2(seed, 12.4) * 1.5;
    ctx.shadowColor = "rgba(255, 124, 77, 0.45)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(xc, yc, x2, y2);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawSolarSmashPostFx(width, height, cx, cy, radius, planet, nowMs) {
  const accent = getSolarSmashAccent(planet);
  const pulse = 0.5 + 0.5 * Math.sin(nowMs * 0.0024);

  const blast = ctx.createRadialGradient(cx, cy, radius * 0.94, cx, cy, radius * 1.55);
  blast.addColorStop(0, "rgba(255, 255, 255, 0)");
  blast.addColorStop(0.42, `rgba(${accent}, ${0.09 + pulse * 0.09})`);
  blast.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = blast;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 1.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 38; i += 1) {
    const t = nowMs * 0.001 + i * 0.29;
    const a = (i / 38) * Math.PI * 2 + Math.sin(t) * 0.08;
    const inner = radius * (1.01 + 0.02 * Math.sin(t * 1.7));
    const outer = radius * (1.11 + 0.07 * (0.5 + 0.5 * Math.sin(t * 1.3 + i)));
    const x1 = cx + Math.cos(a) * inner;
    const y1 = cy + Math.sin(a) * inner;
    const x2 = cx + Math.cos(a) * outer;
    const y2 = cy + Math.sin(a) * outer;
    ctx.strokeStyle = `rgba(${accent}, ${0.06 + 0.12 * (0.5 + 0.5 * Math.sin(t * 2.1))})`;
    ctx.lineWidth = 0.6 + (i % 3) * 0.35;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  if (!state.lowPerf) {
    ctx.fillStyle = "rgba(255, 166, 112, 0.035)";
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 1);
    }
  }

  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.52,
    Math.min(width, height) * 0.28,
    width * 0.5,
    height * 0.52,
    Math.max(width, height) * 0.88
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function drawGlobe() {
  const planet = getCurrentPlanet();
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
  const allowLowPerfEarthMoon = state.lowPerf && state.currentPlanet === "earth";
  const satelliteStates =
    state.dragging || (state.lowPerf && !allowLowPerfEarthMoon)
      ? []
      : getSatelliteStates(state.currentPlanet, cx, cy, radius, nowMs);

  drawSpaceBackground(width, height, nowMs, cx, cy, radius);
  if (!state.dragging && (!state.lowPerf || allowLowPerfEarthMoon)) {
    drawSatelliteOrbits(cx, cy, satelliteStates);
    drawSatellites(satelliteStates, false);
  }
  drawPlanetRing(cx, cy, radius, planet);

  const halo = ctx.createRadialGradient(cx, cy, radius * 0.96, cx, cy, radius * 1.22);
  halo.addColorStop(0, planet.halo[0]);
  halo.addColorStop(1, planet.halo[1]);
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

  drawContinuousPlanetSurface(cx, cy, radius, planet, sun, nowMs);
  drawPlanetTexture(cx, cy, radius, sun, nowMs, planet);
  drawPlanetEventOverlay(cx, cy, radius, planet, nowMs);

  if (!state.dragging && !state.lowPerf) {
    drawGasBandOverlay(cx, cy, radius, planet, nowMs);
    drawRockyCraterOverlay(cx, cy, radius, planet);
  }

  if (state.currentPlanet === "earth") {
    drawEarthContinents(cx, cy, radius, nowMs);
  }
  drawImpactMarks(cx, cy, radius, nowMs);
  if (!state.lowPerf) {
    drawRingShadowOnPlanet(cx, cy, radius, planet);
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

  // Node point markers are hidden to avoid dotted artifacts on the planet surface.

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
  if (!state.lowPerf) {
    drawAtmosphere(cx, cy, radius, planet);
  }

  if (planet.style === "sun" && !state.lowPerf) {
    const corona = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.9);
    corona.addColorStop(0, "rgba(255, 205, 124, 0.1)");
    corona.addColorStop(0.45, "rgba(255, 154, 61, 0.14)");
    corona.addColorStop(1, "rgba(255, 154, 61, 0)");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }
  if (!state.lowPerf) {
    drawSolarFlares(cx, cy, radius, planet, nowMs);
  }
  if (!state.dragging && (!state.lowPerf || allowLowPerfEarthMoon)) {
    drawSatellites(satelliteStates, true);
  }
  if (RENDER_THEME === "solar-smash") {
    drawSolarSmashCracks(cx, cy, radius, planet, nowMs);
    drawSolarSmashPostFx(width, height, cx, cy, radius, planet, nowMs);
  }

  // Removed outer rim stroke to avoid visible dotted/line artifacts.
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
}

function setPlanet(nextPlanet, silent = false) {
  if (!PLANET_PRESETS[nextPlanet]) return;
  state.currentPlanet = nextPlanet;
  state.impacts = [];
  applyPlanetInfo();
  updateStatusBar();
  drawGlobe();
  if (!silent) {
    addLog(`${PLANET_PRESETS[nextPlanet].label} 모드로 전환.`);
  }
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

function screenToLatLon(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const { cx, cy } = getViewCenter(rect.width, rect.height);
  const radius = getViewRadius(rect.width, rect.height);

  const nx = (x - cx) / radius;
  const ny = (cy - y) / radius;
  const r2 = nx * nx + ny * ny;
  if (r2 > 1) return null;

  const nz = Math.sqrt(Math.max(0, 1 - r2));
  const world = inverseRotateVec({ x: nx, y: ny, z: nz });
  const lat = (Math.asin(clamp(world.y, -1, 1)) * 180) / Math.PI;
  const lon = (Math.atan2(world.z, world.x) * 180) / Math.PI;
  return { lat, lon };
}

function registerImpact(clientX, clientY) {
  const hit = screenToLatLon(clientX, clientY);
  if (!hit) return false;
  state.impacts.unshift({
    ...hit,
    createdAt: Date.now(),
    ttl: 12000,
    strength: 0.8 + Math.random() * 0.8
  });
  if (state.impacts.length > 16) {
    state.impacts.length = 16;
  }
  return true;
}

function updateHoverCoordinate(clientX, clientY) {
  const hit = screenToLatLon(clientX, clientY);
  if (!hit) {
    state.hoverLat = null;
    state.hoverLon = null;
    updateStatusBar();
    return;
  }

  state.hoverLat = hit.lat;
  state.hoverLon = hit.lon;
  updateStatusBar();
}

function handlePointerDown(event) {
  state.dragging = true;
  canvas.classList.add("dragging");
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  state.pointerDownX = event.clientX;
  state.pointerDownY = event.clientY;
  state.dragDistance = 0;
  updateHoverCoordinate(event.clientX, event.clientY);
}

function handlePointerMove(event) {
  if (state.dragging) {
    const dx = event.clientX - state.lastX;
    const dy = event.clientY - state.lastY;
    state.dragDistance += Math.hypot(dx, dy);
    state.lastX = event.clientX;
    state.lastY = event.clientY;

    if (state.dragMode === "space") {
      state.bgYaw -= dx * 0.007;
      state.bgPitch = clamp(state.bgPitch + dy * 0.005, -1.2, 1.2);
    } else {
      state.yaw -= dx * 0.007;
      state.pitch = clamp(state.pitch + dy * 0.005, -1.2, 1.2);
    }
  }
  updateHoverCoordinate(event.clientX, event.clientY);
}

function handlePointerUp(event) {
  const clickLike = state.dragDistance < 10;
  state.dragging = false;
  canvas.classList.remove("dragging");
  if (clickLike && event && typeof event.clientX === "number") {
    if (registerImpact(event.clientX, event.clientY)) {
      addLog("충돌 이펙트 생성.");
      drawGlobe();
    }
  }
}

function setDragMode(mode) {
  state.dragMode = mode === "space" ? "space" : "planet";
  if (dragModeBtn) {
    dragModeBtn.textContent = state.dragMode === "space" ? "S" : "P";
    dragModeBtn.classList.toggle("active", state.dragMode === "space");
    dragModeBtn.setAttribute("aria-label", state.dragMode === "space" ? "Drag mode: space" : "Drag mode: planet");
  }
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
  if (planetInfoEl) {
    planetInfoEl.style.transform = `translate3d(${(shiftX * 0.5).toFixed(1)}px, ${(-shiftY * 0.55).toFixed(1)}px, 24px) rotateX(${(-ny * 1.5).toFixed(2)}deg) rotateY(${(-nx * 1.4).toFixed(2)}deg)`;
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
  planetSelectEl.addEventListener("change", () => {
    setPlanet(planetSelectEl.value);
    newRound();
  });

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
  });

  fireBtn.addEventListener("click", () => {
    addLog("서비스 소개: 드래그로 회전, 휠/버튼으로 줌, 행성 선택으로 장면을 전환하세요.");
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

  dragModeBtn.addEventListener("click", () => {
    const nextMode = state.dragMode === "planet" ? "space" : "planet";
    setDragMode(nextMode);
    addLog(nextMode === "space" ? "드래그 모드: 우주 배경" : "드래그 모드: 행성");
  });

  cinemaModeBtn.addEventListener("click", () => {
    setCinemaMode(!state.cinemaMode);
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
    state.bgYaw = 0;
    state.bgPitch = 0;
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
  const now = performance.now();
  if (now - state.lastRenderTs < 66) {
    requestAnimationFrame(animate);
    return;
  }
  state.lastRenderTs = now;

  const planet = getCurrentPlanet();
  if (!state.dragging) {
    if (state.cinemaMode) {
      state.yaw += planet.spinSpeed * 2.1;
      state.pitch = -0.45 + Math.sin(now * 0.00035) * 0.32;
      state.bgYaw += 0.0009;
      state.bgPitch = Math.sin(now * 0.00024) * 0.24;
      const targetZoom = 0.9 + Math.sin(now * 0.00028) * 0.34;
      state.zoom = clamp(targetZoom, 0.66, 1.42);
      updateStatusBar();
    } else {
      state.yaw += planet.spinSpeed;
    }
  }
  state.cloudShift = (state.cloudShift + planet.cloudSpeed) % (Math.PI * 2);
  drawGlobe();
  requestAnimationFrame(animate);
}

initEvents();
setDragMode(state.dragMode);
setCinemaMode(state.cinemaMode, true);
setPlanet(state.currentPlanet, true);
newRound();
updateHud();
updateStatusBar();
addLog("Tracker online. 행성을 선택하고 화면을 자유롭게 탐색하세요.");
setInterval(tickCooldown, 100);
requestAnimationFrame(() => {
  setupCanvasSize();
  drawGlobe();
  requestAnimationFrame(animate);
});
