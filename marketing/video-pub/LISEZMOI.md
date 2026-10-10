# Vidéo de présentation de Béthanie (motion design)

Vidéo verticale **1080 × 1920**, 30 images par seconde, environ 35 secondes, sans son : format des statuts WhatsApp,
TikTok, Reels Instagram et Facebook. Fichier : `bethanie-pub-9x16.mp4`.

## Déroulé

| Moment | Scène |
|---|---|
| 0 – 4 s | Logo : l'Afrique dorée apparaît, le chariot se dessine, « BÉTHANIE » lettre par lettre, devise |
| 4 – 8 s | « Le marché africain dans votre poche » ; vendeurs vérifiés, prix en FCFA ; Côte d'Ivoire et Sénégal |
| 8 – 13 s | « Tout ce qu'il vous faut » : les 8 catégories du site |
| 13 – 18 s | « Commandez en un geste » : un doigt touche « + », la photo vole jusqu'au panier, « Ajouté au panier » |
| 18 – 22 s | « Payez comme vous voulez » : Wave, Orange Money, MTN MoMo, Moov Money, carte, paiement à la livraison |
| 22 – 27 s | « Livré chez vous » : le camion roule de la boutique à la maison, suivi en temps réel, express à Abidjan |
| 27 – 30 s | « Vous êtes vendeur ? Ouvrez votre boutique en ligne » : commission unique de 5 % |
| 30 – 35 s | Fin : logo, devise, « Commandez sur bethanie.vercel.app » |

Les textes et les images viennent du site (logo, couleurs, polices, illustrations des catégories, photos de produits).

## Modifier et refaire la vidéo

- Textes, couleurs, durées : `index.html` (chaque scène est commentée ; la ligne de temps est dans `build()`).
- Aperçu : servir le dossier du projet (par exemple avec `rendu.mjs` arrêté juste après le lancement du serveur) et
  ouvrir `http://localhost:4300/marketing/video-pub/index.html` : la vidéo se joue en boucle.
- Fabrication : `node rendu.mjs <chemin de ffmpeg.exe> [sortie.mp4]` (Microsoft Edge, ffmpeg et puppeteer-core
  requis ; `PUPPETEER_DIR` si puppeteer-core n'est pas installé dans le projet).

## À savoir avant de publier

- La vidéo est **muette** : ajoutez une musique libre de droits dans WhatsApp, TikTok, Instagram ou CapCut.
- Le paiement en ligne (Wave, Orange Money…) est encore en **mode test** sur le site : publier la vidéo quand le
  paiement réel est activé, ou retirer cette scène.
