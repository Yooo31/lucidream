# LuciDream V1 Prompt Templates

## Add Feature Template

```text
Task: Add feature <name> for LuciDream V1.

Constraints:
- Expo latest SDK, React Native hybrid app.
- 100% offline/local only (no backend, no external API, no AI).
- Use only approved modules: expo-sqlite, expo-file-system, expo-av, expo-notifications, react-native-svg.
- Feature gates must go through centralized gate service using local license_type (FREE/MEDIUM/PRO).
- Respect wake-up speed and night vision UX.

Deliver:
1) Minimal architecture-aligned patch.
2) Tests (unit/component/e2e where relevant).
3) Docs updates in .codex or feature docs if behavior changed.
4) Commands run + results summary.
```

## Refactor Template

```text
Task: Refactor <scope> without changing behavior.

Rules:
- Preserve offline-only guarantees and centralized feature-gate pattern.
- Keep layer boundaries: UI -> App -> Domain -> Infra.
- No direct Expo API usage inside UI/domain.

Deliver:
1) Patch with clear before/after structure.
2) Risk list (regression points).
3) Tests proving parity.
4) Commands run and verification output summary.
```

## Fix Failing CI Template

```text
Task: Fix CI failures on branch <name>.

Required process:
1) Reproduce with local commands.
2) Identify root cause per failing job (typecheck/lint/test/coverage/release checks).
3) Provide smallest safe patch.
4) Re-run full verification.

Output format:
- Root cause(s)
- Patch summary
- Commands run
- Remaining risks
```

## Add Infra Module Template

```text
Task: Add infra module <module-name> for LuciDream V1.

Requirements:
- Implement as adapter behind port/interface.
- No leakage of Expo-specific types into domain.
- Include tests with mocks/fakes at IO boundary.
- Document how module respects offline-only constraints.

Deliver:
1) Port definition
2) Infra implementation
3) Integration wiring in app layer
4) Tests + docs updates
```

## Patch-Only Template (Strict)

```text
Return patch-only response with these sections and nothing else:

1) Changes
- Exact files changed and why (one line per file).

2) Commands
- Exact commands to run in order.

3) Acceptance Criteria
- Bullet list of verifiable checks, including:
  - typecheck passes
  - lint passes with 0 warnings
  - tests pass
  - docs updated (if behavior/architecture changed)

Do not include long explanations, alternatives, or future roadmap.
```

## Conventional Commit Plan Template

```text
Create a commit plan using Conventional Commits:

1) <type>(scope): <summary>
- Files: <list>
- Why: <reason>

2) <type>(scope): <summary>
- Files: <list>
- Why: <reason>

Allowed types: feat, fix, refactor, test, docs, chore, ci, build, perf.
Keep each commit atomic and independently releasable.
```
