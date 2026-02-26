# File Storage Strategy

LuciDream stores binary assets under Expo `documentDirectory` in an app-specific root:

- Audio recordings (`.m4a`): `<documentDirectory>/lucidream/audio/<entry-id>.m4a`
- Drawing exports (`.png`): `<documentDirectory>/lucidream/drawings/<entry-id>.png`
- Journal CSV exports (`.csv`): `<documentDirectory>/lucidream/exports/<entry-id>.csv`

Notes:

- Paths are generated via typed helpers in `paths.ts`.
- `ExpoFileStorage` only uses local `expo-file-system` APIs (offline-first).
- File-system access is abstracted behind `FileStorage` + injected module methods for mock-based tests.
- Recorded audio can be persisted from a temporary recorder URI into the typed local storage paths
  through `copyFromUri`.
