package com.neuroassistant.app.tools

data class SkillDefinition(
    val id: String,
    val name: String,
    val description: String,
    val enabledByDefault: Boolean = true,
)

class SkillRegistry(definitions: List<SkillDefinition>) {
    private val definitions = definitions.associateBy { it.id }
    private val enabled = definitions.associate { it.id to it.enabledByDefault }.toMutableMap()

    fun list(): List<SkillDefinition> = definitions.values.toList()

    fun isEnabled(id: String): Boolean = id.isBlank() || enabled[id] == true

    fun setEnabled(id: String, value: Boolean) {
        require(definitions.containsKey(id)) { "Unknown skill: $id" }
        enabled[id] = value
    }
}
