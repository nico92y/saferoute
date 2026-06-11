/* ============================================================
   SafeRoute — carte, zones de risque, tracés
   ============================================================ */

const map = L.map("map", { zoomControl: false, attributionControl: false, doubleClickZoom: false });
map.setView([START.lat, START.lng], 15);

/* Tuiles sombres Carto. Si elles sont injoignables (réseau bloqué),
   on bascule sur un fond "plan de rues" en CSS pour rester présentable. */
const tiles = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19, subdomains: "abcd",
});
let _tileOK = 0, _tileErr = 0;
tiles.on("tileload", () => { _tileOK++; });
tiles.on("tileerror", () => {
  _tileErr++;
  if (!_tileOK && _tileErr > 5) {
    map.removeLayer(tiles);
    $("map").classList.add("no-tiles");
  }
});
tiles.addTo(map);

/* Variante claire des tuiles, utilisée par le mode clair */
const tilesLight = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19, subdomains: "abcd",
});
function setMapTheme(light) {
  if (light) {
    if (map.hasLayer(tiles)) map.removeLayer(tiles);
    if (!map.hasLayer(tilesLight)) tilesLight.addTo(map);
  } else {
    if (map.hasLayer(tilesLight)) map.removeLayer(tilesLight);
    if (!map.hasLayer(tiles)) tiles.addTo(map);
  }
}

/* Crédit (obligation OpenStreetMap / Carto) */
const _credit = L.control({ position: "bottomleft" });
_credit.onAdd = () => {
  const d = L.DomUtil.create("div", "attrib");
  d.textContent = "© OpenStreetMap · Carto";
  return d;
};
_credit.addTo(map);

const userMarker = L.marker([START.lat, START.lng], {
  icon: L.divIcon({ className: "", html: '<div class="user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
}).addTo(map);

let destMarker = null, navMarker = null;
let layerDirect = null, layerSafe = null, layerNav = null;
const zoneLayer = L.layerGroup().addTo(map);
const sigLayer = L.layerGroup().addTo(map);

/* Zones de risque posées dynamiquement sur l'itinéraire (voir routing.js) */
let routeZones = [];

function zoneColor(l) { return l === "red" ? "#FF453A" : "#FF9F0A"; }

function drawZones() {
  zoneLayer.clearLayers();
  [...AMBIENT_ZONES, ...routeZones].forEach((z) => {
    const col = zoneColor(z.level);
    /* Rayon d'affichage agrandi pour rester visible même très dézoomé
       (Paris entier). La détection d'itinéraire utilise toujours z.r. */
    const drawR = (z.level === "red" ? 220 : 190);
    const c = L.circle([z.lat, z.lng], {
      radius: drawR, color: col, weight: 2, opacity: 0.9,
      fillColor: col, fillOpacity: 0.32,
    }).addTo(zoneLayer);
    const tag = z.level === "red" ? "Risque élevé" : "Vigilance";
    c.bindPopup(
      '<div class="zp-tag" style="color:' + col + '">' + tag + "</div>" +
      '<div class="zp-t">' + z.motif + "</div>" +
      '<div class="zp-d">' + z.n + " signalement" + (z.n > 1 ? "s" : "") + " ce mois-ci · score communautaire</div>"
    );
  });
}

/* Affichage initial des zones d'éclairage dès le chargement de l'accueil
   (sans ça, les zones n'apparaissaient qu'après le calcul d'un itinéraire). */
drawZones();

function drawSignalement(s) {
  L.marker([s.lat, s.lng], {
    icon: L.divIcon({ className: "", html: '<div class="sig-pin">!</div>', iconSize: [22, 22], iconAnchor: [11, 11] }),
  }).addTo(sigLayer).bindPopup(() => sigPopup(s), { minWidth: 210 });
}

/* Contenu du popup d'un signalement : motif + confirmations communautaires */
function sigPopup(s) {
  const wrap = document.createElement("div");
  wrap.innerHTML =
    '<div class="zp-tag" style="color:#FF9F0A">Signalement</div>' +
    '<div class="zp-t">' + esc(s.motif) + "</div>" +
    '<div class="zp-d">' + (s.description ? esc(s.description) : "Signalé par la communauté") + "</div>" +
    '<div class="zp-meta"><span class="zp-cnt">👍 <b>' + getConfirms(s) + "</b> confirmations</span> · " + timeAgo(s.created_at) + "</div>" +
    '<div class="zp-acts">' +
      '<button class="zp-btn ok" type="button">Toujours là</button>' +
      '<button class="zp-btn no" type="button">Plus là</button>' +
    "</div>";
  const cnt = wrap.querySelector(".zp-cnt b");
  wrap.querySelector(".zp-btn.ok").onclick = () => { cnt.textContent = addConfirm(s, 1); toast("Merci, signalement confirmé"); };
  wrap.querySelector(".zp-btn.no").onclick = () => { cnt.textContent = addConfirm(s, -1); toast("Merci, c’est noté", "ⓘ"); };
  return wrap;
}

/* Niveau de risque au point donné */
function levelAt(pt) {
  for (const z of [...routeZones, ...AMBIENT_ZONES]) {
    if (distM(pt, [z.lat, z.lng]) <= z.r) return z.level;
  }
  return "green";
}

function clearRoutes() {
  [layerDirect, layerSafe, layerNav].forEach((l) => l && map.removeLayer(l));
  layerDirect = layerSafe = layerNav = null;
  if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
  if (navMarker) { map.removeLayer(navMarker); navMarker = null; }
}

/* Tracé coloré par niveau de risque traversé (vert / orange / rouge) */
function coloredSegments(coords, baseColor, dim) {
  const g = L.layerGroup();
  L.polyline(coords, { color: "#0B0F16", weight: 11, opacity: dim ? 0.5 : 0.85 }).addTo(g);
  let seg = [coords[0]], lvl = levelAt(coords[0]);
  const flush = () => {
    const col = lvl === "red" ? "#FF453A" : lvl === "orange" ? "#FF9F0A" : baseColor;
    L.polyline(seg, { color: col, weight: 6.5, opacity: dim ? 0.45 : 1, lineCap: "round", lineJoin: "round" }).addTo(g);
  };
  for (let i = 1; i < coords.length; i++) {
    const l2 = levelAt(coords[i]);
    seg.push(coords[i]);
    if (l2 !== lvl) { flush(); seg = [coords[i]]; lvl = l2; }
  }
  flush();
  return g;
}

function addDestMarker() {
  destMarker = L.marker([state.dest.lat, state.dest.lng], {
    icon: L.divIcon({ className: "", html: '<div class="dest-pin"></div>', iconSize: [30, 30], iconAnchor: [15, 28] }),
  }).addTo(map);
}

/* Affiche les deux itinéraires en mode comparaison */
function showCompare() {
  clearRoutes();
  const { direct, safe } = state.routes;
  layerDirect = coloredSegments(direct.coords, "#8C97A8", state.selected !== "direct").addTo(map);
  layerSafe = coloredSegments(safe.coords, "#30D158", state.selected !== "safe").addTo(map);
  addDestMarker();
  const all = [...direct.coords, ...safe.coords];
  map.fitBounds(L.latLngBounds(all), { padding: [60, 60], paddingBottomRight: [60, 300] });
}
