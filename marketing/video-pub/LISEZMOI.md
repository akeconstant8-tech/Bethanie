# Vidéo de présentation de Béthanie (motion design, musique, voix off)

Vidéo verticale **1080 × 1920**, 32 secondes, avec bande-son : format des statuts WhatsApp, TikTok, Reels Instagram et
Facebook. Fichier : `bethanie-pub-9x16.mp4` (gardé en local, non enregistré dans Git). Sur le site :
`public/videos/bethanie-presentation-hd.mp4` (HD 1080 × 1920, lecteur plein écran, chargé à l’ouverture) et
`public/videos/bethanie-presentation.mp4` (aperçu léger 540 × 960 de l’accueil, en boucle sans le son).

## Déroulé (calé sur la musique, 128 battements par minute)

| Moment | Scène | Voix off |
|---|---|---|
| 0 – 3,8 s | Le logo se dessine, « BÉTHANIE » lettre par lettre, « Achetez • Vendez • Bénissez » | « Bienvenue sur Béthanie, la place de marché qui rapproche les vendeurs locaux et les acheteurs. » |
| 3,8 – 7,5 s | « Le marché africain dans votre poche », vendeurs vérifiés, prix en FCFA, Côte d’Ivoire et Sénégal | « Découvrez des produits vérifiés, explorez les catégories… » |
| 7,5 – 11,3 s | **01 · Découvrez** : le téléphone affiche l’accueil réel de l’application, qui défile | (suite) |
| 11,3 – 15 s | **02 · Commandez** : fiche produit, toucher « Ajouter au panier », la photo vole jusqu’au panier | « Chaque fiche vous aide à mieux connaître le produit et son vendeur. » |
| 15 – 18,8 s | **03 · Payez** : moyens Mobile Money, choix de Wave, paiement accepté, confettis | « En quelques gestes, passez votre commande, payez avec Mobile Money… » |
| 18,8 – 22,5 s | **04 · Recevez** : écran de suivi réel (livreur en route), suivi en temps réel, express 24 h à Abidjan | « …et suivez la livraison à domicile ou en point relais. » |
| 22,5 – 26,3 s | **Vous êtes vendeur ?** Espace vendeur réel, 95 % de chaque vente, commission unique de 5 % | « Vous êtes vendeur ? Ouvrez gratuitement votre boutique… » |
| 26,3 – 31,9 s | Logo, « bethanie.vercel.app », Côte d’Ivoire et Sénégal, la devise mot par mot | « Avec Béthanie, achetez, vendez et bénissez. » |

## Fichiers

- `index.html`, `animation.js` : l’animation (aucun `innerHTML`, politique de sécurité dans la page).
- `ecrans/` : vraies captures de l’application (téléphone 390 × 844, données de démonstration d’un serveur d’essai).
- `son.py` : bande-son — musique originale composée par programme (afro-house : grosse caisse, basse « log drum »,
  percussions, mélodie de lames de bois type balafon, nappes), effets sonores calés sur l’animation, voix off placée
  phrase par phrase, la musique s’efface sous la voix. Aucun échantillon musical extérieur : libre de droits.
- `voix-off-fr.wav` : voix off française d’origine (34 s), accélérée de 12 % au montage (hauteur de voix conservée).
- `rendu.mjs` : fabrication (60 images/s fusionnées deux à deux pour le flou de mouvement → 30 images/s, bande-son,
  assemblage, version du site et image d’aperçu).

## Refaire la vidéo

```
node rendu.mjs <chemin de ffmpeg.exe>                     # vidéo complète + version du site
node rendu.mjs <chemin de ffmpeg.exe> --apercus <dossier>  # quelques images clés pour vérifier
```

Prérequis : Microsoft Edge, ffmpeg, Python avec numpy et scipy (variable `PYTHON`), puppeteer-core (dans le projet ou
dans le dossier `PUPPETEER_DIR`). Aperçu animé : servir le dossier du projet et ouvrir
`/marketing/video-pub/index.html`.

## À savoir avant de publier

- Le paiement en ligne (Wave, Orange Money…) est encore en **mode test** sur le site : publier la vidéo quand le
  paiement réel est activé.
- La voix off dit « Ouvrez gratuitement votre boutique » : à garder seulement tant que l’ouverture reste gratuite.
