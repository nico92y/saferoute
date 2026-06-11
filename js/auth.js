/* ============================================================
   SafeRoute — écran de connexion & cycle de session
   La personne connectée détermine quels contacts d'urgence et
   quels trajets sont chargés (voir db.js : signIn / loadContacts).
   ============================================================ */

function showAuth() {
  layerShow("view-auth", true);
  sheet("home-sheet", false);
  $("auth-email").value = "";
  authMsg("");
}
function hideAuth() { layerShow("view-auth", false); }

function authMsg(t, ok) {
  const m = $("auth-msg");
  if (!m) return;
  m.textContent = t || "";
  m.style.color = ok ? "var(--green)" : "var(--red)";
}

/* Charge les données de la personne connectée puis ouvre l'accueil */
async function enterApp() {
  hideAuth();
  sheet("home-sheet", true);
  await loadContacts();
  await drawUserSignalements();
}

/* (Re)dessine les signalements communautaires sur la carte */
async function drawUserSignalements() {
  if (!dbOnline) return;
  try {
    const sigs = await sb("/signalements?select=*&order=created_at.desc&limit=40");
    sigLayer.clearLayers();
    (sigs || []).forEach(drawSignalement);
  } catch (e) { /* silencieux */ }
}

async function doSignIn() {
  const email = $("auth-email").value.trim();
  const nom = $("auth-nom").value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    authMsg("Entrez une adresse e-mail valide.");
    return;
  }
  const btn = $("auth-go");
  btn.disabled = true;
  authMsg("Connexion…", true);
  try {
    await signIn(email, nom);
    authMsg("");
    await enterApp();
    requestLocation();
    toast("Bienvenue " + state.user.nom);
  } catch (e) {
    authMsg("Connexion impossible, réessayez.");
  } finally {
    btn.disabled = false;
  }
}

function doGuest() {
  state.user = guestUser();
  persistSession();
  enterApp();
  requestLocation();
  toast("Mode invité");
}

function signOut() {
  clearSession();
  state.contacts = [];
  layerShow("view-contacts", false);
  goHome();
  showAuth();
  toast("Déconnecté");
}

/* Démarrage : session existante → app ; sinon → écran de connexion */
async function boot() {
  await detectSchema();
  if (restoreSession()) {
    await enterApp();
    requestLocation();
  } else {
    showAuth();
  }
}

/* --- câblage --- */
$("auth-go").onclick = doSignIn;
$("auth-guest").onclick = doGuest;
$("auth-email").addEventListener("keydown", (e) => { if (e.key === "Enter") doSignIn(); });
$("btn-signout").onclick = signOut;
