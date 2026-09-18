# Qwen Local 3.9.4 — POCO X6 Pro TWA Release

## Что изменено

Это альтернативная Android-версия на Trusted Web Activity (TWA), а не WebView. Android-приложение открывает Qwen Local через установленный Chrome, чтобы использовать Chrome/WebGPU и браузерный кеш моделей.

## Профиль POCO X6 Pro 12 ГБ

- Qwen3 1.7B (`fast`) — модель по умолчанию, auto context 2048.
- Qwen3 4B (`max`) — Heavy-режим, auto context 1536.
- 360M (`mini`) — безопасный fallback, auto context 1536.
- Одновременно активна только одна модель.
- Профиль включается явно параметром `?profile=poco-x6-pro`, а не по ненадёжному значению `navigator.deviceMemory`.

## Надёжность

- При первом TWA-запуске выбирается 1.7B только если пользователь ещё не выбирал модель.
- Если Chrome не предоставляет `navigator.gpu`, приложение показывает диагностическое предупреждение вместо молчаливого зависания.
- PWA/IndexedDB и кеш моделей остаются частью обычного Chrome-origin, поэтому история чатов и скачанные ресурсы живут вместе с веб-приложением.

## Android/TWA

- package: `ru.neurogazette.qwenlocal`
- minSdk: 31 (Android 12)
- target/compileSdk: 36
- Android Browser Helper: 2.7.3
- Android Gradle Plugin: 9.4.0
- Gradle для CI: 9.6.0
- JDK: 17

## HTTPS и Digital Asset Links

Для полноэкранного доверенного TWA требуется постоянный HTTPS-origin и файл `/.well-known/assetlinks.json`, связанный с сертификатом APK. До верификации приложение может открываться как Custom Tab — это штатный fallback TWA.

Скрипт `scripts/configure-twa.mjs` принимает:

- `TWA_ORIGIN=https://...`
- необязательно `TWA_SHA256=AA:BB:...`

GitHub workflow `.github/workflows/twa-apk.yml` принимает HTTPS-origin вручную, собирает debug APK, извлекает SHA-256 сертификата и прикладывает готовый `assetlinks.json` к artifact.

## Проверено 17.09.2026

- `npm test` — PASS
- `npm run test:android` — PASS
- `node --check` для ключевых JS-файлов — PASS
- JSON/XML parse — PASS
- legacy WebView `MainActivity` отсутствует — PASS
- старый workflow `android-apk.yml` отсутствует — PASS

## Ограничение среды сборки

В текущем окружении нет Android SDK/build-tools и нет сетевого доступа из shell для их установки. Поэтому бинарный APK здесь не компилировался. Проект подготовлен для сборки через GitHub Actions после указания постоянного HTTPS-origin.
