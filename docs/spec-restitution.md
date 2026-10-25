# Spec — Restitution des pesées (tableau de bord)

> **Projet :** Professeur Machimoto (`io.github.azaameth.machimoto`)
> **Destinataire :** Claude Code
> **Statut :** décisions validées le 25/10/2026 avec Maxime. Les points marqués **[À VALIDER]** doivent être confirmés avant d'être implémentés.

---

## 🤖 Instructions pour Claude Code

1. Respecte la **règle d'or** du plan projet : toute la logique de calcul vit dans `src/core/`, en **fonctions pures**, sans dépendance à Firebase, Capacitor ou React.
2. Les composants de `src/features/` ne font qu'afficher ce que renvoient ces fonctions.
3. Écris les **tests unitaires (Vitest) avant l'interface**. Les cas de test de la section 7 sont obligatoires.
4. Ne change aucun seuil ni aucune constante sans le proposer explicitement : ce sont des décisions du registre.
5. Le poids est un **champ chiffré** (AES-GCM). Tous les calculs se font côté client, après déchiffrement.
---

## 1. Décisions (à reporter dans le registre du plan projet)

| # | Décision | Raison |
|---|---|---|
| D29 (révisée) | Graphique **en ligne uniquement** (on supprime les modes Points et Barres) | Simplicité ; la tendance porte l'information |
| Dxx | Tendance = **moyenne mobile exponentielle**, facteur 0,1, ajusté aux jours manquants | Plus réactive et plus robuste que la moyenne sur 7 jours |
| Dxx | Rythme = **régression linéaire sur 28 jours**. Projection à **4 semaines** avec fourchette, masquée si moins de 14 pesées ou si le rythme est stable | Éviter la fausse précision |
| Dxx | **Une pesée par jour.** L'identifiant du document est la date locale ; une nouvelle saisie remplace la précédente | Pas de doublon, synchro simple |
| Dxx | Profil v1.1 : **usage** (perdre / gagner / maintenir), **cible**, **tolérance** choisie par l'utilisateur | Couvrir les trois usages |
| Dxx | Couleurs **neutres** tant qu'aucun usage n'est défini | Une baisse n'est pas forcément un progrès |

---

## 2. Modèle de données

### Pesée

```
users/{uid}/pesees/{YYYY-MM-DD}
{
  poids: "v1:<iv>:<données>",   // chiffré (AES-GCM), en kg, valeur décimale
  majLe: Timestamp               // serverTimestamp(), en clair
}
```

- **Identifiant = date locale** de l'utilisateur au format `YYYY-MM-DD`, calculée dans son fuseau horaire, **jamais en UTC**. Exemple : une saisie le 25/10/2026 à 0 h 30 heure de Paris a pour identifiant `2026-10-25`.
- Une nouvelle saisie le même jour **réécrit** le document (`set`, pas `add`). En hors ligne, la règle « dernière écriture gagnante » s'applique naturellement.
- La date est **en clair**, puisqu'elle sert au tri et aux requêtes par période. Seul le poids est chiffré.
- La saisie d'une date passée est autorisée : c'est la même mécanique.
### Profil (v1.1)

```
users/{uid}/meta/profil
{
  usage: "perdre" | "gagner" | "maintenir" | null,
  cible: "v1:<iv>:<données>",       // chiffré, en kg
  tolerance: number | null,         // en kg, seulement si usage = "maintenir"
  majLe: Timestamp
}
```

- `tolerance` : valeur par défaut **1,0 kg**, réglable **par pas de 0,5 kg**, de **0,5 à 3,0 kg**. Le choix revient à l'utilisateur.
- Tant que `usage` vaut `null`, on applique l'affichage v1 neutre.
> Mettre à jour `firestore.rules` et `tests/rules/` : mêmes règles que le reste de `users/{uid}/**`, avec validation de forme (champs attendus, `tolerance` dans les bornes).

---

## 3. Constantes

À regrouper dans `src/core/analyse/constantes.ts` :

