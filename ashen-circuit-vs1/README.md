# Ashen Circuit VS1 — GitHub Unity/Android bridge

This branch contains the approved VS1 project archive split into text-safe base64 chunks so GitHub Actions can reconstruct it without a local Unity installation.

Unity target: 6000.3.0f1.
Android backend: IL2CPP.
Build output: `Builds/Android/AshenCircuit-VS1.apk`.

The CI has three paths:
- static verification that requires no Unity license;
- Unity EditMode + PlayMode + Android IL2CPP build when repository secret `UNITY_LICENSE` exists;
- a Unity activation-request artifact when the secret is absent.

This repository is also used by the NeuroAssistant project, so Ashen Circuit is isolated under `ashen-circuit-vs1/`.
