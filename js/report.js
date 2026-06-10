/* ============================================================
   SafeRoute — signalement communautaire d'une rue (façon Waze)
   1. Signalement rapide en 1 tap à la position courante
      (position de l'utilisateur, ou point courant si en trajet).
   2. Option "Choisir sur la carte" pour un point précis + détails.
   ============================================================ */

/* Catégories de danger proposées en signalement rapide */
const REPORT_TYPES = [
  { motif: "Rue peu éclairée",          ico: "💡", color: "#FF9F0A" },
  { motif: "Rue déserte la nuit",       ico: "🌙", color: "#5AC8FA" },
  { motif: "Harcèlement de rue",        ico: "🚷", color: "#FF453A" },
  { motif: "Personne suspecte",         ico: "👁️", color: "#BF5AF2" },
  { motif: "Travaux / trottoir bloqué", ico: "🚧", color: "#FF9F0A" },
  { motif: "Autre danger",              ico: "⚠️", color: "#FF453A" },
];

let _pickedLatLng = null;   // point choisi sur la carte (flux détaillé)
let _quickLatLng = null;    // point du signalement rapide

/* --------- enregistrement (carte + base) --------- */
function drawAndSaveSignalement(s, okMsg) {
  drawSignalement(s);
  if (dbOnline) {
    sb("/signalements", { method: "POST", body: s })
      .then(() => toast(okMsg + " — enregistré en base"))
      .catch(() => toast(okMsg + " (local)"));
  } else {
    toast(okMsg + " (local)");
  }
}

/* --------- signalement rapide --------- */
function openQuickReport() {
  if (state.navTimer && navMarker) {
    const p = navMarker.getLatLng();
    _quickLatLng = { lat: p.lat, lng: p.lng };
    $("rq-where").textContent = "Sur votre trajet, à votre position";
  } else {
    _quickLatLng = { lat: START.lat, lng: START.lng };
    $("rq-where").textContent = "À votre position actuelle";
  }
  buildReportGrid();
  sheet("report-quick", true);
}

function buildReportGrid() {
  const grid = $("report-grid");
  grid.innerHTML = "";
  REPORT_TYPES.forEach((t) => {
    const b = document.createElement("button");
    b.className = "report-cat";
    b.innerHTML =
      '<span class="ce" style="background:' + t.color + '22;color:' + t.color + '">' + t.ico + "</span>" +
      '<span class="cl">' + esc(t.motif) + "</span>";
    b.onclick = () => quickSubmit(t);
    grid.appendChild(b);
  });
}

function quickSubmit(t) {
  sheet("report-quick", false);
  if (!_quickLatLng) return;
  drawAndSaveSignalement(
    { lat: _quickLatLng.lat, lng: _quickLatLng.lng, motif: t.motif, description: "" },
    "Merci ! Danger signalé"
  );
}

/* --------- flux détaillé : choisir sur la carte --------- */
$("fab-report").onclick = openQuickReport;

$("rq-onmap").onclick = () => {
  sheet("report-quick", false);
  state.picking = true;
  fabs(false);
  $("pick-banner").classList.add("on");
  sheet("home-sheet", false);
};

$("pick-cancel").onclick = endPick;

function endPick() {
  state.picking = false;
  $("pick-banner").classList.remove("on");
  fabs(true);
  // on ne ré-affiche l'accueil que si aucun autre écran n'est actif
  if (!$("route-sheet").classList.contains("on") && !state.navTimer) {
    sheet("home-sheet", true);
  }
}

map.on("click", (e) => {
  if (!state.picking) return;
  _pickedLatLng = e.latlng;
  $("pick-banner").classList.remove("on");
  state.picking = false;
  sheet("report-sheet", true);
});

$("rp-cancel").onclick = () => {
  sheet("report-sheet", false);
  endPick();
};

$("rp-save").onclick = () => {
  if (!_pickedLatLng) { sheet("report-sheet", false); endPick(); return; }
  const s = {
    lat: _pickedLatLng.lat,
    lng: _pickedLatLng.lng,
    motif: $("rp-motif").value,
    description: $("rp-desc").value.trim(),
  };
  sheet("report-sheet", false);
  $("rp-desc").value = "";
  endPick();
  drawAndSaveSignalement(s, "Signalement envoyé");
};
