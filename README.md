# Facturation freelance

Application de facturation en ligne : devis, factures, acomptes, avoirs,
abonnements, suivi du temps (CRA), encaissements et relances d'impayés.

Pensée pour un freelance à **Madagascar** — identifiants **NIF / STAT / RCS**,
**RIB malgache** et **Mobile Money**, montant en toutes lettres, Ariary — mais
entièrement paramétrable pour n'importe quel pays et n'importe quelle devise.
Les taux de change sont saisis à la main : un cours du jour est demandé (et
historisé) à chaque encaissement en devise étrangère.

**Déploiement** : Vercel, base **Neon
Postgres** (branche par défaut). Accès par compte unique propriétaire —
mot de passe + 2FA TOTP, inscriptions fermées (`scripts/seed-owner.ts`).

---

## Démarrer en local

```bash
npm install        # génère aussi le client Prisma (postinstall)
npm run dev        # http://127.0.0.1:3001
```

Copiez `.env.example` vers `.env` : le développement local pointe sur la
branche **dev** du projet Neon, la production sur la branche par défaut.
`prisma migrate dev` s'exécute sur la branche dev ; `prisma migrate deploy`
(avec les URLs de production) applique ensuite les migrations en prod.

Le serveur de développement utilise **Turbopack** et le port **3001** : le cache
disque de webpack saturait la mémoire sur de longues sessions, et le port 3000
est souvent déjà pris. Repli si besoin : `npm run dev:webpack`.

**Sauvegarde** : Neon conserve un historique (point-in-time restore limité en
offre gratuite). Pour un export à froid : `Export factures / encaissements`
dans l'app, ou `pg_dump` sur l'URL directe.

---

## Première mise en route

Le tableau de bord affiche une liste de démarrage tant qu'elle n'est pas complète :

1. **Mon entreprise → Identité** : raison sociale, adresse, logo, cachet, signature.
2. **Mon entreprise → Identité → Identifiants légaux** : NIF, STAT, RCS… La liste
   est libre : ajoutez un numéro de TVA, un SIRET ou un IFU si besoin.
3. **Mon entreprise → Coordonnées de paiement** : RIB (code banque / guichet /
   compte / clé), IBAN, ou numéro MVola, Orange Money, Airtel Money.
4. **Clients** : le premier client, avec ses propres identifiants légaux.

---

## Ce que fait l'application

### Documents

| Type | Usage |
|---|---|
| **Devis** | Proposition commerciale, convertible en facture en un clic. |
| **Facture** | Le document de référence. |
| **Facture d'acompte** | Un pourcentage d'un devis ou d'une facture ; déduit automatiquement du solde. |
| **Avoir** | Note de crédit rectifiant une facture. |
| **Proforma** | Facture sans valeur comptable. |

**Numérotation continue.** Un document reste brouillon tant qu'il n'est pas
validé ; le numéro n'est réservé qu'à la validation, dans la même transaction.
Abandonner un brouillon ne laisse donc aucun trou dans la suite.

Gabarits paramétrables dans **Mon entreprise → Numérotation** :
`{PREFIX}` `{YYYY}` `{YY}` `{MM}` `{SEQ}`, avec remise à zéro annuelle ou mensuelle.

### Client final et agence

Un document distingue **qui est facturé** (une agence, une ESN, une société de
portage) de **pour qui la prestation est réalisée** (le client final). Les deux
apparaissent sur le PDF. Une mission porte cette règle une fois pour toutes.

### Cinq modèles de facture

`Classique`, `Moderne`, `Minimal`, `Élégant`, `Compact`.

Depuis la fiche d'un document, vous pouvez **essayer chaque modèle en direct**
dans l'aperçu : rien n'est enregistré tant que vous ne cliquez pas sur
« Appliquer ce modèle ». Le modèle par défaut se règle dans
**Mon entreprise → Modèles & mentions**, avec la couleur d'accent.

Les cinq modèles sont réglés pour qu'une facture courante **tienne sur une seule
page** ; `node scripts/pdf-pages.mjs <id>` le vérifie document par document.

### L'aperçu est en HTML, pas en PDF

L'aperçu affiché dans l'application est rendu en HTML à partir du même modèle de
vue que le PDF. C'est délibéré : certains navigateurs, et surtout les
gestionnaires de téléchargement, interceptent toute URL `application/pdf` — ce
qui produisait un cadre blanc et déclenchait un téléchargement à la simple
ouverture d'une facture. La page ne demande donc plus aucun PDF au chargement.

