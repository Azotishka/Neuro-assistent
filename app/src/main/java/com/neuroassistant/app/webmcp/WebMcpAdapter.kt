package com.neuroassistant.app.webmcp

import com.neuroassistant.app.tools.ToolDefinition
import com.neuroassistant.app.tools.ToolHandler
import com.neuroassistant.app.tools.ToolRequest
import com.neuroassistant.app.tools.ToolResult
import com.neuroassistant.app.tools.ToolRouter

data class WebMcpTool(
    val name: String,
    val description: String,
    val inputSchemaJson: String = "{}",
    val requiredArguments: Set<String> = emptySet(),
    val capability: String = "webmcp",
    val skillId: String? = "web",
)

class WebMcpAdapter(
    private val router: ToolRouter,
) {
    private val definitions = linkedMapOf<String, WebMcpTool>()

    fun register(tool: WebMcpTool, handler: ToolHandler) {
        require(tool.name.isNotBlank())
        require(tool.name !in definitions)
        definitions[tool.name] = tool
        router.register(
            ToolDefinition(
                name = tool.name,
                description = tool.description,
                inputSchemaJson = tool.inputSchemaJson,
                requiredArguments = tool.requiredArguments,
                capability = tool.capability,
                skillId = tool.skillId,
            ),
            handler,
        )
    }

    fun list(): List<WebMcpTool> = definitions.values.toList()

    suspend fun execute(request: ToolRequest): ToolResult = router.execute(request)
}
