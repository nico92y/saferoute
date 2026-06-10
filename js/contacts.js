/* ============================================================
   SafeRoute — contacts d'urgence (CRUD Supabase) & appels
   ============================================================ */

function openContacts(fromNav) {
  openContacts.fromNav = !!fromNav;
  renderContacts();
  layerShow("view-contacts", true);
}
$("btn-contacts").onclick = () => { sheet("nav-sheet", false); openContacts(true); };
$("home-contacts").onclick = () => openContacts(false);
$("contacts-close").onclick = () => {
  layerShow("view-contacts", false);
  if (openContacts.fromNav && state.navTimer) sheet("nav-sheet", true);
};

function renderContacts() {
  const list = $("contacts-list");
  list.innerHTML = "";
  state.contacts.forEach((c, i) => {
    const card = document.createElement("div");
    card.className = "contact-card";
    card.innerHTML =
      '<div class="avatar" style="background:' + AVATAR_COLORS[i % AVATAR_COLORS.length] + '">' + esc(c.nom[0].toUpperCase()) + "</div>" +
      '<div class="info" style="flex:1;min-width:0">' +
        '<div class="n">' + esc(c.nom) + (c.prioritaire ? '<span class="prio-badge">SOS</span>' : "") + "</div>" +
        '<div class="s">' + esc(c.relation || "Contact") + " · " + esc(c.telephone || "—") + "</div>" +
      "</div>";
    const call = document.createElement("button");
    call.className = "mini-btn g";
    call.textContent = "Appeler";
    call.onclick = () => startCall(c, i);
    const more = document.createElement("button");
    more.className = "more";
    more.innerHTML = "⋯";
    more.title = "Modifier";
    more.onclick = () => openContactForm(c);
    card.appendChild(call);
    card.appendChild(more);
    list.appendChild(card);
  });
  if (!state.contacts.length) {
    list.innerHTML = '<p class="sub" style="padding:18px 6px">Aucun contact. Ajoutez un proche à prévenir en cas de besoin.</p>';
  }
}

/* --------- formulaire ajout / édition --------- */
$("btn-add-contact").onclick = () => openContactForm(null);

function openContactForm(c) {
  state.editingContact = c;
  $("cf-title").textContent = c ? "Modifier le contact" : "Nouveau contact";
  $("cf-nom").value = c ? c.nom : "";
  $("cf-relation").value = c ? c.relation || "" : "";
  $("cf-tel").value = c ? c.telephone || "" : "";
  $("cf-prio").classList.toggle("on", !!(c && c.prioritaire));
  $("cf-delete").style.display = c ? "block" : "none";
  sheet("contact-form", true);
}
$("cf-prio").onclick = (e) => e.currentTarget.classList.toggle("on");
$("cf-cancel").onclick = () => sheet("contact-form", false);

$("cf-save").onclick = async () => {
  const body = {
    nom: $("cf-nom").value.trim() || "Contact",
    relation: $("cf-relation").value.trim(),
    telephone: $("cf-tel").value.trim(),
    prioritaire: $("cf-prio").classList.contains("on"),
  };
  const c = state.editingContact;
  sheet("contact-form", false);
  const isLocal = c && String(c.id).startsWith("loc-");
  if (dbOnline) {
    try {
      if (c && !isLocal) {
        const upd = await sb("/contacts?id=eq." + c.id, { method: "PATCH", body });
        Object.assign(c, upd && upd[0] ? upd[0] : body);
      } else {
        const ins = await sb("/contacts", { method: "POST", body });
        if (c) Object.assign(c, ins[0]);
        else state.contacts.push(ins[0]);
      }
      toast(c ? "Contact mis à jour" : "Contact ajouté — enregistré en base");
    } catch (e) { localSave(c, body); }
  } else {
    localSave(c, body);
  }
  renderContacts();
};

function localSave(c, body) {
  if (c) Object.assign(c, body);
  else state.contacts.push({ id: "loc-" + Date.now(), ...body });
  toast(c ? "Contact mis à jour (local)" : "Contact ajouté (local)");
}

$("cf-delete").onclick = async () => {
  const c = state.editingContact;
  sheet("contact-form", false);
  state.contacts = state.contacts.filter((x) => x !== c);
  renderContacts();
  if (dbOnline && c && !String(c.id).startsWith("loc-")) {
    try { await sb("/contacts?id=eq." + c.id, { method: "DELETE" }); } catch (e) {}
  }
  toast("Contact supprimé");
};

/* --------- écran d'appel --------- */
function startCall(c, i, police) {
  $("view-call").classList.toggle("police", !!police);
  $("call-avatar").textContent = police ? "17" : c.nom[0].toUpperCase();
  $("call-avatar").style.background = police ? "var(--blue)" : AVATAR_COLORS[i % AVATAR_COLORS.length];
  $("call-avatar").style.color = police ? "#fff" : "#06130B";
  $("call-name").textContent = police ? "Police secours" : c.nom;
  $("call-status").textContent = police ? "appel d’urgence…" : "appel SafeRoute…";
  ["key-mute", "key-spk"].forEach((k) => $(k).classList.remove("active"));
  layerShow("view-call", true);

  clearInterval(state.callTimer);
  let sec = -2; // 2 s de sonnerie avant décrochage
  state.callTimer = setInterval(() => {
    sec++;
    if (sec < 0) return;
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    $("call-status").textContent = (police ? "position transmise · " : "") + m + ":" + s;
  }, 1000);
}
$("key-mute").onclick = () => $("key-mute").classList.toggle("active");
$("key-spk").onclick = () => $("key-spk").classList.toggle("active");
$("key-pad").onclick = () => toast("Clavier indisponible en démo", "ⓘ");
$("end-call").onclick = () => {
  clearInterval(state.callTimer);
  layerShow("view-call", false);
  toast("Appel terminé");
};
$("call-police").onclick = () => startCall(null, 0, true);
