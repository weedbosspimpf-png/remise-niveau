# Pub motion design — sites web & applications

Publicité de **15 secondes** + **affiche** pour **Hortan Intelligence Plus**, aux couleurs du logo (noir & or), format 4:5 (1080×1350) pour le fil Facebook / Instagram.

| Fichier | Rôle |
|---|---|
| `rendu/pub-15s.mp4` | Vidéo finale à publier (H.264, 30 i/s) |
| `rendu/affiche.png` | Affiche statique |
| `config.js` | **Nom, slogan, téléphone, site, offre** — à modifier |
| `motion.html` | Animation (ouvrir dans un navigateur pour la voir en boucle) |
| `affiche.html` | Affiche |
| `render.mjs` | Régénère la vidéo et l'affiche (`node render.mjs`, nécessite Playwright + ffmpeg) |

## Déroulé de la vidéo
1. **0–3 s** — Accroche : « Votre idée mérite d'exister en ligne. »
2. **3–6,6 s** — Un site web se construit sous vos yeux (URL tapée, blocs, clic sur « Commander »).
3. **6,6–10 s** — Application mobile : liste, notification « Nouvelle commande ! », graphique +128 %.
4. **10–12,4 s** — Atouts : design sur-mesure, livraison rapide, visible sur Google, motion design.
5. **12,4–15 s** — Marque, « Devis gratuit », téléphone et site.

`rendu/pub-15s-musique.mp4` = version avec la musique `musique.mp3` (démarrée à 1 s pour que le « drop » tombe à 3 s, fondu de fin). Placez une voix off dans `voix.mp3` pour l’ajouter ensuite.

## Texte de voix off (≈ 15 s)
| Temps | Texte |
|---|---|
| 0–3 s | « Votre idée mérite d'exister en ligne. » |
| 3–6 s | « Sites web modernes, rapides, adaptés au mobile… » |
| 6–10 s | « …et applications mobiles iOS et Android. » |
| 10–12 s | « Design sur-mesure, livraison rapide, motion design. » |
| 12–15 s | « Hortan Intelligence Plus. Devis gratuit au 07 09 70 60 28. » |
