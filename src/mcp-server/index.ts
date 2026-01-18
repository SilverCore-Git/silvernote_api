import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import notes from "../assets/ts/notes.js";
import tags from "../assets/ts/tags.js";


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



// get note
server.resource(
  "note",
  "note:///{uuid}",
  async (uri: URL) => {
    // Extract uuid from the URI path
    const pathParts = uri.pathname.split('/').filter(Boolean);
    const uuid = pathParts[0];

    const note = await notes.getNoteByUUID(uuid);

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(note, null, 2),
        },
      ],
    };
  }
);

// get tag
server.resource(
  "tag",
  "tag:///{uuid}",
  async (uri: URL) => {
    // Extract uuid from the URI path
    const pathParts = uri.pathname.split('/').filter(Boolean);
    const uuid = pathParts[0];

    const tag = await tags.getTagByUUID(uuid);

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(tag, null, 2),
        },
      ],
    };
  }
);




async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});