```ts
export const FACTEUR_LISSAGE = 0.1;          // moyenne mobile exponentielle
export const FENETRE_RYTHME_JOURS = 28;      // fenêtre de la régression
export const MIN_PESEES_RYTHME = 14;         // en dessous : rythme et projection masqués
export const SEUIL_STABLE_KG_SEMAINE = 0.1;  // |rythme| < seuil → « stable »
export const HORIZON_PROJECTION_JOURS = 28;  // 4 semaines
export const T_FOURCHETTE = 2;               // ≈ intervalle à 95 %
export const HORIZON_MAX_OBJECTIF_JOURS = 90; // [À VALIDER] au-delà, pas de date affichée
export const TOLERANCE = { defaut: 1.0, min: 0.5, max: 3.0, pas: 0.5 };
```

---

## 4. Calculs (`src/core/analyse/`)

Toutes les fonctions prennent en entrée des pesées **déjà déchiffrées et triées par date croissante** :

```ts
type Pesee = { date: string /* YYYY-MM-DD */; poids: number };
```

Les écarts entre dates se comptent en **jours calendaires**. Le calcul se fait sur les chaînes `YYYY-MM-DD`, sans passer par des heures, pour éviter les pièges du changement d'heure.

### 4.1 Tendance — `calculerTendance(pesees): PointTendance[]`

- Premier point : `tendance = poids`.
- Points suivants, avec `g` = nombre de jours depuis la pesée précédente (`g ≥ 1`) :
```
  alpha = 1 − (1 − FACTEUR_LISSAGE)^g
  tendance = tendancePrecedente + alpha × (poids − tendancePrecedente)
```
- On renvoie un point de tendance par pesée (`{ date, tendance }`). Aucun point n'est inventé pour les jours sans pesée.
### 4.2 Rythme — `calculerRythme(pesees, aujourdhui): Rythme | null`

- On garde les pesées des `FENETRE_RYTHME_JOURS` derniers jours, aujourd'hui compris.
- Si on en a moins de `MIN_PESEES_RYTHME`, on renvoie `null`.
- Régression linéaire (moindres carrés) **sur les poids bruts**, avec `x` = nombre de jours depuis la première pesée de la fenêtre :
```
  pente (kg/jour), résidus → s = √(SCR / (n − 2)), Sxx = Σ(x − x̄)²
  erreurPente = s / √Sxx
```
- On renvoie :
```ts
  type Rythme = {
    kgParSemaine: number;       // pente × 7
    erreurKgParJour: number;    // erreurPente
    stable: boolean;            // |kgParSemaine| < SEUIL_STABLE_KG_SEMAINE
    nbPesees: number;
  };
```

### 4.3 Variation sur 30 jours — `calculerVariation(tendance, aujourdhui, 30)`

- On calcule `tendanceActuelle − tendance à la date de référence`. La date de référence est le **dernier point de tendance à J−30 ou avant**.
- S'il n'existe pas de point à J−30 ou avant, on renvoie `null` (la tuile affiche « historique insuffisant »).
- La variation se calcule **toujours sur la tendance**, jamais sur les pesées brutes.
### 4.4 Projection — `calculerProjection(tendanceActuelle, rythme, jours)`

- Si `rythme` est `null` ou `stable`, on renvoie `null`.
- Pour chaque `h` de 1 à `HORIZON_PROJECTION_JOURS` :
```
  centre = tendanceActuelle + pente × h
  marge  = T_FOURCHETTE × erreurPente × h
  → { date, centre, bas: centre − marge, haut: centre + marge }
```
- La projection porte sur la **tendance**, pas sur une pesée future. Le libellé doit le refléter : « tendance attendue », pas « vous pèserez ».
### 4.5 Objectif (v1.1) — `estimerObjectif(profil, tendanceActuelle, rythme)`

Le résultat est une **union discriminée**, pour que l'interface ne puisse pas oublier un cas :

```ts
type EtatObjectif =
  | { type: "sansProfil" }
  | { type: "atteint" }                                    // perdre/gagner : cible franchie
  | { type: "donneesInsuffisantes" }                       // rythme null
  | { type: "stable" }                                     // pas de date estimable
  | { type: "mauvaisSens"; ecartKg: number }
  | { type: "lointain" }                                   // date > HORIZON_MAX_OBJECTIF_JOURS
  | { type: "date"; probable: string; auPlusTot: string; auPlusTard: string | null }
  | { type: "dansZone"; depuisJours: number }              // maintenir
  | { type: "horsZone"; sens: "dessus" | "dessous"; ecartKg: number };
```

