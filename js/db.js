/* ============================================================
   SafeRoute — accès Supabase (REST / PostgREST)
   Correctif : avec une clé `sb_publishable_…`, seul l'en-tête
   `apikey` doit être envoyé. Un `Authorization: Bearer` contenant
   la clé publishable est rejeté (elle n'est pas un JWT) → c'était
   la cause du "base injoignable".
   ============================================================ */

async function sb(path, { method = "GET", body = null } = {}) {
  const headers = { apikey: SB_KEY };
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    headers["Prefer"] = "return=representation";
  }
  const res = await fetch(SB_URL + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error("Supabase " + res.status);
  const txt = await res.text();
  return txt ? JSON.parse(txt) : null;
}

async function loadContacts() {
  try {
    let rows = await sb("/contacts?select=*&order=created_at.asc");
    dbOnline = true;
    if (!rows || !rows.length) {
      // Base vide → on l'amorce avec les contacts de démonstration
      try {
        rows = await sb("/contacts", {
          method: "POST",
          body: DEFAULT_CONTACTS.map(({ id, ...c }) => c),
        });
      } catch (e) { rows = [...DEFAULT_CONTACTS]; }
    }
    state.contacts = rows;
    setDbNote(true);
  } catch (e) {
    dbOnline = false;
    state.contacts = [...DEFAULT_CONTACTS];
    setDbNote(false);
  }
}

function setDbNote(on) {
  $("db-note").innerHTML = on
    ? '<span class="db-dot" style="background:var(--green)"></span>Synchronisé avec Supabase'
    : '<span class="db-dot" style="background:var(--orange)"></span>Mode local — base injoignable';
}

async function saveTrajet(r) {
  if (!dbOnline) return;
  try {
    await sb("/trajets", { method: "POST", body: {
      depart: "Ma position",
      arrivee: state.dest.label.split(",")[0],
      duree_min: r.min,
      distance_km: +(r.dist / 1000).toFixed(2),
      type: state.selected === "safe" ? "securise" : "direct",
    }});
  } catch (e) { /* silencieux */ }
}
