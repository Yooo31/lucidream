# LuciDream V1 Architecture

## Layered Architecture

Use a strict layered model:

1. `UI` (screens/components/hooks for presentation only)
2. `App` (use-cases/orchestration)
3. `Domain` (entities, value objects, pure business rules)
4. `Infra` (Expo adapters and concrete IO implementations)

## Dependency Direction (Allowed Only)

- `UI -> App -> Domain`
- `App -> Domain`
- `App -> Infra` through interfaces/ports defined in App or Domain.
- `Infra -> Domain` only for mapping typed models, never to execute UI logic.
- `MUST NOT` import upward (example: Domain importing App, App importing UI).

## Dependency Examples

- Allowed: dream entry screen calls `CreateDreamEntryUseCase`.
- Allowed: `CreateDreamEntryUseCase` uses `DreamRepositoryPort` and `FileStoragePort`.
- Allowed: SQLite adapter implements `DreamRepositoryPort`.
- Forbidden: React component directly running raw SQL.
- Forbidden: Domain entity importing `expo-sqlite`, `expo-av`, or `expo-notifications`.

## Expected Modules

- `storage/sqlite`
- Schema definitions and migrations.
- Repositories for `Dream`, `Tag`, `UsageLog`, `License`.
- `storage/files`
- `expo-file-system` adapter for `.m4a` audio and `.png` drawing exports.
- `audio`
- `expo-av` recording/playback service with local file references.
- `notifications`
- `expo-notifications` scheduler for Reality Checks and WBTB windows.
- `theme`
- Theme engine for dark + infrared mode and sleep-window auto-switch.
- `feature-gate`
- Centralized gate service resolving entitlements from local SQLite.

## Data Model Overview

- `Dream`
- Core journal entry, timestamped, with optional audio and drawing file paths.
- `Tag`
- Local taxonomy for dream categorization and filtering.
- `UsageLog`
- Local counters/events used for feature limits and analytics-like in-app behavior.
- `License`
- Local source of truth for `license_type` (`FREE`, `MEDIUM`, `PRO`).

## Rule Placement

- Domain owns invariant rules (entity validity, state transitions, semantic constraints).
- App layer owns workflow rules (orchestration, transaction boundaries, scheduling coordination).
- Infra owns persistence and device APIs only.
- Gate rules live in centralized `feature-gate` module, backed by SQLite queries and domain/app policies.

## Cross-Cutting Constraints

- Offline-only: no architecture path may require network.
- Testability first: each infra module behind interfaces to enable deterministic tests.
- Performance-sensitive flows (wake-up capture) must avoid heavy blocking work in UI thread.
