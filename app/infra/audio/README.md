# Audio Infra Strategy

`AudioRecorder` and `AudioPlayer` encapsulate `expo-av` recording/playback behavior in infra:

- Recorder handles microphone permission requests + start/stop lifecycle and returns local file URI.
- Player handles sound creation/playback/pause/stop and supports optional status callback.
- Tests mock the injected audio module so no real device recording/playback runs in test environment.
- Runtime Expo integration is resolved through `expo-av` from infra only (no UI coupling).
- Dream Detail playback gates are enforced in app-layer use-cases; successful playback is logged as
  local `AUDIO_PLAYED` usage for quota tracking.
