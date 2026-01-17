import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


// import tools
import edit_note_content from "./src/tools/edit_note_content.js";
import edit_note_title from "./src/tools/edit_note_title.js";
import edit_note_icon from "./src/tools/edit_note_icon.js";
import notes from "../assets/ts/notes.js";
import tags from "../assets/ts/tags.js";
// import get_note from "./assets/tools/get_note";


// Create server instance
const server = new McpServer({
  name: "silvernote",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
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


// edit a note => content
server.tool(
  "edit_note_content",
  "editing content of a note",
  {
    uuid: z.string().describe('note uuid'),
    content: z.string().describe('the content to insert on the note'),
    pos: z.number().describe('the position where the content will be inserted corresponds to a certain number of characters.')
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
    icon: z.string().describe('new icon of the note, link only (ex: emojiapi.dev)'),
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