package com.neuroassistant.app.tools

import org.json.JSONObject

data class ToolSchemaValidation(
    val valid: Boolean,
    val error: String? = null,
)

object ToolSchemaValidator {
    fun validate(schemaJson: String, arguments: Map<String, String>): ToolSchemaValidation {
        val schema = runCatching { JSONObject(schemaJson) }.getOrElse {
            return ToolSchemaValidation(false, "Invalid JSON schema")
        }
        if (schema.optString("type", "object") != "object") {
            return ToolSchemaValidation(false, "Root schema must be an object")
        }

        val required = schema.optJSONArray("required")
        if (required != null) {
            for (i in 0 until required.length()) {
                val name = required.optString(i)
                if (name.isNotBlank() && !arguments.containsKey(name)) {
                    return ToolSchemaValidation(false, "Missing required argument: $name")
                }
            }
        }

        val properties = schema.optJSONObject("properties") ?: JSONObject()
        if (!schema.optBoolean("additionalProperties", true)) {
            val unknown = arguments.keys.firstOrNull { !properties.has(it) }
            if (unknown != null) return ToolSchemaValidation(false, "Unknown argument: $unknown")
        }

        val names = properties.keys()
        while (names.hasNext()) {
            val name = names.next()
            if (!arguments.containsKey(name)) continue
            val value = arguments.getValue(name)
            val definition = properties.optJSONObject(name) ?: continue
            when (definition.optString("type")) {
                "string" -> {
                    val minLength = definition.optInt("minLength", 0)
                    if (value.length < minLength) return ToolSchemaValidation(false, "Argument '$name' is too short")
                }
                "integer" -> if (value.toLongOrNull() == null) {
                    return ToolSchemaValidation(false, "Argument '$name' must be an integer")
                }
                "number" -> if (value.toDoubleOrNull() == null) {
                    return ToolSchemaValidation(false, "Argument '$name' must be a number")
                }
                "boolean" -> if (value != "true" && value != "false") {
                    return ToolSchemaValidation(false, "Argument '$name' must be boolean")
                }
            }
            val enum = definition.optJSONArray("enum")
            if (enum != null && (0 until enum.length()).none { enum.optString(it) == value }) {
                return ToolSchemaValidation(false, "Argument '$name' has an unsupported value")
            }
        }
        return ToolSchemaValidation(true)
    }
}
