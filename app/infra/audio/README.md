# Audio Infra Strategy

`AudioRecorder` and `AudioPlayer` encapsulate `expo-av` recording/playback behavior in infra:

- Recorder handles microphone permission requests + start/stop lifecycle and returns local file URI.
- Player handles sound creation/playback/stop and supports optional status callback.
- Tests mock the injected audio module so no real device recording/playback runs in test environment.
- Runtime Expo integration is resolved through `expo-av` from infra only (no UI coupling).
