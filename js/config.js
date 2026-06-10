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

/* Zones mal éclairées — dérivées des données ouvertes de la Ville de Paris.
   Source : opendata.paris.fr, dataset « eclairage-public » (points lumineux).
   Méthode : la zone autour du quartier a été quadrillée en cellules de ~110 m ;
   on retient les cellules urbaines (voisinage bien éclairé) où aucun ou très peu
   de lampadaires sont répertoriés — des trous d'éclairage réels dans la trame. */
const AMBIENT_ZONES = [
  { level: "red",    lat: 48.83825, lng: 2.33775, r: 95, motif: "Rue Henri Barbusse — aucun éclairage public répertorié", n: 4 },
  { level: "red",    lat: 48.83495, lng: 2.35205, r: 95, motif: "Rue de Croulebarbe — éclairage public absent",          n: 4 },
  { level: "red",    lat: 48.84265, lng: 2.33995, r: 95, motif: "Rue Henri Barbusse (sud) — éclairage non répertorié",   n: 3 },
  { level: "orange", lat: 48.84705, lng: 2.36305, r: 90, motif: "Port Saint-Bernard — quai sombre la nuit",              n: 3 },
  { level: "orange", lat: 48.84925, lng: 2.36085, r: 90, motif: "Berges de Seine (Pompidou) — éclairage très faible",    n: 4 },
  { level: "red",    lat: 48.84375, lng: 2.36305, r: 95, motif: "Berges / square — éclairage absent la nuit",            n: 3 },
  { level: "red",    lat: 48.85255, lng: 2.34985, r: 95, motif: "Promenade Maurice Carême — non éclairée la nuit",       n: 3 },
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
