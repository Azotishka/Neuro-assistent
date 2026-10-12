# NeuroLinux OS 0.3 — standalone Android build

NeuroLinux is being migrated from a Termux command guide to an Android app that embeds a rootless Linux user-space runtime and terminal.

## Runtime architecture

- Base engine: [oonid/pr](https://github.com/oonid/pr), checked out by CI at build time.
- Linux launcher/runtime: bundled ARM64 PRoot engine (libproot.so, libproot-loader.so, libpr-cli.so and companion libraries) from the upstream Android project.
- UI: built-in Android terminal and distro manager. The initial release installs and runs supported ARM64 root filesystems inside NeuroLinux app-private storage. Termux and Termux:X11 are not used.
- App id: org.neurolinux.desktop; version: 0.3.0.

## Build

Push changes to main under neurolinux/**, or open Actions → Build NeuroLinux OS standalone APK → Run workflow.

The workflow fetches the upstream engine with Git submodules, applies NeuroLinux branding and Russian labels, builds with Android Gradle Plugin, and uploads the artifact NeuroLinuxOS-0.3-standalone-arm64.

## Current scope

This is a standalone Linux user-space / terminal app, not a replacement kernel or a separate bootable operating system. The first integrated build targets an in-app terminal with downloadable distributions such as Debian, Ubuntu, and Alpine. An XFCE graphical desktop is NOT included in this migration yet; it requires a separate integrated display solution rather than Termux:X11.

## Attribution and license

The embedded runtime is based on [oonid/pr](https://github.com/oonid/pr), whose repository documents its PRoot and terminal components and their licenses. Review the upstream license files before redistributing modified APKs. NeuroLinux branding does not imply ownership of upstream runtime code.
