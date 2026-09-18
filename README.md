# NeuroAssistant v0.6 beta

Нативный Android-помощник на Kotlin + Jetpack Compose. Эта версия продолжает v0.1 и доводит проект до состояния, пригодного для сборки и реального теста на телефоне.

## Что реализовано

- Современный мобильный чат на Jetpack Compose.
- Несколько разговоров и локальная история до 30 чатов / 200 сообщений на чат.
- Автоматическая миграция старой истории v0.1.
- Голосовой ввод через Android `SpeechRecognizer`.
- Корректный повторный запуск голосового ввода после результата/ошибки.
- Озвучивание ответов через Android TextToSpeech.
- Копирование сообщений.
- Отмена текущего AI-запроса.
- Системные команды: настройки, Wi‑Fi, Bluetooth, камера, браузер, YouTube, карты, телефон и сведения о приложении.
- OpenAI-compatible `/chat/completions` provider: Base URL, model и API key задаются в приложении.
- Локальный демо-провайдер без ключа для интерфейса и системных команд.
- Android Assistant Role через `RoleManager`.
- `VoiceInteractionService` + `VoiceInteractionSessionService` + обязательный `RecognitionService` metadata path.
- `ACTION_ASSIST` / `VOICE_ASSIST` fallback.
- Автоматический старт голосового ввода при системном вызове ассистента.
- GitHub Actions: unit tests → Android Lint → debug APK → artifact.

## Важно про кнопку телефона и фон

Android не разрешает приложению произвольно перехватывать физическую кнопку питания. Правильный системный путь — назначить NeuroAssistant приложением-ассистентом Android. После этого системный жест/долгое нажатие кнопки ассистента может запускать NeuroAssistant, если прошивка телефона поддерживает такую привязку.

`VoiceInteractionService` поддерживается системой как выбранный глобальный ассистент. Тяжёлая UI-логика не работает постоянно в фоне: при вызове открывается сессия и затем приложение с голосовым вводом. Постоянного hotword-движка в этой версии нет.

## Первый запуск

1. Установи APK.
2. Открой NeuroAssistant.
3. Разреши микрофон при первом нажатии 🎙.
4. Нажми `Назначить системным ассистентом` и подтверди Android-диалог.
5. В настройках приложения выбери:
   - `Локальный демо` — без API;
   - `OpenAI-compatible API` — укажи Base URL, модель и ключ.
6. После назначения попробуй системный жест/кнопку ассистента на своём телефоне.

## Сборка через GitHub Actions

Workflow: `.github/workflows/build-apk.yml`

Он запускает:

```text
:app:testDebugUnitTest
:app:lintDebug
:app:assembleDebug
```

После успешной сборки скачай artifact `NeuroAssistant-v0.6-debug-apk`. Внутри будет `app-debug.apk`.

## Проверки, выполненные при подготовке

- XML-манифест и resources проверены на корректный XML.
- `CommandParser` скомпилирован отдельным Kotlin smoke-test и прошёл тесты вариантов команд.
- `LocalDemoAiProvider` отдельно скомпилирован и прошёл smoke-test.
- Проверена согласованность `VoiceInteractionService` / SessionService / RecognitionService деклараций.

Полная Android-сборка в текущем контейнере не выполняется, потому что здесь нет Android SDK/Gradle artifacts и сетевого доступа для их загрузки. Для этого в проекте оставлен воспроизводимый GitHub Actions workflow.
