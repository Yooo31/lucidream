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
