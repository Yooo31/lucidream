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

## SQLite Schema (v2)

- `schema_version`: version du schema applique.
- `license`: source locale pour `license_type`.
- `usage_logs`: evenements d'usage locaux pour limites/features.
- `dreams`: entree journal coeur (`id`, `created_at`, `quality`, `title`, `content`).
- `tags`: taxonomie locale (`id`, `name`, `type`, `created_at`).
- `dream_tags`: association N-N entre reves et tags.
- `dream_assets`: fichiers relies aux reves (`asset_type`, `file_path`) pour audio/dessin.

### Index principaux

- `idx_dreams_created_at` pour les requetes temporelles du journal.
- `idx_dream_tags_dream_id` et `idx_dream_tags_tag_id` pour filtrage par tag et jointures.
- `idx_tags_type_name` pour recherche de tags par type/nom.
- `idx_dream_assets_dream_id_created_at` pour lecture rapide des assets d'un reve.
