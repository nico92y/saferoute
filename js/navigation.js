/* ============================================================
   SafeRoute — itinéraires & navigation
   ============================================================ */

/* --------- choix de destination & comparaison --------- */
async function selectDestination(dest) {
  state.dest = dest;
  sheet("home-sheet", false);
  chrome("home-chrome", false);
  fabs(true); // locate / signalement / SOS restent accessibles pendant l'itinéraire
  layerShow("view-search", false);

  const short = dest.label.split(",")[0];
  $("route-dest").textContent = short;
  $("route-pill-txt").textContent = short;
  $("safe-time").textContent = "…";
  $("direct-time").textContent = "…";
  chrome("route-chrome", true);
  sheet("route-sheet", true);

  await buildRoutes(dest);
  const { direct, safe } = state.routes;
  $("direct-time").textContent = fmtDuration(direct.min);
  $("safe-time").textContent = fmtDuration(safe.min);
  $("direct-meta").textContent = (direct.dist / 1000).toFixed(1).replace(".", ",") + " km · passe par une zone rouge";
  $("safe-meta").textContent = (safe.dist / 1000).toFixed(1).replace(".", ",") + " km · détour éclairé, recommandé";
  setSelected("safe");
}

function setSelected(which) {
  state.selected = which;
  $("opt-safe").classList.toggle("sel", which === "safe");
  $("opt-direct").classList.toggle("sel", which === "direct");
  const w = $("route-warn");
  if (which === "direct") {
    w.className = "route-warn";
    w.innerHTML = "<span>⚠️</span><span><b>Non recommandé :</b> ce trajet coupe par une zone rouge signalée 3 fois ce mois-ci. SafeRoute conseille de garder le détour sécurisé.</span>";
    $("btn-start").textContent = "Démarrer quand même";
    $("btn-start").className = "btn ghost";
  } else {
    w.className = "route-warn ok";
    w.innerHTML = "<span>🛡️</span><span><b>Recommandé :</b> +" + (state.routes.safe.min - state.routes.direct.min) + " min seulement pour éviter la zone rouge, par des rues fréquentées et éclairées.</span>";
    $("btn-start").textContent = "Démarrer l’itinéraire sécurisé";
    $("btn-start").className = "btn green";
  }
  showCompare();
}
$("opt-safe").onclick = () => setSelected("safe");
$("opt-direct").onclick = () => setSelected("direct");
$("route-back").onclick = () => goHome();

/* --------- navigation --------- */
$("btn-start").onclick = startNav;

function startNav() {
  const r = state.routes[state.selected];
  sheet("route-sheet", false);
  chrome("route-chrome", false);

  clearRoutes();
  layerNav = coloredSegments(r.coords, state.selected === "safe" ? "#30D158" : "#8C97A8", false).addTo(map);
  addDestMarker();
  navMarker = L.marker(r.coords[0], {
    icon: L.divIcon({ className: "", html: '<div class="nav-dot"></div>', iconSize: [26, 26], iconAnchor: [13, 13] }),
    zIndexOffset: 500,
  }).addTo(map);

  $("nav-label").textContent = state.selected === "safe" ? "Détour sécurisé actif" : "Itinéraire direct";
  $("nav-eta").textContent = fmtDuration(r.min);
  $("nav-dist").textContent = (r.dist / 1000).toFixed(1).replace(".", ",") + " km" + (state.selected === "safe" ? " · évite la zone rouge" : "");
  sheet("nav-sheet", true);
  banner(
    "info",
    state.selected === "safe" ? "Détour sécurisé appliqué" : "Restez vigilante",
    state.selected === "safe" ? "Itinéraire par des rues fréquentées et éclairées" : "Ce trajet traverse une zone signalée",
    4200
  );

  saveTrajet(r);

  const DURATION = 38000; // 38 s à vitesse ×1
  let progress = 0, last = performance.now();
  const alerts = { orange: false, red: false, near: false };
  map.flyTo(r.coords[0], 16, { duration: 0.8 });

  state.navTimer = setInterval(() => {
    const now = performance.now();
    progress += ((now - last) / DURATION) * state.navSpeed;
    last = now;
    if (progress >= 1) { progress = 1; finishNav(); }

    const pt = pointAt(r.coords, progress);
    navMarker.setLatLng(pt);
    if (progress > 0.02 && progress < 1) map.panTo(pt, { animate: true, duration: 0.4 });
    $("nav-prog").style.width = (progress * 100).toFixed(1) + "%";
    const remain = Math.max(0, Math.round(r.min * (1 - progress)));
    $("nav-eta").textContent = remain ? fmtDuration(remain) : "< 1 min";

    // alertes contextuelles : on regarde ~7 % devant soi
    const ahead = pointAt(r.coords, Math.min(1, progress + 0.07));
    const lv = levelAt(ahead);
    if (lv === "orange" && !alerts.orange) {
      alerts.orange = true;
      banner("warn", "Zone orange devant", "Éclairage partiel signalé — restez sur l’itinéraire", 4200);
    }
    if (lv === "red" && !alerts.red) {
      alerts.red = true;
      banner("warn", "Segment rouge détecté", "Rue peu éclairée · 3 signalements ce mois-ci", 4600);
    }
    if (state.selected === "safe" && progress > 0.62 && !alerts.near) {
      alerts.near = true;
      banner("ok", "Zone rouge évitée", "Le détour vous a fait contourner le risque signalé", 4200);
    }
  }, 90);
}

