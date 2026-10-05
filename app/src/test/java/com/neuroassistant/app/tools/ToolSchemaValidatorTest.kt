package com.neuroassistant.app.tools

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ToolSchemaValidatorTest {
    @Test
    fun validatesRequiredTypesAndEnums() {
        val schema = """{
          "type":"object",
          "required":["query","limit"],
          "properties":{
            "query":{"type":"string","minLength":2},
            "limit":{"type":"integer"},
            "mode":{"type":"string","enum":["fast","deep"]}
          },
          "additionalProperties":false
        }"""
        assertTrue(ToolSchemaValidator.validate(schema, mapOf("query" to "hello", "limit" to "3", "mode" to "fast")).valid)
    }

    @Test
    fun rejectsWrongTypeMissingRequiredAndUnknownProperty() {
        val schema = """{
          "type":"object",
          "required":["limit"],
          "properties":{"limit":{"type":"integer"}},
          "additionalProperties":false
        }"""
        assertFalse(ToolSchemaValidator.validate(schema, mapOf("limit" to "three")).valid)
        assertFalse(ToolSchemaValidator.validate(schema, emptyMap()).valid)
        assertFalse(ToolSchemaValidator.validate(schema, mapOf("limit" to "3", "extra" to "x")).valid)
    }
}
