/* ============================================================
   SafeRoute — calcul d'itinéraires
   1. Itinéraires piétons réels via OSRM (routing.openstreetmap.de)
   2. Les zones de risque sont posées SUR le trajet direct
      → le scénario "détour sécurisé" reste cohérent quelle que
        soit la destination saisie.
   3. Fallback hors-ligne : tracés orthogonaux façon rues.
   ============================================================ */

async function osrm(points) {
  const str = points.map((p) => p[1] + "," + p[0]).join(";");
  const url = "https://routing.openstreetmap.de/routed-foot/route/v1/foot/" + str + "?overview=full&geometries=geojson";
  const r = await fetch(url);
  if (!r.ok) throw new Error("osrm");
  const j = await r.json();
  if (!j.routes || !j.routes.length) throw new Error("osrm-empty");
  const rt = j.routes[0];
  return { coords: rt.geometry.coordinates.map((c) => [c[1], c[0]]), dist: rt.distance };
}

/* Tracé de secours : segments orthogonaux (nord/sud puis est/ouest),
   bien plus crédible qu'une courbe quand la carte réelle est indisponible. */
function fallbackLine(a, b, variant) {
  const pts = [[...a]];
  const seg = (p, q, steps) => {
    for (let i = 1; i <= steps; i++) {
      pts.push([p[0] + (q[0] - p[0]) * i / steps, p[1] + (q[1] - p[1]) * i / steps]);
    }
  };
  if (variant === "direct") {
    const m1 = [a[0] + (b[0] - a[0]) * 0.45, a[1]];
    const m2 = [m1[0], b[1]];
    seg(a, m1, 6); seg(m1, m2, 6); seg(m2, b, 6);
  } else {
    // détour : on s'écarte d'un pâté de maisons avant de remonter
    const side = b[1] >= a[1] ? 1 : -1;
    const off = 0.0042 * side;
    const m1 = [a[0] + (b[0] - a[0]) * 0.12, a[1]];
    const m2 = [m1[0], b[1] + off];
    const m3 = [a[0] + (b[0] - a[0]) * 0.86, b[1] + off];
    const m4 = [m3[0], b[1]];
    seg(a, m1, 4); seg(m1, m2, 6); seg(m2, m3, 8); seg(m3, m4, 4); seg(m4, b, 3);
  }
  return { coords: pts, dist: pathLength(pts) };
}

/* ----- mesure du « danger » d'un tracé -----
   Longueur (m) parcourue dans une zone signalée, le rouge pénalisé ×3.
   S'appuie sur levelAt() qui couvre routeZones ET AMBIENT_ZONES. */
