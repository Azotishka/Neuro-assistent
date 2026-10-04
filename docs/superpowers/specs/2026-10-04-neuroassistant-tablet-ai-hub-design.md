# NeuroAssistant Tablet AI Hub — Design Specification

**Goal:** Превратить NeuroAssistant 0.12 в планшетный AI Hub для Xiaomi Pad 7 Pro 8/256, сохранив совместимость с Android-телефонами и подготовив устойчивый слой инструментов для WebMCP/автономных задач.

## Scope
- Tablet-first адаптивный UI: master-detail чат, Live Assistant и панель инструментов.
- Единый AI provider/runtime слой с Local/API режимами.
- Tool Router как стабильный интерфейс между моделью и Android/WebMCP-инструментами.
- Сессионная и долговременная память с безопасным ограничением контекста.
- Планшетный DeviceProfile без жёсткой привязки к одному устройству.
- Сохранение существующих голосового, overlay и настроек.

## Architecture
UI -> Assistant Orchestrator -> AiProvider / MemoryStore / ToolRouter.
ToolRouter изолирует конкретные инструменты; WebMCP подключается как один из провайдеров инструментов, не меняя UI или AI provider.
DeviceProfile выбирает лимиты по возможностям устройства, а не по имени модели.

## Tablet UI
- При ширине >= 840dp: две основные области: список чатов 280-340dp и рабочая область.
- Панель инструментов открывается как третий context rail >= 1200dp или bottom sheet на меньшей ширине.
- Portrait сохраняет single-pane navigation.
- Overlay и Live Assistant используют тот же визуальный язык.
- Не добавлять отдельные экраны ради функций, которые уже доступны из существующих настроек.

## AI Runtime
- Xiaomi Pad 7 Pro 8GB получает tablet memory class и умеренно повышенные context/output limits.
- Provider interface: generate/stream/cancel + capability metadata.
- UI никогда не обращается напрямую к конкретной модели.
- При нехватке памяти runtime освобождает неиспользуемые ресурсы и продолжает работу в degraded mode.

## Tools / WebMCP
- Tool Router принимает нормализованные ToolRequest и возвращает ToolResult.
- Каждая команда имеет имя, описание, JSON schema входа и capability/permission requirement.
- WebMCP не получает произвольный доступ к Android: только явно зарегистрированные инструменты.
- Многошаговые действия выполняются оркестратором с лимитом шагов и отменой.

## Memory
- Session memory: текущий диалог.
- Persistent memory: только явно сохранённые факты/настройки и пользовательские документы, если источник разрешён.
- Контекст перед отправкой модели ограничивается budget из DeviceProfile.
- Ошибка памяти не блокирует обычный чат.

## Reliability
- Все новые интерфейсы имеют unit tests.
- Existing overlay/voice behavior remains intact.
- Orientation/process recreation restores active session.
- Tool timeout/cancel/error returns a structured result, never crashes UI.

## Non-goals
- Не строить полноценный автономный браузер в этой версии.
- Не добавлять оплату/облако/новый backend.
- Не переписывать существующий UI или runtime без необходимости.
