# Game Polish v2 — UX & Robustesse

**Date:** 2026-05-19
**Scope:** 6 améliorations client + 1 changement serveur mineur. Pas de refactoring hors périmètre.

---

## 1. Trait de connexion entre les tuiles (Game)

**Fichier :** `client/src/components/Grid.jsx`

Un `<svg>` positionné `absolute inset-0 pointer-events-none w-full h-full` est ajouté à l'intérieur du conteneur `relative` de la grille. ViewBox `"0 0 480 480"` avec `preserveAspectRatio="xMidYMid meet"`.

Centre d'une tuile à l'index `i` dans le viewBox :
```js
const col = i % 4;
const row = Math.floor(i / 4);
const cx = 8 + col * 118 + 55; // padding 8, stride (tile 110 + gap 8)
const cy = 8 + row * 118 + 55;
```

Un `<polyline>` est tracé à travers les centres des tuiles dans l'ordre de `path`. Il n'est rendu que si `path.length >= 2` et `!reduced`.

```jsx
<polyline
  points={path.map(i => `${cx(i)},${cy(i)}`).join(" ")}
  fill="none"
  stroke="#8B5CF6"
  strokeWidth="5"
  strokeLinecap="round"
  strokeLinejoin="round"
  opacity="0.7"
/>
```

Le SVG est inséré après les tuiles dans le markup, donc il s'affiche par-dessus via `absolute`. Les tuiles gardent leur `pointer-events` normal.

---

## 2. Score en temps réel (Game)

**Fichier :** `client/src/screens/Game.jsx`

Le score total est calculé inline : `words.reduce((s, w) => s + w.score, 0)`.

Il est affiché à droite dans la même ligne que le `<Timer>` :
```jsx
<div className="flex items-center justify-between">
  <Timer remainingMs={remainingMs} totalMs={DURATION} />
  <span className="font-display font-bold text-xl text-primary tabular-nums">
    {words.reduce((s, w) => s + w.score, 0)} <span className="text-sm text-text-muted font-normal">pts</span>
  </span>
</div>
```

Pas de state supplémentaire — calculé à chaque render depuis `words`.

---

## 3. Explication des bonus (dépliable)

**Fichiers :** `client/src/components/BonusLegend.jsx` (nouveau), `client/src/screens/Game.jsx`

Nouveau composant `BonusLegend` :
- State local `open` (false par défaut)
- Quand fermé : un bouton `"? Bonus"` en petites capitales, style discret
- Quand ouvert : `AnimatePresence` + `motion.div` avec `initial={{ height: 0, opacity: 0 }}`, `animate={{ height: "auto", opacity: 1 }}`, `transition={{ duration: 0.2 }}`
- Contenu : grille 2 colonnes avec les 4 badges colorés et leur description

```jsx
const BONUSES = [
  { code: "DL", label: "Lettre ×2", cls: "bg-bonus-dl" },
  { code: "TL", label: "Lettre ×3", cls: "bg-bonus-tl" },
  { code: "DW", label: "Mot ×2",    cls: "bg-bonus-dw" },
  { code: "TW", label: "Mot ×3",    cls: "bg-bonus-tw" },
];
```

Dans `Game.jsx`, `<BonusLegend />` est placé entre les boutons Valider/Effacer et le texte de feedback.

---

## 4. Écran de fin animé

**Fichiers :** `client/src/screens/End.jsx`, `server/routes.js`

### 4a. Animation score

Quand `submitted` passe à `true`, le score s'affiche avec :
```jsx
<motion.div
  initial={{ scale: 0.7, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 300, damping: 22 }}
>
  <span className="font-display text-5xl font-bold text-success">{total}</span>
  <span className="text-text-muted text-sm"> pts</span>
</motion.div>
```

### 4b. Rang + total joueurs

Le rang est révélé 500ms après le score avec un `motion.p` qui a `transition={{ delay: 0.5, duration: 0.3 }}`. La phrase : `"Tu es #N sur X joueurs"` avec rang en `text-accent font-bold` et total en `text-text-muted`.