**Perdre / gagner**
- « Atteint » : la tendance a franchi la cible dans le sens voulu.
- La date probable vaut `(cible − tendanceActuelle) / pente`, en jours.
- La fourchette se calcule avec `pente ± T_FOURCHETTE × erreurPente`. Si la borne prudente de la pente est nulle ou va dans le mauvais sens, `auPlusTard = null` (affiché : « au plus tôt le … »).
**Maintenir**
- La zone est `[cible − tolerance, cible + tolerance]`, et le statut se calcule **sur la tendance**.
- `depuisJours` = nombre de jours consécutifs, en remontant depuis aujourd'hui, où la tendance est restée dans la zone.
- Il n'y a jamais de date à projeter.
---

## 5. Interface — tableau de bord

### Structure

```
┌──────────────┬──────────────┐
│ Tendance     │ Rythme       │
│ 78,4 kg      │ −0,35 kg/sem │
├──────────────┼──────────────┤
│ Sur 30 jours │ Projection   │
│ −1,4 kg      │ (voir § 5.2) │
└──────────────┴──────────────┘
┌─────────────────────────────┐
│ Graphique en ligne          │
│ [7 j] [30 j] [90 j] [Tout]  │
└─────────────────────────────┘
[ Pesée du jour : 78,6 kg — modifier ]
```

- La grille de tuiles fait 2 × 2 et doit rester lisible à **360 px** de large.
- Les états chargement / vide / erreur sont obligatoires, comme pour tous les écrans du plan.
- **État vide** (aucune pesée) : on n'affiche ni tuiles ni graphique, seulement une invitation à saisir la première pesée.
### 5.1 Graphique

- Les **pesées** sont de petits points discrets, de faible contraste.
- La **ligne de tendance** est le trait principal, bien visible.
- La **projection** prolonge la tendance en pointillés, avec un cône semi-transparent entre `bas` et `haut`.
- v1.1, perdre / gagner : on ajoute une ligne horizontale de cible, avec son libellé.
- v1.1, maintenir : on ajoute une bande horizontale semi-transparente pour la zone de tolérance.
- On conserve le sélecteur de période et l'option d'axe Y depuis 0 décidés précédemment ; seul le choix du type de graphique disparaît.
### 5.2 Tuile « Projection » selon l'état

| État | Affichage |
|---|---|
| v1, pas de rythme | « Encore N pesées pour estimer » (N = 14 − nbPesees) |
| v1, rythme stable | « Stable » |
| v1, rythme disponible | « Dans 4 sem. : 77,0 kg (76,4 – 77,6) » |
| `atteint` | « Objectif atteint » |
| `date` | « Objectif vers mi-janvier (fin déc. – fin janv.) » |
| `date` sans `auPlusTard` | « Objectif au plus tôt fin décembre » |
| `stable` / `mauvaisSens` | « Pas de date estimable au rythme actuel » |
| `lointain` | « Plus de 3 mois au rythme actuel » |
| `dansZone` | « Dans la zone depuis 23 jours » |
| `horsZone` | « 0,6 kg au-dessus de la zone » |

Les dates s'affichent **arrondies** (début / mi- / fin de mois). Un jour précis serait de la fausse précision.

### 5.3 Couleurs

- **Sans usage défini** : palette neutre, sans vert ni rouge, quel que soit le sens de la variation.
- **Avec usage** : un accent sobre selon que le mouvement va vers l'objectif ou s'en éloigne. Jamais de rouge alarmant ni de formulation culpabilisante.
- La couleur ne doit jamais être le seul porteur d'information : signe, flèche ou texte l'accompagnent toujours.
### 5.4 Saisie

- Si une pesée existe déjà pour aujourd'hui, le formulaire est **pré-rempli** avec la mention « Pesée du jour : X kg — modifier ». Il n'y a pas de boîte de confirmation.
- Bornes de saisie **[À VALIDER]** : entre 20 et 300 kg, une décimale.
---

## 6. Arborescence

