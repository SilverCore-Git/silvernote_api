import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const USER_AGENT = "silvernote-mcp/1.0";

// Create server instance
const server = new McpServer({
  name: "silvernote",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

server.tool(
  "name",
  "desciption",
  {
    parm1: z.string().length(10).describe('parm 1 for ai ask'),
    parm2: z.string().length(10).describe('parm 2 for ai ask'),
  },
  ({ parm1, parm2 }) => {
    // function of the tool
    return {
      content: [
        {
          type: "text",
          text: "data",
        },
      ],
    };
  }
)

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});