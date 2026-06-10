/* ============================================================
   SafeRoute — utilitaires (DOM, toast, géométrie)
   ============================================================ */

const $ = (id) => document.getElementById(id);

function esc(t) {
  const d = document.createElement("div");
  d.textContent = t || "";
  return d.innerHTML;
}

let _toastT = null;
function toast(msg, ico) {
  const t = $("toast");
  t.innerHTML = '<span style="color:var(--green)">' + (ico || "✓") + "</span>" + msg;
  t.classList.add("on");
  clearTimeout(_toastT);
  _toastT = setTimeout(() => t.classList.remove("on"), 2600);
}

/* Temps relatif lisible à partir d'un ISO : "il y a 12 min", "il y a 3 h" */
function timeAgo(iso) {
  if (!iso) return "à l’instant";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "à l’instant";
  if (s < 3600) return "il y a " + Math.floor(s / 60) + " min";
  if (s < 86400) return "il y a " + Math.floor(s / 3600) + " h";
  return "il y a " + Math.floor(s / 86400) + " j";
}

/* ----- confirmations communautaires des signalements (façon Waze) -----
   Persistées localement pour la démo ; base déterministe crédible par défaut. */
const CONFIRM_KEY = "sr-confirms";
function _confirmStore() {
  try { return JSON.parse(localStorage.getItem(CONFIRM_KEY) || "{}"); } catch (e) { return {}; }
}
function confirmId(s) {
  return s.id || (s.lat.toFixed(5) + "," + s.lng.toFixed(5));
}
function getConfirms(s) {
  const map = _confirmStore(), id = confirmId(s);
  if (id in map) return map[id];
  // base 3–9 dérivée de l'identifiant → rendu stable et crédible
  let h = 0; const str = String(id);
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return 3 + (h % 7);
}
function addConfirm(s, delta) {
  const map = _confirmStore(), id = confirmId(s);
  map[id] = Math.max(0, getConfirms(s) + delta);
  try { localStorage.setItem(CONFIRM_KEY, JSON.stringify(map)); } catch (e) { /* ignore */ }
  return map[id];
}

/* Formate une durée en minutes : "45 min", "1 h", "1 h 37" */
function fmtDuration(min) {
  min = Math.max(0, Math.round(min));
  if (min < 60) return min + " min";
  const h = Math.floor(min / 60), m = min % 60;
  return m ? h + " h " + String(m).padStart(2, "0") : h + " h";
}

/* Distance en mètres entre deux points [lat,lng] (Haversine) */
function distM(a, b) {
  const R = 6371000;
  const dLa = (b[0] - a[0]) * Math.PI / 180;
  const dLn = (b[1] - a[1]) * Math.PI / 180;
  const la1 = a[0] * Math.PI / 180, la2 = b[0] * Math.PI / 180;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLn / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pathLength(coords) {
  let d = 0;
  for (let i = 1; i < coords.length; i++) d += distM(coords[i - 1], coords[i]);
  return d;
}

/* Point situé à une fraction (0–1) le long d'un tracé */
function pointAt(coords, frac) {
  const total = pathLength(coords);
  let target = total * Math.min(1, Math.max(0, frac)), acc = 0;
  for (let i = 1; i < coords.length; i++) {
    const seg = distM(coords[i - 1], coords[i]);
    if (acc + seg >= target) {
      const t = seg ? (target - acc) / seg : 0;
      return [
        coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t,
        coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t,
      ];
    }
    acc += seg;
  }
  return coords[coords.length - 1];
}
