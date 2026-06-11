/* ============================================================
   SafeRoute — orchestration générale
   ============================================================ */

/* --------- helpers de vues --------- */
function sheet(id, on) { $(id).classList.toggle("on", on); }
function layerShow(id, on) { $(id).classList.toggle("on", on); }
function chrome(id, on) { $(id).classList.toggle("off", !on); }
function fabs(on) { $("home-fabs").classList.toggle("off", !on); }

/* Retour à l'accueil depuis n'importe quel écran */
function goHome() {
  stopNav();
  clearRoutes();
  routeZones = [];
  drawZones();
  sheet("home-sheet", true);
  ["route-sheet", "nav-sheet", "share-sheet", "arrived-card", "contact-form", "report-sheet"].forEach((s) => sheet(s, false));
  ["view-search", "view-contacts", "view-call", "view-sos"].forEach((v) => layerShow(v, false));
  $("nav-banner").classList.remove("on");
  $("pick-banner").classList.remove("on");
  state.picking = false;
  chrome("home-chrome", true);
  chrome("route-chrome", false);
  fabs(true);
  map.flyTo([START.lat, START.lng], 15, { duration: 0.8 });
}

/* --------- horloge --------- */
function tickClock() {
  const d = new Date();
  $("clock").textContent = d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
}
tickClock();
setInterval(tickClock, 10000);

/* --------- mise à l'échelle du téléphone --------- */
function fitPhone() {
  const h = document.documentElement.clientHeight;
  const w = document.documentElement.clientWidth;
  const s = Math.min(1, (h - 32) / 844, (w - 24) / 390);
  $("phone-wrap").style.transform = "scale(" + s + ")";
}
fitPhone();
addEventListener("resize", fitPhone);

/* --------- thème clair / sombre --------- */
function applyTheme(light) {
  document.body.classList.toggle("light", light);
  $("theme-toggle").setAttribute("aria-pressed", light ? "true" : "false");
  $("theme-ic").textContent = light ? "🌙" : "☀️";
  $("theme-lbl").textContent = light ? "Mode sombre" : "Mode clair";
  if (typeof setMapTheme === "function") setMapTheme(light);
  try { localStorage.setItem("sr-theme", light ? "light" : "dark"); } catch (e) { /* ignore */ }
}
(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem("sr-theme"); } catch (e) { /* ignore */ }
  applyTheme(saved === "light");
})();
$("theme-toggle").onclick = () => applyTheme(!document.body.classList.contains("light"));

/* --------- divers --------- */
$("fab-locate").onclick = () => map.flyTo([START.lat, START.lng], 16, { duration: 0.7 });
$("home-sheet").querySelector(".grab").onclick = () => sheet("home-sheet", false);
$("route-sheet").querySelector(".grab").onclick = () => goHome();

/* --------- géolocalisation réelle de l'utilisateur --------- */
function requestLocation() {
  if (!navigator.geolocation) {
    toast("Géolocalisation non disponible — position de démo", "ⓘ");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      START.lat = pos.coords.latitude;
      START.lng = pos.coords.longitude;
      userMarker.setLatLng([START.lat, START.lng]);
      // on ne recentre que si l'utilisateur n'est pas déjà en train de planifier/naviguer
      if (!state.navTimer && !state.routes) map.setView([START.lat, START.lng], 15);
      toast("Vous êtes localisé");
    },
    () => { /* refus ou échec → on conserve la position de démo (Paris) */ },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

/* --------- splash & démarrage ---------
   Après le splash, boot() (auth.js) décide : session existante →
   on entre dans l'app et on charge les données de la personne
   connectée ; sinon → écran de connexion. */
setTimeout(() => {
  layerShow("splash", false);
  boot();
}, 1900);
