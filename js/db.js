/* ============================================================
   SafeRoute — accès Supabase (REST / PostgREST) + comptes
   Correctif : avec une clé `sb_publishable_…`, seul l'en-tête
   `apikey` doit être envoyé. Un `Authorization: Bearer` contenant
   la clé publishable est rejeté (elle n'est pas un JWT).

   Comptes : chaque personne se connecte avec son e-mail ; ses
   contacts d'urgence et ses trajets lui sont reliés via `user_id`.
   L'app détecte au démarrage si la base a reçu la migration
   « comptes » (table utilisateurs + colonnes user_id) et bascule
   proprement en stockage local par utilisateur sinon.
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

/* --- détection des capacités du schéma distant --- */
async function detectSchema() {
  try {
    await sb("/contacts?select=id&limit=1");
    dbOnline = true;
  } catch (e) {
    dbOnline = false;
    return;
  }
  try { await sb("/contacts?select=user_id&limit=1"); dbCaps.userContacts = true; }
  catch (e) { dbCaps.userContacts = false; }
  try { await sb("/trajets?select=user_id&limit=1"); dbCaps.userTrajets = true; }
  catch (e) { dbCaps.userTrajets = false; }
  try { await sb("/utilisateurs?select=id&limit=1"); dbCaps.users = true; }
  catch (e) { dbCaps.users = false; }
}

/* Vrai quand les contacts peuvent réellement être reliés au compte en base */
function dbScoped() {
  return dbOnline && dbCaps.userContacts &&
         state.user && !state.user.guest && !state.user.local;
}

/* ============================================================
   Session / connexion
   ============================================================ */
function localUser(email, nom) {
  return { id: "loc-" + email, email, nom: nom || email.split("@")[0], local: true };
}
function guestUser() {
  return { id: "guest", email: "", nom: "Invité", guest: true };
}

function persistSession() {
  try { localStorage.setItem("sr-user", JSON.stringify(state.user)); } catch (e) { /* ignore */ }
}
function restoreSession() {
  try {
    const u = JSON.parse(localStorage.getItem("sr-user") || "null");
    if (u && (u.email || u.guest)) { state.user = u; return true; }
  } catch (e) { /* ignore */ }
  return false;
}
function clearSession() {
  state.user = null;
  try { localStorage.removeItem("sr-user"); } catch (e) { /* ignore */ }
}

/* Connexion par e-mail : retrouve le compte existant ou le crée.
   Sans table `utilisateurs` (migration non appliquée) ou hors-ligne,
   on crée un compte local stable rattaché à l'e-mail. */
async function signIn(email, nom) {
  email = (email || "").trim().toLowerCase();
  nom = (nom || "").trim();
  if (dbOnline && dbCaps.users) {
    try {
      const found = await sb("/utilisateurs?email=eq." + encodeURIComponent(email) + "&select=*");
      if (found && found.length) {
        const u = found[0];
        if (nom && nom !== u.nom) {
          try {
            const upd = await sb("/utilisateurs?id=eq." + u.id, { method: "PATCH", body: { nom } });
            if (upd && upd[0]) Object.assign(u, upd[0]);
          } catch (e) { u.nom = nom; }
        }
        state.user = u;
      } else {
        const ins = await sb("/utilisateurs", {
          method: "POST",
          body: { email, nom: nom || email.split("@")[0] },
        });
        state.user = ins[0];
      }
    } catch (e) {
      state.user = localUser(email, nom);
    }
  } else {
    state.user = localUser(email, nom);
  }
  persistSession();
  return state.user;
}

/* ============================================================
   Contacts — reliés à la personne connectée
   ============================================================ */
const seedContacts = () => DEFAULT_CONTACTS.map(({ id, ...c }) => c);

function contactsKey() {
  return "sr-contacts-" + (state.user ? (state.user.email || "guest") : "anon");
}
function localContactsLoad() {
  try {
    const r = JSON.parse(localStorage.getItem(contactsKey()));
    return Array.isArray(r) ? r : null;
  } catch (e) { return null; }
}
function localContactsPersist() {
  try { localStorage.setItem(contactsKey(), JSON.stringify(state.contacts)); } catch (e) { /* ignore */ }
}

async function loadContacts() {
  const u = state.user;

  /* Mode base + comptes : contacts filtrés sur l'utilisateur connecté */
  if (dbScoped()) {
    try {
      let rows = await sb("/contacts?user_id=eq." + u.id + "&select=*&order=created_at.asc");
      if (!rows || !rows.length) {
        // Premier login : on amorce les contacts de démo, reliés au compte
        try {
          rows = await sb("/contacts", {
            method: "POST",
            body: seedContacts().map((c) => ({ ...c, user_id: u.id })),
          });
        } catch (e) {
          rows = seedContacts().map((c, i) => ({ id: "loc-" + i, ...c }));
        }
      }
      state.contacts = rows;
      setDbNote("synced");
      return;
    } catch (e) { /* bascule en local ci-dessous */ }
  }

  /* Mode local par utilisateur (pas de migration, hors-ligne, ou invité) */
  const saved = localContactsLoad();
  state.contacts = saved || seedContacts().map((c, i) => ({ id: "loc-" + Date.now() + "-" + i, ...c }));
  if (!saved) localContactsPersist();
  setDbNote(u && u.guest ? "guest" : (dbOnline ? "nomigration" : "offline"));
}

function setDbNote(status) {
  const el = $("db-note");
  if (!el) return;
  const dot = (c) => '<span class="db-dot" style="background:' + c + '"></span>';
  const who = state.user ? esc(state.user.nom) : "";
  if (status === "synced")
    el.innerHTML = dot("var(--green)") + "Connecté · " + who + " — synchronisé avec Supabase";
  else if (status === "guest")
    el.innerHTML = dot("var(--muted)") + "Mode invité — contacts non synchronisés";
  else if (status === "nomigration")
    el.innerHTML = dot("var(--orange)") + "Compte " + who + " — local (migration « comptes » à appliquer)";
  else
    el.innerHTML = dot("var(--orange)") + "Mode local — base injoignable";
}

/* ============================================================
   Historique des trajets — relié à l'utilisateur si possible
   ============================================================ */
async function saveTrajet(r) {
  if (!dbOnline) return;
  try {
    const body = {
      depart: "Ma position",
      arrivee: state.dest.label.split(",")[0],
      duree_min: r.min,
      distance_km: +(r.dist / 1000).toFixed(2),
      type: state.selected === "safe" ? "securise" : "direct",
    };
    if (dbCaps.userTrajets && state.user && !state.user.guest && !state.user.local) {
      body.user_id = state.user.id;
    }
    await sb("/trajets", { method: "POST", body });
  } catch (e) { /* silencieux */ }
}
