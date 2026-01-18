import notes from "../../../assets/ts/notes.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const get_user_notes: Tool = {

    name: "get_user_notes",
    description: "Get user notes by user id",

    params: {
        userID: z.string().describe('user id')
    },

    handler: async (parms) => {

        const note = (await notes.getNoteByUserId(parms.userID)).notes;
        
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(note, null, 2),
                },
            ],
        };

    }

}


export default get_user_notes;