# Ashen Circuit VS1

This branch contains the reconstructed Vertical Slice 1 project archive and a GitHub Actions build pipeline.

Archive SHA-256: `02190d7db857b2bdae0cf54298bfc2905f1386b1c85b29157e44e1b0331ffefe`

The workflow reconstructs the ZIP from Git-tracked base64 chunks, verifies the SHA-256, runs the static V12 gates, then runs Unity EditMode/PlayMode tests and an Android IL2CPP APK build when `UNITY_LICENSE` is configured.
