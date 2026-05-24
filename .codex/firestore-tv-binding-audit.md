# Firestore TV binding review

- Instance: `projects/ticketbarber-7c16d/databases/(default)`, Standard edition, Native mode.
- TV pairing creates `device_codes/{code}` and `devices/{deviceId}`; the TV later reads only its known `devices/{deviceId}` document to validate the stored binding.
- The anonymous TV view reads public display data from `shops/{shopId}`, `settings/queue`, `barbers`, and `tickets`.
- The existing rules allowed anonymous device creation during code redemption but denied the later device `get`, preventing `TvPageService.init()` and leaving the UI on empty defaults.
- Minimum functional rule change: anonymous direct `get` for a known high-entropy device id and anonymous update restricted to `lastSeen` on an active device. Collection listing and deletion remain owner-only.
