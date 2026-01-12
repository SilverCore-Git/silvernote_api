import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";


// import tools
import edit_note_content from "./assets/tools/edit_note_content.js";
import edit_note_title from "./assets/tools/edit_note_title.js";
import edit_note_icon from "./assets/tools/edit_note_icon.js";
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


// server.resource(
//   "note",
//   "note://{uuid}",
//   {
//     title: "Get Note",
//     description: "Get a specific note by its UUID",
//     mimeType: "application/json",
//   },
//   async (uri) => {
//     const uuid = uri.pathname.replace("/", "");
//     console.log(uuid)

//     return {
//       contents: [
//         {
//           uri: uri.href, // 👈 Obligatoire
//           mimeType: "application/json",
//           text: JSON.stringify({}, null, 2),
//         },
//       ],
//     };
//   }
// );


// server.tool(
//   "get_note",
//   "get note by uuid or title",
//   {
//     uuid: z.string().describe('note uuid for find note').optional(),
//     title: z.string().describe('note title for find them with userid too').optional(),
//     userId: z.string().describe('client userid for find note by title').optional(),
//   },
//   async (params) => {
//     const res = await get_note(params);
//     return {
//       content: [
//         {
//           type: "json",
//           text: JSON.stringify(
//             res?.note ?? { notFound: true },
//             null,
//             2
//           ),
//         },
//       ],
//     };
//   }
// );


// edit a note => content
server.tool(
  "edit_note_content",
  "editing content of a note",
  {
    uuid: z.string().describe('note uuid'),
    content: z.string().describe('the content to insert on the note'),
    pos: z.number().describe('la position où le contenu sera inséré correspond à un certain nombre de caractères.')
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