Si `total` est absent de la réponse API, on affiche `"Ton rang : #N"` sans le total.

### 4c. Changement serveur

`POST /scores` retourne désormais `{ rank, total }` où `total` est le nombre total de scores dans la base. Changement dans `server/routes.js` :
```js
const total = await db.countScores(); // SELECT COUNT(*) FROM scores
res.json({ rank, total });
```

Ajout de `countScores()` dans `server/db.js`.

---

## 5. Boutons ghost cohérents

**Fichiers :** `client/src/screens/Menu.jsx`, `client/src/screens/End.jsx`

Style unifié pour les boutons secondaires :
```
border border-surface-2 text-text-muted px-6 py-2 rounded-lg
hover:border-primary/40 hover:text-text-base transition-colors duration-150
```

Appliqué à :
- `Menu.jsx` → bouton "Voir le classement"
- `End.jsx` → bouton "Voir la solution du robot" (×2 occurrences)

Le bouton "Menu" dans End garde son style `bg-surface` (il est dans un groupe de boutons primaires).

---

## 6. Gestion d'erreur réseau (fetchGrid)

**Fichier :** `client/src/screens/Game.jsx`

Ajout d'un state `gridError`:
```js
const [gridError, setGridError] = useState(null);
```

`fetchGrid` enveloppé dans un try/catch :
```js
useEffect(() => {
  fetchGrid()
    .then(setGrid)
    .catch(() => setGridError(true));
}, []);
```

Bouton "Réessayer" qui remet `gridError` à `null` et `grid` à `null`, déclenchant un nouveau `useEffect` :
```jsx
const [retryCount, setRetryCount] = useState(0);

useEffect(() => {
  setGrid(null);
  setGridError(null);
  fetchGrid()
    .then(setGrid)
    .catch(() => setGridError(true));
}, [retryCount]);

if (gridError) return (
  <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
    <p className="text-danger">Impossible de charger la grille. Vérifie ta connexion.</p>
    <button
      onClick={() => setRetryCount(c => c + 1)}
      className="bg-surface px-6 py-2 rounded-lg"
    >
      Réessayer
    </button>
  </div>
);
```

Un state `retryCount` (initialisé à 0) est ajouté. Le bouton "Réessayer" l'incrémente. Le `useEffect` de `fetchGrid` a `retryCount` dans ses dépendances, ce qui déclenche un nouvel appel à chaque retry :

---

## File map

| Action  | Fichier |
|---------|---------|
| Modify  | `client/src/components/Grid.jsx` — SVG overlay |
| Modify  | `client/src/components/Grid.test.jsx` — couvre le polyline |
| Create  | `client/src/components/BonusLegend.jsx` |
| Create  | `client/src/components/BonusLegend.test.jsx` |
| Modify  | `client/src/screens/Game.jsx` — score live + BonusLegend + error |
| Modify  | `client/src/screens/End.jsx` — animations score + rang |
| Modify  | `client/src/screens/Menu.jsx` — bouton ghost |
| Modify  | `server/routes.js` — retourne `total` dans POST /scores |
| Modify  | `server/db.js` — ajoute `countScores()` |
| Modify  | `server/tests/routes.test.js` — vérifie `total` dans la réponse |
| Modify  | `client/src/api.js` — lit `total` dans `submitScore` |

---

## Testing strategy

- `Grid.test.jsx` — vérifie qu'un `<polyline>` est rendu quand `path.length >= 2`, absent quand `< 2`
- `BonusLegend.test.jsx` — fermé par défaut, s'ouvre au clic, contient les 4 codes
- `Game.jsx` (intégration légère) — pas de test unitaire supplémentaire pour le score live (dérivé de `words`)
- `End.jsx` — smoke test : score affiché, rang affiché après soumission
- `routes.test.js` — `POST /scores` retourne `{ rank, total }` avec `total` numérique

## Out of scope

- Son
- Tutoriel interactif
- Animations de transition entre écrans
- Persistance du score en localStorage
