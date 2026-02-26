# Notifications Infra Strategy

`ExpoNotificationsClient` encapsulates local scheduling and permissions APIs from
`expo-notifications`:

- `scheduleNotification` maps app trigger inputs to Expo trigger payloads.
- `cancelNotification` and `cancelAll` delegate to scheduled notification cancellation APIs.
- `getPermissions` and `requestPermissions` provide a stable client-facing permission contract.
- Tests mock the injected notifications module so no device notification APIs run in tests.
