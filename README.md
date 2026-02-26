# LuciDream V1

Base technique professionnelle pour une application mobile Expo/React Native orientee scalabilite, qualite de code et maintenance long terme.

## Stack

- Expo (SDK recent)
- React Native + TypeScript strict
- pnpm
- ESLint (Airbnb + TypeScript + React Native)
- Prettier
- Husky + lint-staged
- Jest + Testing Library React Native
- GitHub Actions (CI + release)
- Conventional Commits + semantic-release

## Architecture

```text
app/
  composition/
  domain/
  features/
    bootstrap/
    pedia/
    navigation/
    settings/
    shell/
  infra/
  components/
  services/
  storage/
  theme/
  hooks/
docs/
.codex/
e2e/
```

### Principes

- `feature-first`: chaque domaine met ses ecrans, logique, tests et contrats dans `app/features/*`
- `offline-first`: logique locale prioritaire dans `app/storage` et `app/services`
- ecran Journal: `Quick Capture` + `Dream History` + `Dream Detail`, avec limite d'historique
  appliquee par `ListDreamsUseCase` selon la licence locale (`FREE` 7j, `MEDIUM` 30j, `PRO`
  illimite)
- `Dream Detail` inclut un canvas dessin local (`react-native-svg`) avec export PNG sur stockage
  local et liaison asset SQLite au reve, soumis a la limite `drawingsPerDream` par licence
- theming local: `ThemeProvider` + `ThemeEngine` basculent automatiquement entre `dark` et
  `infrared` selon la fenetre de sommeil stockee en SQLite
- ecran Settings: configuration locale `sleep window` + toggle `Auto Infrared mode` + Reality
  Checks (mode random ou every X hours, active hours, notification text), plus alarme WBTB locale
  (apres N heures de sommeil, auto-stop en X secondes), persistes en SQLite avec scheduling local
  via `expo-notifications`; export CSV local du journal (`date,title,story,lucidity,quality,tags`)
  et export PDF local du journal (mise en page lisible) disponibles en licence `MEDIUM`/`PRO`
  uniquement, avec ouverture/partage local du PDF exporte
- ecran Pedia: `Oniri-Pedia` offline avec pages statiques `Index`, `WILD`, `MILD`, `SSILD`,
  recherche locale simple sur titres + contenu, et typographie optimisee pour lecture nocturne
- modules faiblement couples et testables
- exigences qualite: `typecheck`, `lint --max-warnings=0`, tests unitaires
- shell applicatif: `AppProvider` initialise SQLite/migrations puis expose `CompositionRoot` au UI

## Prerequis

- Node.js 20.11.x (LTS)
- pnpm 9.15.5 (via Corepack)

## Installation

```bash
nvm install
nvm use
corepack enable
corepack prepare pnpm@9.15.5 --activate
pnpm install
pnpm prepare
```

## Commandes

```bash
pnpm start
pnpm android
pnpm ios
pnpm web
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm format
pnpm format:write
pnpm test
```

## Verification locale

```bash
pnpm typecheck
pnpm lint
pnpm test
```

## Qualite et commits

- `pre-commit`: lint-staged (eslint + prettier)
- `commit-msg`: commitlint (Conventional Commits)
- ESLint flat config dans `eslint.config.mjs` (compatible ESLint v9+)
- release automatique via `semantic-release` sur `main`

## Conventional Commits

Exemples:

- `feat(auth): add offline login flow`
- `fix(storage): handle corrupted local cache`
- `chore(ci): add typecheck step`

## CI

Pipeline `.github/workflows/ci.yml`:

1. setup pnpm
2. install
3. typecheck
4. lint
5. test

Release pipeline `.github/workflows/release.yml`:

- semantic-release sur `main`

## Prochaine etape

1. Verrouiller les versions apres premier `pnpm install`
2. Ajouter une premiere feature metier avec tests
3. Ajouter les tests e2e (Detox/Maestro) dans `e2e/`
