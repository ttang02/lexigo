# Lexigo

Implémentation web du jeu de mots **Lexigo** en français. Trouve un maximum de mots dans une grille 4×4 en glissant d'une lettre à l'autre avant la fin du timer, marque des points selon la longueur des mots et les bonus de cases, puis compare ton score sur un leaderboard partagé. Un mode **Replay du robot** rejoue ensuite la solution optimale calculée côté serveur, tuile par tuile.

## Fonctionnalités

- **Grille 4×4** avec lettres pondérées (fréquences du français), bonus de lettre (DL/TL) et de mot (DW/TW)
- **Sélection au glissé** (souris / tactile) avec tracé SVG reliant les tuiles, flash de validation et score flottant
- **Validation serveur** : dictionnaire français chargé en Trie en mémoire, vérification du chemin (adjacence, pas de réutilisation)
- **Timer 2 min**, score en direct, légende des bonus repliable
- **Écran de fin animé** : score révélé, rang parmi les joueurs, ghost buttons de navigation
- **Robot replay** : solution optimale rejouée en surbrillance progressive, mot par mot
- **Leaderboard persistant** (SQLite, upsert par pseudo)
- **Accessibilité** : focus visible, respect de `prefers-reduced-motion`, ARIA sur la grille
- **Gestion d'erreur réseau** : reconnexion / retry sur les appels API

## Stack technique

| Côté | Techno |
|---|---|
| Client | React 18, Vite 5, Tailwind CSS 3, Framer Motion 11 |
| Serveur | Node 20, Express 5, `node:sqlite` (built-in), Trie en mémoire |
| Tests | Vitest 2, React Testing Library, Supertest |
| Lint | ESLint 9 (flat config) |
| Monorepo | pnpm workspaces |

## Arborescence

```
ruzzle/
├── client/                  # Front React + Vite
│   ├── src/
│   │   ├── components/      # Tile, Grid, Timer, BonusLegend, FloatingScore, Leaderboard…
│   │   ├── screens/         # Menu, Game, End, RobotReplay, LeaderboardScreen
│   │   ├── hooks/           # useDrag, useTimer, useGameState…
│   │   ├── styles/          # Tailwind config, globals
│   │   ├── api.js           # client HTTP (/api/grid, /validate, /scores)
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/                  # API Express
│   ├── src/
│   │   ├── index.js         # bootstrap
│   │   ├── app.js           # routes /api/*
│   │   ├── grid.js          # génération de grille pondérée
│   │   ├── gridCache.js     # cache TTL des grilles servies
│   │   ├── dict.js          # chargement + Trie du dictionnaire FR
│   │   ├── solver.js        # DFS solution optimale (pour le replay)
│   │   ├── validate.js      # validation chemin + score
│   │   ├── score.js         # règles de scoring (longueur + bonus)
│   │   └── db.js            # SQLite leaderboard
│   ├── data/
│   │   ├── dict.txt         # dictionnaire FR (à fournir, voir Setup)
│   │   └── scores.sqlite    # créé au runtime
│   ├── tests/
│   └── package.json
├── docs/superpowers/        # specs & plans
├── package.json             # workspace root
├── pnpm-workspace.yaml
└── .env.example
```

## Prérequis

- **Node.js ≥ 20** (le serveur utilise le module built-in `node:sqlite`)
- **pnpm ≥ 9** (`npm install -g pnpm`)
- Un fichier dictionnaire français (un mot par ligne, UTF-8) — non distribué dans le repo

## Installation

```bash
# 1. Cloner le dépôt
git clone <url-du-repo> ruzzle
cd ruzzle

# 2. Installer les dépendances des deux workspaces
pnpm install

# 3. Configurer l'environnement
cp .env.example .env
# (ajuste DICT_PATH / PORT / GRID_TTL_MS si besoin)

# 4. Fournir un dictionnaire FR
#    Place un fichier texte (un mot par ligne, UTF-8) dans :
#    server/data/dict.txt
#    Les mots sont normalisés au chargement (uppercase, accents retirés),
#    longueur min : 2.

# 5. Démarrer en développement
pnpm dev
```

Une fois lancé :

- Client : <http://localhost:5173>
- Serveur API : <http://localhost:3001>

## Variables d'environnement (`.env`)

| Variable | Défaut | Description |
|---|---|---|
| `DICT_PATH` | `server/data/dict.txt` | Chemin vers le dictionnaire FR |
| `PORT` | `3001` | Port d'écoute du serveur Express |
| `NODE_ENV` | `development` | Mode Node |
| `GRID_TTL_MS` | `600000` | Durée de vie d'une grille en cache serveur (10 min) |

## Scripts

À la racine (monorepo pnpm) :

| Commande | Description |
|---|---|
| `pnpm dev` | Lance client + serveur en parallèle (concurrently) |
| `pnpm build` | Build de production du client (`client/dist`) |
| `pnpm test` | Lance les suites Vitest des deux workspaces |
| `pnpm lint` | Lint ESLint sur client + serveur |

Scripts ciblés :

```bash
pnpm --filter client dev        # client seul (Vite)
pnpm --filter client test       # tests front
pnpm --filter server dev        # serveur seul (nodemon)
pnpm --filter server test       # tests back (Vitest + Supertest)
pnpm --filter server start      # serveur en production
```

## Mise en production

```bash
pnpm build                            # build du client
NODE_ENV=production pnpm --filter server start
```

Le client buildé (`client/dist`) peut être servi par n'importe quel host statique (Nginx, Caddy, Vercel, Netlify…) en pointant `/api/*` vers le serveur Node.

## API

| Méthode | Chemin | Description |
|---|---|---|
| `GET` | `/api/grid` | Génère une nouvelle grille et la met en cache (TTL configurable). |
| `POST` | `/api/validate` | Valide un chemin + mot contre une grille en cache ; renvoie le score. |
| `POST` | `/api/scores` | Upsert d'un score par pseudo (uniquement si supérieur à l'existant). |
| `GET` | `/api/scores?limit=N` | Top N des scores (décroissant) + total de joueurs. |
| `GET` | `/api/solve?gridId=…` | Solution optimale d'une grille en cache (utilisé par le replay robot). |

## Tests

```bash
pnpm test                                    # tout
pnpm --filter client test                    # front uniquement
pnpm --filter server test                    # back uniquement
pnpm --filter client exec vitest --coverage  # couverture
```

## Documentation interne

Specs détaillées et plans d'implémentation : `docs/superpowers/specs/`
(notamment `2026-05-15-ruzzle-game-design.md` pour le design complet).
