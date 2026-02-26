# LuciDream V1 Governance Instructions

## Scope

These instructions are mandatory for all future contributions to LuciDream V1.

## Non-Negotiables

- `MUST` be 100% local and offline-first.
- `MUST NOT` introduce any backend service, cloud sync, or remote database.
- `MUST NOT` perform external network calls (`fetch`, `axios`, `WebSocket`, third-party SDK telemetry).
- `MUST NOT` use AI services, local LLM wrappers, or remote inference APIs.
- `MUST` use only local device capabilities and local persistence.

## Product Stack Constraints

- Runtime: Expo with latest stable SDK.
- App type: React Native hybrid app.
- Structured data: `expo-sqlite`.
- File storage: `expo-file-system` for audio (`.m4a`) and drawing exports (`.png`).
- Audio recording/playback: `expo-av`.
- Notifications and alarms (Reality Checks + WBTB): `expo-notifications`.
- Drawing capture/rendering: `react-native-svg` with PNG export pipeline.

## Performance and UX Principles

- Wake-up interactions must be ultra-fast: first actionable input available immediately after screen opens.
- Minimize taps and cognitive load for night usage.
- Prioritize predictable navigation and low-friction entry flows.
- Optimize for low-light readability and reduced photic stimulation.

## Theme and Night Vision Rules

- `MUST` support two themes:
- Dark standard theme.
- Infrared theme (red/black, night vision safe).
- `MUST` auto-switch theme during user-defined sleep phase.
- `MUST` allow manual override while preserving the sleep-phase auto-switch default behavior.
- Any UI change must be reviewed against both themes before merge.

## Feature Gating Rules

- Entitlements are local only via `license_type` (`FREE`, `MEDIUM`, `PRO`).
- Limits and unlocks must be computed from local SQLite queries only.
- All gate checks must pass through one centralized feature-gate module.
- `MUST NOT` scatter ad-hoc license checks across screens/components.

## Definition Of Done For Every PR

- `pnpm typecheck` passes.
- `pnpm lint` passes with zero warnings.
- `pnpm test` passes (including updated/new tests).
- Documentation is updated when behavior, architecture, data model, or workflows change.
- Any new gate, migration, or scheduling behavior has test coverage.

## Change Rejection Criteria

- Any network dependency or backend requirement.
- Any feature that bypasses centralized feature-gating.
- Any change that degrades wake-up flow speed or night mode safety.
- Any PR missing DoD checks.
