/* ============================================================
   SafeRoute — mode SOS (appui long pour armer)
   ============================================================ */

let _sosHold = null, _sosP = 0;
const sosBtn = $("btn-sos");

function armSOS() {
  const prios = state.contacts.filter((c) => c.prioritaire);
  const targets = prios.length ? prios : state.contacts.slice(0, 2);
  $("sos-dest").textContent = targets.map((c) => c.nom).join(", ") || "Aucun contact";
  $("sos-pos").textContent = state.dest
    ? state.dest.label.split(",").slice(0, 2).join(",")
    : "Ma position actuelle";
  $("sos-ctx").textContent = state.navTimer
    ? "Retour en cours, " + (state.selected === "safe" ? "détour sécurisé actif" : "itinéraire direct")
    : "Hors trajet — position ponctuelle";
  $("sos-sent").innerHTML = "";
  $("sos-send").disabled = false;
  $("sos-send").textContent = "SOS";
  sheet("nav-sheet", false);
  layerShow("view-sos", true);
}

function holdStart(e) {
  e.preventDefault();
  _sosP = 0;
  _sosHold = setInterval(() => {
    _sosP += 7;
    sosBtn.querySelector(".ring").style.setProperty("--p", Math.min(100, _sosP) + "%");
    if (_sosP >= 100) { holdEnd(true); armSOS(); }
  }, 80);
}
function holdEnd(done) {
  clearInterval(_sosHold);
  _sosHold = null;
  if (!done && _sosP > 0 && _sosP < 100) toast("Maintenez SOS appuyé pour armer", "ⓘ");
  _sosP = 0;
  sosBtn.querySelector(".ring").style.setProperty("--p", "0%");
}
sosBtn.addEventListener("pointerdown", holdStart);
sosBtn.addEventListener("pointerup", () => holdEnd(false));
sosBtn.addEventListener("pointerleave", () => _sosHold && holdEnd(false));

/* SOS flottant : accessible depuis toutes les vues carte (accueil, itinéraire, navigation) */
$("fab-sos").onclick = armSOS;

$("sos-cancel").onclick = () => {
  layerShow("view-sos", false);
  if (state.navTimer) sheet("nav-sheet", true);
};

$("sos-send").onclick = () => {
  $("sos-send").disabled = true;
  $("sos-send").textContent = "Envoi…";
  $("sos-sent").innerHTML = "";
  const prios = state.contacts.filter((c) => c.prioritaire);
  const targets = prios.length ? prios : state.contacts.slice(0, 2);
  // La police (17) est toujours prévenue en premier, puis les contacts prioritaires
  const recipients = ["Police (17)", ...targets.map((c) => c.nom)];
  recipients.forEach((name, i) => {
    setTimeout(() => {
      $("sos-sent").innerHTML += (i ? " · " : "") + "✓ " + esc(name);
    }, 600 + i * 550);
  });
  setTimeout(() => {
    $("sos-send").textContent = "Alerte envoyée";
    toast("Position envoyée à la police et à vos contacts");
  }, 800 + recipients.length * 550);
};
