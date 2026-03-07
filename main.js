const TARGET_COUNT = 6;
const DETECT_KM = 220;

const scoreEl = document.getElementById("score");
const shotsEl = document.getElementById("shots");
const hitsEl = document.getElementById("hits");
const cooldownEl = document.getElementById("cooldown");
const formEl = document.getElementById("strike-form");
const planetSelectEl = document.getElementById("planet-select");
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
const missionTitleEl = document.getElementById("mission-title");
const missionSubEl = document.getElementById("mission-sub");
const viewTargetEl = document.getElementById("view-target");

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
  starFieldHeight: 0,
  currentPlanet: "earth"
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
    subtitle: "우주에서 지구를 바라보는 탐색 화면입니다. 드래그로 회전하고, 실제 위도/경도로 스캔하세요.",
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

  drawSpaceBackground(width, height, nowMs, cx, cy, radius);
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

  for (let lat = -88; lat <= 88; lat += 2.3) {
    for (let lon = -180; lon <= 180; lon += 2.3) {
      const rotated = rotateVec(latLonToVec(lat, lon));
      if (rotated.z <= 0) continue;

      const x = cx + rotated.x * radius;
      const y = cy - rotated.y * radius;

      const detail = terrainDetail(lat, lon);
      const light = clamp(dot(rotated, sun) * 0.92 + 0.08, 0.05, 1.04);
      ctx.fillStyle = getPlanetColor(planet, lat, lon, detail, light, nowMs * 0.00001);
      const size = 1.35 + rotated.z * 1.05;
      ctx.fillRect(x, y, size, size);

      const nightFactor = clamp(0.36 - dot(rotated, sun), 0, 0.36) / 0.36;
      if (planet.style === "earth" && nightFactor > 0.65 && detail.isLand && !detail.polar && hash2(lat, lon) > 0.964) {
        ctx.fillStyle = `rgba(255, 206, 117, ${0.22 + nightFactor * 0.5})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
  }
  drawRingShadowOnPlanet(cx, cy, radius, planet);

  const withClouds = ["earth", "venus", "jupiter", "saturn", "uranus", "neptune"].includes(state.currentPlanet);
  if (withClouds) {
    const cloudDrift = state.cloudShift * 20;
    const cloudDensity = planet.label === "Venus" ? 1.15 : 1;
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
        const alpha = clamp((c - 0.36) * 0.8, 0.05, 0.24) * light * cloudDensity;
        const cloudColor =
          planet.label === "Jupiter" || planet.label === "Saturn"
            ? "245, 220, 194"
            : planet.label === "Venus"
            ? "255, 220, 168"
            : planet.label === "Uranus" || planet.label === "Neptune"
            ? "220, 241, 255"
            : "235, 246, 255";
        ctx.fillStyle = `rgba(${cloudColor}, ${alpha})`;
        const size = 1.8 + rotated.z * 1.25;
        ctx.fillRect(x, y, size, size);
      }
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
    ctx.fillStyle = node.detected ? planet.marker : "#cdeeff";
    ctx.fill();

    if (node.detected) {
      ctx.beginPath();
      ctx.arc(x, y, 10.5, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(186, 227, 255, 0.46)";
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
  drawAtmosphere(cx, cy, radius, planet);

  if (planet.style === "sun") {
    const corona = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.9);
    corona.addColorStop(0, "rgba(255, 205, 124, 0.1)");
    corona.addColorStop(0.45, "rgba(255, 154, 61, 0.14)");
    corona.addColorStop(1, "rgba(255, 154, 61, 0)");
    ctx.fillStyle = corona;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = getPlanetRimColor(planet);
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

function setPlanet(nextPlanet, silent = false) {
  if (!PLANET_PRESETS[nextPlanet]) return;
  state.currentPlanet = nextPlanet;
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
  planetSelectEl.addEventListener("change", () => {
    setPlanet(planetSelectEl.value);
    newRound();
  });

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
  const planet = getCurrentPlanet();
  if (!state.dragging) {
    state.yaw += planet.spinSpeed;
  }
  state.cloudShift = (state.cloudShift + planet.cloudSpeed) % (Math.PI * 2);
  drawGlobe();
  requestAnimationFrame(animate);
}

initEvents();
initUiParallax();
setPlanet(state.currentPlanet, true);
newRound();
updateHud();
updateStatusBar();
addLog("Tracker online. 행성을 선택하고 좌표를 스캔하세요.");
setInterval(tickCooldown, 100);
requestAnimationFrame(() => {
  setupCanvasSize();
  drawGlobe();
  requestAnimationFrame(animate);
});
