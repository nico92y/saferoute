STRUCTURE DU PROJET
------------------------------------------------------------
index.html              Structure de la page et des écrans
css/styles.css          Tout le design (thème sombre Apple-like)
js/config.js            Clés Supabase, favoris, état global
js/helpers.js           Utilitaires (DOM, toast, géométrie)
js/db.js                Client REST Supabase + comptes (détection schéma, signIn, contacts par utilisateur)
js/auth.js              Écran de connexion & cycle de session
js/map.js               Carte Leaflet, zones de risque, tracés colorés
js/routing.js           Itinéraires piétons réels (OSRM) + détour sécurisé
js/search.js            Recherche d'adresse (Nominatim), favoris, récents
js/navigation.js        Comparaison, navigation animée, alertes, partage
js/contacts.js          Contacts d'urgence (CRUD en base) + écran d'appel
js/sos.js               Mode SOS (appui long pour armer)
js/report.js            Signalement d'une rue (écrit en base)
js/main.js              Orchestration, horloge, mise à l'échelle
saferoute_supabase.sql  Schéma de la base (+ migration « comptes »)


CONNEXION & CONTACTS RELIÉS À L'UTILISATEUR
------------------------------------------------------------
Chaque personne se connecte avec son e-mail (écran d'accueil).
Ses contacts d'urgence et ses trajets lui sont reliés via la
colonne user_id. Un mode « invité » reste disponible.

IMPORTANT — pour synchroniser les comptes en base, exécutez la
migration : Supabase → SQL Editor → collez saferoute_supabase.sql
→ Run. Elle crée la table `utilisateurs` et ajoute `user_id` aux
tables `contacts` et `trajets` (idempotent, sans perte de données).
Tant que la migration n'est pas appliquée, l'app fonctionne quand
même : les contacts sont alors stockés localement, par compte
(la pastille en bas de l'écran Contacts indique l'état réel).

ZONES DANGEREUSES — NORD DE PARIS
------------------------------------------------------------
Ajout de zones de risque dans le nord (18e/19e : Porte de la
Chapelle, Clignancourt, Stalingrad, Goutte d'Or, Rosa Parks…)
dans js/config.js (AMBIENT_ZONES) + signalements correspondants
insérés dans la base Supabase (visibles sur la carte par tous).


CORRECTIONS APPORTÉES (v2)
------------------------------------------------------------
1. Carte au-dessus des écrans (contacts, appel, arrivée) :
   corrigé — les calques Leaflet sont désormais isolés sous
   l'interface (#map z-index:0 + isolation).
2. "Base injoignable" malgré le SQL importé : corrigé — la clé
   sb_publishable_ ne doit être envoyée que dans l'en-tête
   `apikey` (l'en-tête Authorization la faisait rejeter).
3. Barre de recherche disparue / blocage : sur l'écran
   d'itinéraire il y a maintenant une pille de destination
   (cliquer = changer d'adresse) + bouton retour. Pendant la
   navigation, bouton ✕ pour arrêter le trajet à tout moment.
4. Habillage de page masqué sur petits écrans (plus de
   chevauchement avec le téléphone).
5. Si les tuiles de carte sont injoignables, fond "plan de
   rues" propre au lieu d'un écran noir.
6. Fiches contacts compactes (badge SOS, texte tronqué proprement).


DÉPLOIEMENT VERCEL (optionnel, 2 min)
------------------------------------------------------------
vercel.com → Add New Project → glisser le dossier complet
(c'est un site statique, aucune configuration nécessaire).
