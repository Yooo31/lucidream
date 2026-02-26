# LuciDream V1 Coding Conventions

## TypeScript Rules

- `strict` mode is mandatory and must remain enabled.
- Keep `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` enabled.
- No `any` unless documented with a clear rationale and a follow-up task.
- Prefer explicit domain/app types over ad-hoc object literals.
- Use `import type` for type-only imports.

## ESLint and Formatting

- ESLint baseline is Airbnb + Airbnb TypeScript + React/React Native plugins.
- `pnpm lint` must run with `--max-warnings=0`.
- Prettier is the single formatter authority.
- Keep formatting deterministic (`singleQuote`, trailing commas, semicolons, max line width).
- Do not merge code that passes tests but fails lint/format/type checks.

## Folder Structure (Feature-First)

- Use feature-first slices in `src/features/<feature-name>/`.
- Shared cross-feature modules go in `src/shared/`.
- Infra adapters go in `src/infra/` by capability (`sqlite`, `file-system`, `audio`, `notifications`).
- Domain types/rules live in `src/domain/`.
- App use-cases/orchestrators live in `src/app/`.

## Naming Conventions

- Components: `PascalCase.tsx`.
- Hooks: `useXxx.ts`.
- Use-cases: `VerbNounUseCase.ts`.
- Ports/interfaces: `XxxPort.ts` or `XxxRepository.ts`.
- Infra implementations: `ExpoXxxService.ts`, `SqliteXxxRepository.ts`.
- Tests: `*.test.ts` / `*.test.tsx`.

## React Native Patterns

- Use function components and hooks only.
- Keep screens thin; move business logic to use-cases/services.
- Use `useMemo`/`useCallback` when prop identity impacts child rerenders.
- Avoid premature memoization; profile if uncertain.
- Accessibility is required:
- Provide labels/roles/hints for interactive elements.
- Ensure touch targets and contrast are valid in both dark and infrared themes.

## State and Side-Effects

- Separate pure transforms from side-effect code.
- Effects must be idempotent where possible and guarded against duplicate scheduling.
- Centralize IO calls in services/repositories; avoid direct Expo API calls in UI components.

## Error Handling

- Use typed errors or `Result`/`Either` style return values for domain/app boundaries.
- Domain/app layers must not throw untyped runtime errors as control flow.
- Map infra errors to typed app-level failures before returning to UI.
- UI must display user-safe messages and never expose raw stack traces.