function segDanger(a, b) {
  const lv = levelAt([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
  const w = lv === "red" ? 3 : lv === "orange" ? 1 : 0;
  return w ? w * distM(a, b) : 0;
}
function dangerScore(coords) {
  let s = 0;
  for (let i = 1; i < coords.length; i++) s += segDanger(coords[i - 1], coords[i]);
  return s;
}
function redLength(coords) {
  let s = 0;
  for (let i = 1; i < coords.length; i++) {
    const m = [(coords[i - 1][0] + coords[i][0]) / 2, (coords[i - 1][1] + coords[i][1]) / 2];
    if (levelAt(m) === "red") s += distM(coords[i - 1], coords[i]);
  }
  return s;
}

/* Zone (rouge/orange) la plus profondément traversée par le tracé */
function worstZoneOnPath(coords) {
  let worst = null, ws = 0;
  for (const z of [...routeZones, ...AMBIENT_ZONES]) {
    let dmin = Infinity;
    for (const p of coords) { const d = distM(p, [z.lat, z.lng]); if (d < dmin) dmin = d; }
    if (dmin < z.r) {
      const sev = (z.r - dmin) * (z.level === "red" ? 3 : 1);
      if (sev > ws) { ws = sev; worst = z; }
    }
  }
  return worst;
}

/* Point de passage qui contourne une zone : on repousse hors du rayon
   le point du tracé le plus proche du centre de la zone. */
function viaAroundZone(coords, zone, sign, magDeg) {
  let P = coords[0], dmin = Infinity;
  for (const p of coords) { const d = distM(p, [zone.lat, zone.lng]); if (d < dmin) { dmin = d; P = p; } }
  let vy = P[0] - zone.lat, vx = P[1] - zone.lng;
  const n = Math.hypot(vx, vy) || 1; vx /= n; vy /= n;
  const dist = zone.r / 111000 + magDeg;   // sortir du rayon + marge
  return [zone.lat + vy * dist * sign, zone.lng + vx * dist * sign];
}

/* Garde les points de passage ordonnés le long de A→B */
function sortVias(vias, A) {
  return vias.slice().sort((p, q) => distM(A, p) - distM(A, q));
}

/* Construit un itinéraire qui évite au mieux les zones rouges/oranges :
   on insère itérativement des points de passage autour de la zone la plus
   traversée, et on garde le tracé au plus faible « danger ». */
async function findSafeRoute(A, B, direct) {
  let best = direct, bestScore = dangerScore(direct.coords);
  if (bestScore === 0) return direct;
  let vias = [], current = direct;

  for (let iter = 0; iter < 3; iter++) {
    const worst = worstZoneOnPath(current.coords);
    if (!worst) break;
    let pick = null, pickScore = bestScore;
    for (const sign of [1, -1]) {
      for (const mag of [0.005, 0.009]) {
        const via = viaAroundZone(current.coords, worst, sign, mag);
        const trial = sortVias([...vias, via], A);
        try {
          const cand = await osrm([A, ...trial, B]);
          const sc = dangerScore(cand.coords);
          if (sc < pickScore - 1) { pickScore = sc; pick = { cand, via }; }
        } catch (e) { /* on essaie une autre variante */ }
      }
    }
    if (!pick) break;
    vias = sortVias([...vias, pick.via], A);
    current = pick.cand;
    best = pick.cand; bestScore = pickScore;
    if (redLength(best.coords) === 0 && bestScore < 60) break; // assez propre
  }
  return best;
}

async function buildRoutes(dest) {
  const o = state.origin || START;
  const A = [o.lat, o.lng], B = [dest.lat, dest.lng];

  let direct;
  try { direct = await osrm([A, B]); }
  catch (e) { direct = fallbackLine(A, B, "direct"); }

  // Zones de risque scénarisées sur le trajet direct (56 % et 78 % du parcours)
  const zRed = pointAt(direct.coords, 0.56);
  const zOr  = pointAt(direct.coords, 0.78);
  routeZones = [
    { level: "red",    lat: zRed[0], lng: zRed[1], r: 110, motif: "Rue peu éclairée",  n: 3 },
    { level: "orange", lat: zOr[0],  lng: zOr[1],  r: 80,  motif: "Éclairage partiel", n: 1 },
  ];
  drawZones();

  // Itinéraire sûr : contourne les zones rouges/oranges (route + ambiantes)
  let safe = await findSafeRoute(A, B, direct);
  if (safe === direct) safe = fallbackLine(A, B, "safe"); // OSRM indispo → détour géométrique

  const toMin = (d) => Math.max(1, Math.round(d / 80)); // marche ≈ 4,8 km/h
  state.routes = {
    direct: { ...direct, min: toMin(direct.dist) },
    safe:   { ...safe,   min: Math.max(toMin(safe.dist), toMin(direct.dist) + 1) },
  };
}

/* ============================================================
   Point de départ choisi sur la carte
   ============================================================ */
let originMarker = null;
let pointMarker = null;

/* Repère temporaire posé au toucher : on choisit ensuite « S'y rendre »
   (destination) ou « Partir d'ici » (départ de l'itinéraire). */
function placeMapPoint(latlng) {
  const ll = [latlng.lat, latlng.lng];
  if (pointMarker) pointMarker.setLatLng(ll);
  else pointMarker = L.marker(ll, {
    icon: L.divIcon({ className: "", html: '<div class="dest-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 28] }),
    zIndexOffset: 450,
  }).addTo(map);
  pointMarker.bindPopup(mapPointPopup(latlng), { minWidth: 196, closeButton: true }).openPopup();
}

function mapPointPopup(latlng) {
  const wrap = document.createElement("div");
  wrap.innerHTML =
    '<div class="zp-tag" style="color:var(--green)">Point sur la carte</div>' +
    '<div class="zp-d" style="margin-bottom:9px">Que voulez-vous faire de ce point ?</div>' +
    '<div class="zp-acts">' +
      '<button class="zp-btn ok" type="button" data-act="go">S’y rendre</button>' +
      '<button class="zp-btn" type="button" data-act="from">Partir d’ici</button>' +
    "</div>";
  wrap.querySelector('[data-act="go"]').onclick = () => {
    map.closePopup();
    removeMapPoint();
    selectDestination({ lat: latlng.lat, lng: latlng.lng, label: "Point sur la carte" });
  };
  wrap.querySelector('[data-act="from"]').onclick = () => {
    map.closePopup();
    removeMapPoint();
    setOrigin(latlng);
  };
  return wrap;
}

function removeMapPoint() {
  if (pointMarker) { map.removeLayer(pointMarker); pointMarker = null; }
}

function setOrigin(latlng) {
  state.origin = { lat: latlng.lat, lng: latlng.lng, label: "Point de départ" };
  if (originMarker) originMarker.setLatLng(latlng);
  else originMarker = L.marker(latlng, {
    icon: L.divIcon({ className: "", html: '<div class="start-pin">A</div>', iconSize: [26, 26], iconAnchor: [13, 13] }),
    zIndexOffset: 400,
  }).addTo(map);
  toast("Départ placé ici — choisissez votre destination", "🅰️");
}

function clearOrigin() {
  state.origin = null;
  if (originMarker) { map.removeLayer(originMarker); originMarker = null; }
  removeMapPoint();
}

/* Toucher la carte sur l'accueil = poser un repère (s'y rendre / en partir).
   (Le mode signalement, géré dans report.js, a la priorité.) */
map.on("click", (e) => {
  if (state.picking || state.navTimer || state.routes) return;
  if ($("home-chrome").classList.contains("off")) return; // seulement sur l'accueil
  placeMapPoint(e.latlng);
});
