# E2E

## Maestro

Maestro flows live in `e2e/maestro/flows`:

- `01_create_dream_successfully.yaml`
- `02_free_quota_block_message.yaml`
- `03_infrared_auto_switch_debug_clock.yaml`

Global Maestro config is in `.maestro/config.yaml` (`testOutputDir`).

### Local prerequisites

1. Install Maestro CLI:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

2. Build and install a debug app (Android or iOS simulator/device).
3. Set app id used by your installed app:

```bash
export MAESTRO_APP_ID="com.your.bundleid"
```

### Run all flows

```bash
pnpm test:e2e:maestro
```

### Run one flow

```bash
maestro test e2e/maestro/flows/01_create_dream_successfully.yaml
```

### Notes

- `03_infrared_auto_switch_debug_clock.yaml` uses the in-app debug clock override controls in
  Settings to simulate daytime/nighttime and validate automatic `dark`/`infrared` switching.
- Each flow starts with `launchApp` + `clearState: true` for deterministic local state.
- CI currently runs unit/integration checks only; Maestro execution is documented here for local
  simulator/device runs.

### Troubleshooting

- `maestro: not found`:

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$HOME/.maestro/bin:$PATH"
```

- Unsupported Node engine warning (`v25.x`): switch to Node 20 before running project scripts.