```
src/core/analyse/
├── constantes.ts
├── dates.ts          # dateLocale(), ecartJours() — calcul sur YYYY-MM-DD
├── tendance.ts
├── rythme.ts
├── variation.ts
├── projection.ts
├── objectif.ts
└── *.test.ts
src/features/tableau-de-bord/
├── TableauDeBord.tsx
├── Tuile.tsx
├── GraphiquePesees.tsx
└── SaisiePesee.tsx
```

---

## 7. Cas de test obligatoires

**Dates**
- [ ] Saisie le 25/10/2026 à 0 h 30, fuseau Europe/Paris → identifiant `2026-10-25`.
- [ ] Un écart entre deux dates qui encadrent le changement d'heure (25/10/2026) compte des jours entiers.
**Tendance**
- [ ] `[80 (J0)]` → tendance 80.
- [ ] `[80 (J0), 79 (J1)]` → 79,9.
- [ ] `[80 (J0), 79 (J3)]` → `alpha = 0,271` → 79,729.
**Rythme**
- [ ] 13 pesées sur 28 jours → `null`.
- [ ] 28 pesées parfaitement linéaires à −0,05 kg/jour → −0,35 kg/sem, `erreurPente = 0`.
- [ ] Rythme de −0,08 kg/sem → `stable = true`.
- [ ] Les pesées antérieures à la fenêtre de 28 jours sont ignorées.
**Variation**
- [ ] Historique de 20 jours → `null`.
- [ ] La variation se calcule sur la tendance (un test avec une pesée brute aberrante le jour J ne doit pas la répercuter telle quelle).
**Projection**
- [ ] Rythme `stable` ou `null` → `null`.
- [ ] Avec `erreurPente = 0` → `bas = haut = centre`.
- [ ] La marge croît linéairement avec `h`.
**Objectif**
- [ ] Les 9 types de `EtatObjectif` sont chacun couverts par au moins un test.
- [ ] Usage « perdre », tendance sous la cible → `atteint`.
- [ ] Usage « maintenir », tendance sortie de la zone hier → `horsZone` ; rentrée depuis 3 jours → `dansZone`, `depuisJours = 3`.
**Données**
- [ ] Deux saisies le même jour → un seul document, contenant la dernière valeur.
- [ ] Dans la console Firebase (émulateur), `poids` et `cible` sont illisibles.
- [ ] Règles : `tolerance` hors bornes refusée.
---

## 8. Découpage

| Version | Contenu |
|---|---|
| **v1** | Sections 2 (pesée), 3, 4.1 à 4.4, 5 sans objectif, tests associés |
| **v1.1** | Profil (section 2), 4.5, ligne de cible / zone de tolérance, couleurs liées à l'usage |

## ❓ Questions ouvertes

| # | Question | Proposition |
|---|---|---|
| Q1 | Horizon maximal pour afficher une date d'objectif | 90 jours (au-delà, la projection linéaire n'est plus fiable) |
| Q2 | Bornes de saisie du poids | 20 – 300 kg, une décimale |

---

## ⚖️ Arbitrages du 25/10/2026 (Maxime) — priment sur le texte ci-dessus

| Point de la spec | Arbitrage | Registre |
|---|---|---|
| § 2 Modèle `{ poids, majLe: serverTimestamp }` | **On garde le modèle existant** : `{ date, poids, note?, createdAt, updatedAt }`, horodatages en millisecondes, note facultative chiffrée | D16, D20 |
| Q2 Bornes 20 – 300 kg | **On garde 0 – 5 000 kg** | D21 |
| § 5 Périodes `[7 j] [30 j] [90 j] [Tout]` | **7 j / 30 j / 90 j / 1 an / Tout** | D29 |
| § 5 Écran | **Tableau de bord en 1er onglet**, puis Historique (liste, modifier, supprimer, date passée), puis Export & réglages | D34 |
| Moyenne 7 j (2.4) | Remplacée par la **tendance** (§ 4.1), toujours affichée | D29, D30 |
| § 6 Arborescence | `src/core/analyse/` comme prévu ; `SaisiePesee` réutilise le formulaire existant | — |
| Q1 Horizon objectif (90 j) | Reste ouvert : concerne la v1.1 | — |