function stopNav() {
  clearInterval(state.navTimer);
  state.navTimer = null;
  state.navSpeed = 1;
  $("nav-pill-t").textContent = "En route · ×1";
  $("nav-prog").style.width = "0";
}

function finishNav() {
  stopNav();
  sheet("nav-sheet", false);
  sheet("share-sheet", false);
  $("arrived-t").textContent = "Vous êtes bien arrivée";
  $("arrived-d").textContent = state.selected === "safe"
    ? "Trajet sécurisé terminé — la zone rouge a été évitée. Vos proches ont été prévenus de votre arrivée."
    : "Trajet terminé. Vos proches ont été prévenus de votre arrivée.";
  sheet("arrived-card", true);
}
$("btn-finish").onclick = () => goHome();

/* Quitter le trajet à tout moment (plus de blocage possible) */
$("nav-quit").onclick = () => { goHome(); toast("Trajet arrêté"); };

/* Vitesse de démo ×1 / ×4 */
$("nav-pill").onclick = () => {
  state.navSpeed = state.navSpeed === 1 ? 4 : 1;
  $("nav-pill-t").textContent = "En route · ×" + state.navSpeed;
};

/* --------- bandeau d'alerte --------- */
function banner(kind, t, d, ms) {
  const b = $("nav-banner");
  b.className = "nav-banner on " + kind;
  $("nav-banner-t").textContent = t;
  $("nav-banner-d").textContent = d;
  $("nav-banner-ic").innerHTML = kind === "ok"
    ? '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 10.5l4.5 4.5L17 5.5" stroke="#30D158" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
    : kind === "warn"
    ? '<svg width="20" height="19" viewBox="0 0 19 18" fill="none"><path d="M9.5 1.5L18 16.5H1L9.5 1.5z" stroke="#FF9F0A" stroke-width="2" stroke-linejoin="round"/><path d="M9.5 7v4" stroke="#FF9F0A" stroke-width="2" stroke-linecap="round"/><circle cx="9.5" cy="13.4" r="1.1" fill="#FF9F0A"/></svg>'
    : '<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 1l7 2.5v5c0 4.8-3 8.8-7 10.5-4-1.7-7-5.7-7-10.5v-5L10 1z" stroke="#0A84FF" stroke-width="2" stroke-linejoin="round"/></svg>';
  clearTimeout(banner._t);
  banner._t = setTimeout(() => b.classList.remove("on"), ms || 4000);
}

/* --------- partage de position --------- */
$("btn-share").onclick = () => {
  sheet("nav-sheet", false);
  renderShare();
  sheet("share-sheet", true);
};

function renderShare() {
  $("share-sub").textContent = "Suivi actif pendant " + $("nav-eta").textContent;
  const list = $("share-list");
  list.innerHTML = "";
  state.contacts.forEach((c, i) => {
    const row = document.createElement("div");
    row.className = "c-row";
    row.innerHTML =
      '<div class="avatar" style="background:' + AVATAR_COLORS[i % AVATAR_COLORS.length] + '">' + esc(c.nom[0].toUpperCase()) + "</div>" +
      '<div class="info"><div class="n">' + esc(c.nom) + '</div><div class="s" id="sh-' + i + '"><span class="live"></span>Lien envoyé…</div></div>';
    list.appendChild(row);
    // progression réaliste des statuts
    setTimeout(() => { const e = $("sh-" + i); if (e) e.innerHTML = '<span class="live"></span>Lien reçu'; }, 900 + i * 700);
    setTimeout(() => { const e = $("sh-" + i); if (e) e.innerHTML = '<span class="live"></span>' + (i % 2 ? "Connectée" : "Suit le trajet"); }, 2200 + i * 900);
  });
}
$("share-sheet").querySelector(".grab").onclick = () => {
  sheet("share-sheet", false);
  if (state.navTimer) sheet("nav-sheet", true);
};
$("share-open-contacts").onclick = () => {
  sheet("share-sheet", false);
  openContacts(true);
};
