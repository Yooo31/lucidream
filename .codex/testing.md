# LuciDream V1 Testing Strategy

## Test Pyramid

- Unit tests for `domain` and `app` layers are mandatory for business behavior.
- Component tests for React Native UI use React Native Testing Library.
- E2E tests validate critical user journeys on realistic device flows.

## Unit Tests (Domain + App)

- Validate entity invariants and rule logic (`Dream`, `Tag`, `UsageLog`, `License` semantics).
- Validate use-case orchestration (create dream, attach audio/drawing paths, gate checks).
- Validate feature-gate decisions for `FREE`, `MEDIUM`, `PRO` from SQLite-backed data.
- Validate theme auto-switch decision logic using sleep-window inputs.

## Component Tests (RN Testing Library)

- Screens must assert critical rendering and interaction flows, not implementation details.
- Test wake-up fast input path with minimal interactions.
- Test both dark and infrared theme rendering for key screens.
- Verify accessibility props for high-priority controls.

## E2E Strategy

- Recommended framework: Maestro.
- Initial critical flows to automate:
- Launch app offline and create dream entry quickly from wake-up screen.
- Record audio (`.m4a`) and playback.
- Capture drawing and export `.png`.
- Schedule Reality Check and WBTB notifications.
- Verify auto theme switch entering/exiting sleep phase.
- Verify license gates change behavior locally without network.

## Mocking Rules

- `expo-sqlite`
- Use deterministic local test DB or repository doubles; reset state per test.
- `expo-av`
- Mock recording/playback APIs and file path outputs (`.m4a`).
- `expo-notifications`
- Mock schedule/cancel/query calls and assert expected payload/time windows.
- Do not mock domain rules; only mock IO boundaries.

## Coverage Expectations

- Minimum thresholds:
- `domain`: 90% lines/functions.
- `app` use-cases: 85% lines/functions.
- `infra`: behavior-focused tests for adapters and mapping logic.
- Mandatory coverage areas for each PR:
- Changed use-case logic.
- Changed gating logic.
- Changed migration/schema logic.
- Changed notification scheduling logic.
- New or changed wake-up interaction paths.

## CI Enforcement

- CI must run at least:
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test -- --coverage`
- Failing coverage thresholds block merge.
