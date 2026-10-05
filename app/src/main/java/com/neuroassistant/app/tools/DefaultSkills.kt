package com.neuroassistant.app.tools

object DefaultSkills {
    val all: List<SkillDefinition> = listOf(
        SkillDefinition("web", "Web", "Работа с явно зарегистрированными веб-инструментами"),
        SkillDefinition("coding", "Coding", "Работа с кодом, файлами и проектами", enabledByDefault = false),
        SkillDefinition("memory", "Memory", "Поиск и управление долговременной памятью"),
        SkillDefinition("device", "Device", "Безопасные системные действия Android", enabledByDefault = false),
        SkillDefinition("vision", "Vision", "Анализ изображений и документов", enabledByDefault = false),
    )
}
