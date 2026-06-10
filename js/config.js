/* ============================================================
   SafeRoute — configuration & état global
   ============================================================ */

/* Supabase (clé publishable = publique, côté client) */
const SB_URL = "https://wyeujccpewagechzrkhd.supabase.co/rest/v1";
const SB_KEY = "sb_publishable_U_WifYmXNZWK_BSsOYMshQ_vBjX0QNA";

/* Point de départ simulé : av. des Gobelins, Paris */
const START = { lat: 48.8392, lng: 2.3486, label: "Ma position" };

const DEFAULT_DEST = { lat: 48.8478, lng: 2.3517, label: "12 rue des Écoles, Paris" };

const DEFAULT_CONTACTS = [
  { id: "loc-1", nom: "Léa",   relation: "Sœur", telephone: "+33 6 12 34 56 78", prioritaire: true },
  { id: "loc-2", nom: "Maman", relation: "Mère", telephone: "+33 6 98 76 54 32", prioritaire: true },
  { id: "loc-3", nom: "Karim", relation: "Ami",  telephone: "+33 7 45 21 09 87", prioritaire: false },
];

const FAVS = [
  { ...DEFAULT_DEST, ico: "🏠", chip: "12 rue des Écoles" },
  { lat: 48.8478, lng: 2.3621, label: "Campus Jussieu — Sorbonne Université", ico: "🎓", chip: "Fac" },
  { lat: 48.8345, lng: 2.3531, label: "Place d’Italie, Paris", ico: "🚇", chip: "Métro Italie" },
];

const AVATAR_COLORS = ["#30D158", "#5AC8FA", "#FF9F0A", "#BF5AF2", "#FF6482", "#64D2FF"];

/* Zones d'ambiance fixes dans le quartier (en plus des zones posées sur le trajet) */
const AMBIENT_ZONES = [
  { level: "orange", lat: 48.8352, lng: 2.3551, r: 90, motif: "Rue déserte la nuit", n: 1 },
  { level: "red",    lat: 48.8431, lng: 2.3402, r: 85, motif: "Rue peu éclairée",   n: 4 },
  { level: "orange", lat: 48.8508, lng: 2.3568, r: 95, motif: "Éclairage partiel",  n: 2 },
];

/* État partagé de l'application */
const state = {
  dest: null,
  routes: null,          // { direct:{coords,dist,min}, safe:{coords,dist,min} }
  selected: "safe",
  contacts: [],
  navTimer: null,
  navSpeed: 1,
  callTimer: null,
  picking: false,
  editingContact: null,
  searchFrom: "home",    // "home" | "route" : d'où la recherche a été ouverte
};

let dbOnline = false;
