STRUCTURE DU PROJET
------------------------------------------------------------
index.html              Structure de la page et des écrans
css/styles.css          Tout le design (thème sombre Apple-like)
js/config.js            Clés Supabase, favoris, état global
js/helpers.js           Utilitaires (DOM, toast, géométrie)
js/db.js                Client REST Supabase (contacts/trajets/signalements)
js/map.js               Carte Leaflet, zones de risque, tracés colorés
js/routing.js           Itinéraires piétons réels (OSRM) + détour sécurisé
js/search.js            Recherche d'adresse (Nominatim), favoris, récents
js/navigation.js        Comparaison, navigation animée, alertes, partage
js/contacts.js          Contacts d'urgence (CRUD en base) + écran d'appel
js/sos.js               Mode SOS (appui long pour armer)
js/report.js            Signalement d'une rue (écrit en base)
js/main.js              Orchestration, horloge, mise à l'échelle
saferoute_supabase.sql  Schéma de la base (déjà importé chez vous ✓)


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