Le PDF téléchargé reste la référence pour l'impression et l'envoi au client.

### Galerie

`/galerie` présente trois choix côte à côte :

1. **Quatre propositions d'interface** (menu latéral ou barre du haut, dense ou
   aéré, clair ou sombre) — maquettes statiques, à implémenter une fois choisie ;
2. **Vingt-quatre logos**, rangés par famille et appliqués d'un clic ;
3. **Les cinq modèles de facture**, rendus avec votre identité réelle sur une
   facture d'exemple qui n'est jamais enregistrée.

### Logos

Vingt-quatre marques en cinq familles : *Monogrammes*, *Métier et code*,
*Géométrie*, *Madagascar*, *Typographiques*.

Elles sont décrites une seule fois, en primitives géométriques
(`src/lib/logos.ts` — rectangles, cercles, ellipses, polygones, chemins, textes,
dégradés linéaires, opacité), puis rendues par deux moteurs : SVG dans le
navigateur et `Svg` du moteur PDF. Aucune image bitmap, donc net à toute taille,
et aucune conversion à installer.

Certaines marques portent leur **propre couleur** ; on peut alors l'adopter comme
couleur d'accent de toute la facture, d'une case à cocher.

Le logo choisi est rangé dans les réglages libres (`AppSetting`), sans colonne
dédiée. Une image téléversée depuis **Mon entreprise** reste prioritaire.

Les identifiants de dégradés sont préfixés par instance : sans cela, deux
marques affichées sur la même page se voleraient leurs couleurs.

### Facture électronique (Factur-X)

Depuis la fiche d'une facture, d'un acompte ou d'un avoir :

- **PDF Factur-X** : le PDF avec le XML normalisé joint sous le nom `factur-x.xml` ;
- **Le XML seul**, pour un dépôt sur une plateforme.

Profil **BASIC WL** (CII, EN 16931) : parties, dates, ventilation de TVA,
échéance et totaux — sans le détail des lignes, ce que retiennent la plupart des
plateformes pour les échanges courants.

**Limite assumée** : le XML est correctement rattaché, mais le fichier n'est pas
certifié **PDF/A-3**. Cette certification exige un profil colorimétrique ICC et
des métadonnées XMP que le moteur PDF utilisé ne permet pas d'écrire. À vérifier
si votre client l'exige formellement.

Chaque modèle imprime : en-tête entreprise et identifiants légaux, destinataire
et ses identifiants, client final le cas échéant, détail des prestations,
ventilation de TVA, retenue à la source, acomptes déduits, **montant en toutes
lettres** (« Arrêtée la présente facture à la somme de… »), coordonnées de
paiement, mentions légales, cachet et signature.

### Devises

Toutes les devises. Dix sont préchargées (MGA, EUR, USD, GBP, CHF, CAD, MUR,
ZAR, XOF, AED), les autres s'ajoutent par leur code ISO. Chaque devise porte son
symbole, sa position et son nombre de décimales — l'Ariary en utilise 0, l'euro 2.

Le tableau de bord convertit tout dans votre **devise de base** avec les taux que
vous saisissez.

### Temps / CRA

Saisissez vos journées par mission, puis **facturez la sélection** : une ligne de
facture par tarif appliqué, le détail des dates en description. Une saisie déjà
facturée ne peut plus être modifiée sans être détachée.

### Encaissements et relances

Enregistrez les règlements (virement, Mobile Money, espèces, chèque, PayPal,
Wise) : le statut et le reste dû se recalculent seuls. Pour les impayés, une
relance est **pré-rédigée selon son niveau** — du rappel courtois à la mise en
demeure — prête à copier dans votre e-mail.

### Sous-traitance : les intervenants déclarent eux-mêmes

**Sous-traitance → Demander une facture** produit un **lien privé et nominatif**
à transmettre à un intervenant (WhatsApp, e-mail — l'application n'envoie rien
elle-même). Il y détaille ses prestations sans compte ni mot de passe, avec le
total sous les yeux, et indique comment il souhaite être payé.

La déclaration reçue se reprend de deux façons :

- **dans une facture client** — depuis l'éditeur, « Facture d'un intervenant »
  verse ses lignes à la suite des vôtres, aux prix qu'il a déclarés (à vous
  d'ajuster votre marge) ; les totaux se recalculent aussitôt et plusieurs
  intervenants peuvent alimenter la même facture ;
- **dans un justificatif de reversement** — préremplissage des prestations, il
  ne reste qu'à saisir le cours de la banque et les frais.

