package com.neuroassistant.app.tools

data class ToolSchemaValidation(
    val valid: Boolean,
    val error: String? = null,
)

object ToolSchemaValidator {
    /**
     * Validates the JSON-Schema subset NeuroAssistant needs for tools.
     * Deliberately has no Android/org.json dependency so JVM unit tests remain portable.
     */
    fun validate(schemaJson: String, arguments: Map<String, String>): ToolSchemaValidation {
        val schema = SimpleJson.parseObject(schemaJson)
            ?: return ToolSchemaValidation(false, "Invalid JSON schema")

        if ((schema["type"] as? String ?: "object") != "object") {
            return ToolSchemaValidation(false, "Root schema must be an object")
        }

        val required = (schema["required"] as? List<*>)?.filterIsInstance<String>().orEmpty()
        required.firstOrNull { it.isNotBlank() && !arguments.containsKey(it) }?.let {
            return ToolSchemaValidation(false, "Missing required argument: $it")
        }

        val properties = schema["properties"] as? Map<*, *> ?: emptyMap<String, Any?>()
        if (schema["additionalProperties"] == false) {
            arguments.keys.firstOrNull { !properties.containsKey(it) }?.let {
                return ToolSchemaValidation(false, "Unknown argument: $it")
            }
        }

        arguments.forEach { (name, value) ->
            val definition = properties[name] as? Map<*, *> ?: return@forEach
            when (definition["type"] as? String) {
                "string" -> {
                    val minLength = (definition["minLength"] as? Number)?.toInt() ?: 0
                    if (value.length < minLength) {
                        return ToolSchemaValidation(false, "Argument '$name' is too short")
                    }
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

            val enum = (definition["enum"] as? List<*>)?.filterIsInstance<String>()
            if (enum != null && value !in enum) {
                return ToolSchemaValidation(false, "Argument '$name' has an unsupported value")
            }
        }

        return ToolSchemaValidation(true)
    }
}

private object SimpleJson {
    fun parseObject(text: String): Map<String, Any?>? {
        val parser = Parser(text)
        val value = runCatching { parser.parseValue() }.getOrNull()
        return value as? Map<String, Any?>
    }

    private class Parser(private val source: String) {
        private var index = 0

        fun parseValue(): Any? {
            skipWhitespace()
            if (index >= source.length) error("Unexpected end")
            return when (source[index]) {
                '{' -> parseObject()
                '[' -> parseArray()
                '"' -> parseString()
                't' -> parseLiteral("true", true)
                'f' -> parseLiteral("false", false)
                'n' -> parseLiteral("null", null)
                '-', in '0'..'9' -> parseNumber()
                else -> error("Unexpected token")
            }
        }

        private fun parseObject(): Map<String, Any?> {
            expect('{')
            skipWhitespace()
            val result = linkedMapOf<String, Any?>()
            if (peek('}')) {
                index++
                return result
            }
            while (true) {
                skipWhitespace()
                val key = parseString()
                skipWhitespace()
                expect(':')
                result[key] = parseValue()
                skipWhitespace()
                when {
                    peek('}') -> {
                        index++
                        return result
                    }
                    peek(',') -> index++
                    else -> error("Expected ',' or '}'")
                }
            }
        }

        private fun parseArray(): List<Any?> {
            expect('[')
            skipWhitespace()
            val result = mutableListOf<Any?>()
            if (peek(']')) {
                index++
                return result
            }
            while (true) {
                result += parseValue()
                skipWhitespace()
                when {
                    peek(']') -> {
                        index++
                        return result
                    }
                    peek(',') -> index++
                    else -> error("Expected ',' or ']'")
                }
            }
        }

        private fun parseString(): String {
            expect('"')
            val out = StringBuilder()
            while (index < source.length) {
                when (val ch = source[index++]) {
                    '"' -> return out.toString()
                    '\\' -> {
                        if (index >= source.length) error("Invalid escape")
                        when (val esc = source[index++]) {
                            '"', '\\', '/' -> out.append(esc)
                            'b' -> out.append('\b')
                            'f' -> out.append('\u000C')
                            'n' -> out.append('\n')
                            'r' -> out.append('\r')
                            't' -> out.append('\t')
                            'u' -> {
                                if (index + 4 > source.length) error("Invalid unicode escape")
                                val hex = source.substring(index, index + 4)
                                out.append(hex.toInt(16).toChar())
                                index += 4
                            }
                            else -> error("Invalid escape")
                        }
                    }
                    else -> out.append(ch)
                }
            }
            error("Unterminated string")
        }

        private fun parseNumber(): Number {
            val start = index
            if (peek('-')) index++
            while (index < source.length && source[index].isDigit()) index++
            var decimal = false
            if (peek('.')) {
                decimal = true
                index++
                while (index < source.length && source[index].isDigit()) index++
            }
            if (peek('e') || peek('E')) {
                decimal = true
                index++
                if (peek('+') || peek('-')) index++
                while (index < source.length && source[index].isDigit()) index++
            }
            val token = source.substring(start, index)
            return if (decimal) token.toDouble() else token.toLong()
        }

        private fun parseLiteral(expected: String, value: Any?): Any? {
            if (!source.startsWith(expected, index)) error("Invalid literal")
            index += expected.length
            return value
        }

        private fun skipWhitespace() {
            while (index < source.length && source[index].isWhitespace()) index++
        }

        private fun expect(ch: Char) {
            skipWhitespace()
            if (index >= source.length || source[index] != ch) error("Expected '$ch'")
            index++
        }

        private fun peek(ch: Char): Boolean {
            skipWhitespace()
            return index < source.length && source[index] == ch
        }
    }
}
