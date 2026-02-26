# Architecture Notes

## Cibles

- Scalabilite pour plusieurs features metier
- Codebase modulaire et maintenable
- Fonctionnement offline-first par defaut

## Regles

- Les acces IO (stockage local, fichiers, reseau futur) passent par `app/services`.
- Les persistance locales sont abstraites dans `app/storage`.
- Les composants UI transverses vivent dans `app/components`.
- Les tokens de design sont centralises dans `app/theme`.
- Les hooks reutilisables vivent dans `app/hooks`.

## Feature Gate Domaine

- Les regles d'entitlement sont centralisees dans `app/domain/featureGate.ts`.
- `resolveFeatureGateDecision(licenseType, counts, clock)` est une fonction pure:
  - Entrees: `licenseType`, compteurs d'usage locaux agreges, `clock`.
  - Sorties: booleens d'acces (`canCreateDream`, `canPlayAudio`, `canSendRC`, `canUseWBTB`,
    etc.) et limites exposees (`maxHistoryDays`, `maxDreamsPerDay`, ...).
- La matrice monetisation (`FREE`, `MEDIUM`, `PRO`) est definie une seule fois dans
  `LICENSE_GATE_LIMITS`.
