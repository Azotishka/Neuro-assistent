# Qwen Local 3.9.4 — POCO X6 Pro Edition

Актуальная исходная сборка проекта.

## Главное
- Qwen3 1.7B — основной профиль для POCO X6 Pro 12 ГБ.
- Lite 360M — резервный fallback.
- Qwen3 4B — Heavy, только вручную.
- WebGPU/WebLLM runtime автоматически восстанавливается после `device lost`, `disposed`, `external instance` и похожих ошибок.
- Если streaming завершился без видимого текста, выполняется совместимый non-streaming fallback без thinking.
- Контекст POCO: 1.7B — 1536, 4B — 1280.
- Оптимизированы DOM, HUD, typewriter и эффекты для снижения нагрузки во время генерации.

## Запуск
Размещай содержимое папки по HTTPS. Для WebGPU рекомендуется актуальный Chrome на Android.
