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

async function buildRoutes(dest) {
  const A = [START.lat, START.lng], B = [dest.lat, dest.lng];

  let direct;
  try { direct = await osrm([A, B]); }
  catch (e) { direct = fallbackLine(A, B, "direct"); }

  // Zones de risque posées sur le trajet direct (56 % et 78 % du parcours)
  const zRed = pointAt(direct.coords, 0.56);
  const zOr  = pointAt(direct.coords, 0.78);
  routeZones = [
    { level: "red",    lat: zRed[0], lng: zRed[1], r: 110, motif: "Rue peu éclairée",  n: 3 },
    { level: "orange", lat: zOr[0],  lng: zOr[1],  r: 80,  motif: "Éclairage partiel", n: 1 },
  ];
  drawZones();

  // Détour : point de passage décalé perpendiculairement à la zone rouge
  const i = Math.floor(direct.coords.length * 0.56);
  const p0 = direct.coords[Math.max(0, i - 3)];
  const p1 = direct.coords[Math.min(direct.coords.length - 1, i + 3)];
  let dx = p1[1] - p0[1], dy = p1[0] - p0[0];
  const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
  const OFF = 0.0032; // ≈ 280 m

  let safe = null;
  for (const sign of [1, -1]) {
    const via = [zRed[0] + (-dx) * OFF * sign, zRed[1] + dy * OFF * sign];
    try {
      const cand = await osrm([A, via, B]);
      const crossesRed = cand.coords.some((p) => distM(p, zRed) < 115);
      if (!crossesRed) { safe = cand; break; }
      if (!safe) safe = cand;
    } catch (e) { /* on essaie l'autre côté */ }
  }
  if (!safe) safe = fallbackLine(A, B, "safe");

  const toMin = (d) => Math.max(1, Math.round(d / 80)); // marche ≈ 4,8 km/h
  state.routes = {
    direct: { ...direct, min: toMin(direct.dist) },
    safe:   { ...safe,   min: Math.max(toMin(safe.dist), toMin(direct.dist) + 1) },
  };
}
