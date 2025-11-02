import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


// import tools
import edit_note_content from "./assets/tools/edit_note_content";
import edit_note_title from "./assets/tools/edit_note_title";
import edit_note_icon from "./assets/tools/edit_note_icon";


// Create server instance
const server = new McpServer({
  name: "silvernote",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});



// edit a note => content
server.tool(
  "edit_note_content",
  "editing content of a note",
  {
    uuid: z.string().describe('note uuid'),
    content: z.string().describe('the content to insert on the note'),
    line: z.number().describe('the line where the content will be inserted')
  },
  async (parms) => {
    const res = await edit_note_content(parms);
    return {
      content: [
        {
          type: "text",
          text: res.message,
        },
      ],
    };
  }
)

server.tool(
  "edit_note_title",
  "editing icon of a note",
  {
    uuid: z.string().describe('note uuid'),
    title: z.string().describe('new title of the note'),
  },
  async (parms) => {
    const res = await edit_note_title(parms);
    return {
      content: [
        {
          type: "text",
          text: res.message,
        },
      ],
    };
  }
)

server.tool(
  "edit_note_icon",
  "editing icon of a note",
  {
    uuid: z.string().describe('note uuid'),
    icon: z.string().describe('new icon of the note on base64 only : data:image/png;base64'),
  },
  async (parms) => {
    const res = await edit_note_icon(parms);
    return {
      content: [
        {
          type: "text",
          text: res.message,
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