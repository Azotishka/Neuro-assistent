package com.neuroassistant.app.tools

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class SkillRegistryTest {
    @Test
    fun skillsCanBeEnabledAndDisabled() {
        val registry = SkillRegistry(
            listOf(
                SkillDefinition("web", "Web", "Read and interact with registered web tools"),
                SkillDefinition("coding", "Coding", "Work with source code", enabledByDefault = false)
            )
        )
        assertTrue(registry.isEnabled("web"))
        assertFalse(registry.isEnabled("coding"))
        registry.setEnabled("coding", true)
        assertTrue(registry.isEnabled("coding"))
        registry.setEnabled("web", false)
        assertFalse(registry.isEnabled("web"))
    }

    @Test
    fun routerRejectsDisabledSkill() = kotlinx.coroutines.runBlocking {
        val registry = SkillRegistry(listOf(SkillDefinition("coding", "Coding", "Code tools", enabledByDefault = false)))
        val router = ToolRouter(skillRegistry = registry)
        router.register(ToolDefinition("compile", "Compile", skillId = "coding")) { "ok" }
        val result = router.execute(ToolRequest(toolName = "compile"))
        org.junit.Assert.assertEquals("SKILL_DISABLED", result.errorCode)
    }
}
