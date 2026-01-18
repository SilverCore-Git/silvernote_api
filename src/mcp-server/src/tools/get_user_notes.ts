import notes from "../../../assets/ts/notes.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const get_user_notes: Tool = {

    name: "get_user_notes",
    description: "Get user notes by user id with pagination option (page and limit). Limit is limited to 20",

    params: {
        userID: z.string(),
        page: z.number().optional().default(0),
        limit: z.number().optional().default(20)
    },

    handler: async (parms) => {

        const allNotes = (await notes.getNoteByUserId(parms.userID)).notes;

        const MAX_LIMIT = 20;
        const limit = Math.min(parms.limit || 20, MAX_LIMIT);

        const start = parms.page * limit;
        const end = start + limit;

        const slicedNotes = allNotes.slice(start, end);

        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(slicedNotes, null, 2),
                },
            ],
        };

    }

}


export default get_user_notes;