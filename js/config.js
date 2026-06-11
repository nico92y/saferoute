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
  { level: "red", lat: 48.87935, lng: 2.27935, r: 95, motif: "Avenue Charles de Gaulle — aucun éclairage public répertorié", n: 4 },
  { level: "red", lat: 48.82545, lng: 2.39045, r: 95, motif: "Chemin de l'Ancienne Écluse — aucun éclairage public répertorié", n: 4 },
  { level: "orange", lat: 48.89035, lng: 2.29585, r: 90, motif: "Rue Curnonsky — éclairage public clairsemé", n: 3 },
  { level: "red", lat: 48.82435, lng: 2.30135, r: 95, motif: "Boulevard Charles de Gaulle — aucun éclairage public répertorié", n: 4 },
  { level: "orange", lat: 48.84085, lng: 2.27275, r: 90, motif: "Quai André Citroën — quai sombre la nuit", n: 3 },
  { level: "red", lat: 48.87385, lng: 2.27385, r: 95, motif: "Allée Fortunée — non éclairé la nuit", n: 4 },
  { level: "red", lat: 48.83535, lng: 2.41025, r: 95, motif: "Rue Montesquiou-Fezensac — aucun éclairage public répertorié", n: 4 },
  { level: "red", lat: 48.81555, lng: 2.33765, r: 95, motif: "Rue Pierre Marcel — aucun éclairage public répertorié", n: 4 },
  { level: "orange", lat: 48.83425, lng: 2.37835, r: 90, motif: "Paris 13e Arrondissement — éclairage public clairsemé", n: 3 },
  { level: "red", lat: 48.85955, lng: 2.33215, r: 95, motif: "Port du Louvre — quai sombre la nuit", n: 4 },
  { level: "orange", lat: 48.86065, lng: 2.29255, r: 90, motif: "Port Debilly — quai sombre la nuit", n: 3 },
  { level: "orange", lat: 48.84195, lng: 2.36955, r: 90, motif: "Cité de la Mode et du Design — éclairage public clairsemé", n: 3 },
  { level: "red", lat: 48.83865, lng: 2.38275, r: 95, motif: "Rampe d'accès à la gare de Bercy — aucun éclairage public répertorié", n: 4 },
  { level: "orange", lat: 48.89035, lng: 2.39485, r: 90, motif: "Boulevard Sérurier — éclairage public clairsemé", n: 3 },
  { level: "red", lat: 48.82875, lng: 2.38605, r: 95, motif: "Port de Tolbiac — quai sombre la nuit", n: 4 },
  { level: "red", lat: 48.87495, lng: 2.40915, r: 95, motif: "Voie EX/20 — aucun éclairage public répertorié", n: 4 },
  { level: "red", lat: 48.84195, lng: 2.37835, r: 95, motif: "Paris 12e Arrondissement — aucun éclairage public répertorié", n: 4 },
  { level: "red", lat: 48.86615, lng: 2.31235, r: 95, motif: "Paris 8e Arrondissement — aucun éclairage public répertorié", n: 4 },
  { level: "orange", lat: 48.82875, lng: 2.39265, r: 90, motif: "Voie CC/12 — éclairage public clairsemé", n: 3 },
  { level: "orange", lat: 48.83095, lng: 2.37285, r: 90, motif: "Cour du Liégat — éclairage public clairsemé", n: 3 },
  { level: "red", lat: 48.83425, lng: 2.37175, r: 95, motif: "Promenade Claude Lévi-Strauss — non éclairé la nuit", n: 4 },
  { level: "red", lat: 48.88045, lng: 2.40915, r: 95, motif: "Avenue du Belvédère — aucun éclairage public répertorié", n: 4 },
  { level: "red", lat: 48.83095, lng: 2.40585, r: 95, motif: "Paris 12e Arrondissement (2) — aucun éclairage public répertorié", n: 4 },
  { level: "orange", lat: 48.85845, lng: 2.33875, r: 90, motif: "Port du Louvre (2) — quai sombre la nuit", n: 3 },
  { level: "orange", lat: 48.88815, lng: 2.31345, r: 90, motif: "Boulevard Pereire — éclairage public clairsemé", n: 3 },
  { level: "red", lat: 48.82545, lng: 2.37725, r: 95, motif: "Rue Regnault — aucun éclairage public répertorié", n: 4 },
  { level: "red", lat: 48.82325, lng: 2.30575, r: 95, motif: "Rue de la Tour — aucun éclairage public répertorié", n: 4 },
  { level: "red", lat: 48.82985, lng: 2.35525, r: 95, motif: "Place Henri Langlois — aucun éclairage public répertorié", n: 4 },
  { level: "red", lat: 48.85185, lng: 2.28705, r: 95, motif: "Rampe Finlay — aucun éclairage public répertorié", n: 4 },
  { level: "red", lat: 48.84415, lng: 2.37505, r: 95, motif: "Rue de Bercy — aucun éclairage public répertorié", n: 4 },

  /* --- Nord de Paris (18e / 19e) — secteurs signalés peu sûrs la nuit ---
     Trame d'éclairage trouée + signalements communautaires concentrés
     autour de la Chapelle, Clignancourt, Stalingrad et la Goutte d'Or. */
  { level: "red",    lat: 48.89815, lng: 2.35965, r: 95, motif: "Porte de la Chapelle — secteur isolé, éclairage public défaillant", n: 6 },
  { level: "red",    lat: 48.89945, lng: 2.34955, r: 95, motif: "Boulevard Ney — aucun éclairage public répertorié",               n: 5 },
  { level: "red",    lat: 48.88945, lng: 2.36025, r: 95, motif: "Rue Marx Dormoy — plusieurs lampadaires hors service",            n: 5 },
  { level: "orange", lat: 48.88375, lng: 2.36985, r: 90, motif: "Place de la Bataille-de-Stalingrad — abords sombres la nuit",     n: 4 },
  { level: "red",    lat: 48.89785, lng: 2.34435, r: 95, motif: "Porte de Clignancourt — zone déserte après fermeture des puces",  n: 5 },
  { level: "orange", lat: 48.88705, lng: 2.35205, r: 90, motif: "Goutte d'Or — éclairage faible autour du square Léon",            n: 4 },
  { level: "red",    lat: 48.89855, lng: 2.37045, r: 95, motif: "Quartier Macdonald / Rosa Parks — passages non éclairés",         n: 5 },
  { level: "orange", lat: 48.89455, lng: 2.31305, r: 90, motif: "Porte de Clichy — sous les voies, éclairage clairsemé",           n: 3 },
  { level: "red",    lat: 48.89855, lng: 2.33205, r: 95, motif: "Porte de Saint-Ouen — éclairage absent le long du périphérique",  n: 4 },
  { level: "orange", lat: 48.89655, lng: 2.37045, r: 90, motif: "Porte d'Aubervilliers — quais et entrepôts sombres",             n: 3 },
];

/* État partagé de l'application */
const state = {
  user: null,            // { id, email, nom, guest? } : personne connectée
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

/* Capacités du schéma distant, détectées au démarrage (voir db.js).
   Permet de fonctionner aussi bien avant qu'après l'application de la
   migration « comptes » (table utilisateurs + colonne contacts.user_id). */
const dbCaps = { users: false, userContacts: false, userTrajets: false };