Une déclaration reprise sort de la liste : aucun risque de l'importer deux fois.
Les devises ne se mélangent jamais — la déclaration est imposée dans la devise
de la demande.

**Sécurité.** C'est le seul point d'entrée sans session : jeton de 256 bits
**stocké haché** (une copie de la base ne rouvre aucun lien), lien expirant,
envoi unique et anti-rejeu, saisies plafonnées, page en `noindex`. Le
bénéficiaire et la devise viennent toujours de la base, jamais du formulaire
envoyé, et la page ne montre à l'intervenant que son propre nom et le vôtre.

### Exports comptables

`/api/export?type=factures` et `/api/export?type=encaissements` — CSV point-virgule
avec BOM, directement lisible par Excel en français. Filtrables par `du` et `au`
(`?du=2026-01-01&au=2026-12-31`).

---

## Notes techniques

### L'argent

Aucun montant n'est un décimal flottant. Tout est un **entier de milli-unités**
(×1000) : `12 500,50 €` → `12_500_500`. Les taux sont en **points de base**
(×100) : `20 %` → `2000`. Voir [`src/lib/money.ts`](src/lib/money.ts).

Ces entiers sont rangés dans des colonnes `REAL`, pas `INTEGER` : Prisma mappe
`Int` sur un entier 32 bits en SQLite, qui déborderait dès **2 147 483 Ar** une
fois converti en milli-unités — soit une facture ordinaire. Un double représente
exactement tout entier jusqu'à 2⁵³, très au-delà de tout montant réel.

La TVA est calculée **par groupe de taux**, pas ligne à ligne, et la remise
globale est répartie au prorata entre ces groupes : la ventilation imprimée est
donc toujours exacte, sans écart d'arrondi.

### Les espaces

Le français moderne sépare les milliers par une espace fine insécable (U+202F),
absente de l'encodage des polices standard du PDF — elle y disparaîtrait. Le
formatage lui substitue systématiquement l'espace insécable classique (U+00A0).

### Ce qui est protégé

Tout vit sous `src/app/(protected)/`, derrière `requireSession()`. Le middleware
n'est qu'un premier filtre : chaque action serveur et chaque route de fichier
(PDF, exports) refait le contrôle, parce que ce sont des endpoints HTTP à part
entière que le layout ne protège pas.

Deux exceptions, et deux seulement : `/login` et `/reversement/[token]`, l'espace
des intervenants, gardé par son seul jeton.

### Structure

```
src/lib/        calculs, formats, dates, numérotation (aucune dépendance à la base)
src/server/     accès aux données et actions serveur
src/pdf/        modèle de vue + les cinq gabarits PDF
src/components/ design system et écrans
src/app/        routes
prisma/         schéma, migrations, référentiels
scripts/        tests et outils de vérification
```

---

## Commandes

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement. |
| `npm run build` / `npm start` | Build et serveur de production. |
| `npm test` | Tests du moteur de calcul, de la numérotation, du montant en lettres, et intégration base. |
| `npm run verify` | Contrôle de bout en bout sur un serveur démarré (écrans, PDF, exports). |
| `npm run db:studio` | Explorateur de base Prisma. |
| `npm run db:migrate` | Nouvelle migration après modification du schéma. |
| `npm run lint` | ESLint. |

Outils de contrôle ponctuels :

```bash
node scripts/state.mjs                    # état de la base
node scripts/show-documents.mjs           # documents, avec leur modèle
node scripts/show-parties.mjs             # tiers, champ par champ
node scripts/pdf-pages.mjs <id>           # nombre de pages, modèle par modèle
node scripts/dump-pdf-text.mjs <id> [mod] # texte réellement imprimé sur le PDF
node scripts/check-facturx.mjs <id>       # contrôle du XML et de la pièce jointe
node scripts/preview-pdf.mjs              # un exemplaire de chaque modèle dans ./tmp-apercus
node scripts/inspect-pdf.mjs              # contrôle du contenu textuel des PDF
node scripts/cleanup-test-data.mjs        # efface les données de test et d'aperçu
```

Les scripts qui interrogent l'application supposent un serveur démarré sur
`http://localhost:3001` (`npm run dev`), ou passez l'URL en argument.

⚠️ Ne lancez jamais `npm run build` pendant que `npm run dev` tourne : les deux
partagent le dossier `.next`, et le build en cours de route le rend incohérent
(routes valides répondant 404). Arrêtez le serveur avant de construire.
