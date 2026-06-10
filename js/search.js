/* ============================================================
   SafeRoute — recherche de destination
   Géocodage et autocomplétion via Nominatim (OpenStreetMap).
   La recherche peut être ouverte depuis l'accueil OU depuis
   l'écran d'itinéraire (pille de destination) : "Annuler"
   ramène toujours au bon écran.
   ============================================================ */

function openSearch(from) {
  state.searchFrom = from || "home";
  if (from === "route") {
    sheet("route-sheet", false);
    chrome("route-chrome", false);
  }
  layerShow("view-search", true);
  renderRecents();
  setTimeout(() => $("search-input").focus(), 250);
}

function closeSearch() {
  layerShow("view-search", false);
  $("search-input").value = "";
  if (state.searchFrom === "route" && state.routes) {
    chrome("route-chrome", true);
    sheet("route-sheet", true);
  }
}

$("open-search").onclick = () => openSearch("home");
$("route-pill").onclick = () => openSearch("route");
$("search-cancel").onclick = closeSearch;

let _searchT = null;
$("search-input").addEventListener("input", (e) => {
  clearTimeout(_searchT);
  const q = e.target.value.trim();
  if (q.length < 3) { renderRecents(); return; }
  $("search-results").innerHTML = '<div class="spin"></div>';
  _searchT = setTimeout(() => doSearch(q), 420);
});

async function doSearch(q) {
  try {
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=fr&viewbox=2.30,48.86,2.39,48.82&q=" + encodeURIComponent(q);
    const r = await fetch(url);
    const list = await r.json();
    if (!list.length) {
      $("search-results").innerHTML = '<p class="sub" style="padding:22px 8px">Aucun résultat. Essayez une adresse plus précise.</p>';
      return;
    }
    $("search-results").innerHTML = '<div class="res-label">Résultats</div>';
    list.forEach((p) => {
      const parts = p.display_name.split(",");
      addResult({
        lat: +p.lat, lng: +p.lon,
        label: parts.slice(0, 2).join(",").trim(),
        detail: parts.slice(2, 5).join(",").trim(),
        ico: "📍",
      });
    });
  } catch (e) {
    $("search-results").innerHTML = '<p class="sub" style="padding:18px 8px 4px">Recherche en ligne indisponible — choisissez un favori.</p>';
    renderRecents(true);
  }
}

function addResult(item) {
  const d = document.createElement("div");
  d.className = "res-item";
  d.innerHTML =
    '<div class="res-ico">' + item.ico + "</div>" +
    '<div style="min-width:0"><div class="t">' + esc(item.label) + '</div><div class="d">' + esc(item.detail || "") + "</div></div>";
  d.onclick = () => {
    layerShow("view-search", false);
    $("search-input").value = "";
    selectDestination(item);
  };
  $("search-results").appendChild(d);
}

async function renderRecents(keep) {
  if (!keep) $("search-results").innerHTML = "";
  const favL = document.createElement("div");
  favL.className = "res-label"; favL.textContent = "Favoris";
  $("search-results").appendChild(favL);
  FAVS.forEach((f) => addResult({ ...f, detail: "Itinéraire sécurisé enregistré" }));
  if (dbOnline) {
    try {
      const recents = await sb("/trajets?select=arrivee,duree_min,distance_km&order=created_at.desc&limit=3");
      if (recents && recents.length) {
        const l = document.createElement("div");
        l.className = "res-label"; l.textContent = "Trajets récents";
        $("search-results").appendChild(l);
        recents.forEach((t) => addResult({
          ...DEFAULT_DEST,
          label: t.arrivee,
          detail: fmtDuration(t.duree_min) + " · " + (+t.distance_km).toFixed(1).replace(".", ",") + " km · sécurisé",
          ico: "🕘",
        }));
      }
    } catch (e) { /* silencieux */ }
  }
}

/* Puces favoris de l'accueil */
FAVS.forEach((f) => {
  const b = document.createElement("button");
  b.className = "chip";
  b.innerHTML = f.ico + " " + f.chip;
  b.onclick = () => selectDestination(f);
  $("fav-row").appendChild(b);
});
$("btn-fav").onclick = () => selectDestination(FAVS[0]);
