import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";


// Create server instance
const server = new McpServer({
  name: "silvernote",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});


// tools 
import tools from "./src/tools/index.js";
import { Tool } from "./MCPTypes.js";
tools.forEach((tool: Tool) => {
  server.tool(
    tool.name,
    tool.description,
    tool.params,
    tool.handler
  )
});



// resources
import resources from "./src/resources/index.js";
import { Resource } from "./MCPTypes.js";
resources.forEach((resource: Resource) => {
  server.resource(
    resource.name,
    resource.url,
    resource.handler
  )
});


async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});