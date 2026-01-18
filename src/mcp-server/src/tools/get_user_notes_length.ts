import notes from "../../../assets/ts/notes.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const get_user_notes_length: Tool = {

    name: "get_user_notes_length",
    description: "Get user notes length by user id",

    params: {
        userID: z.string()
    },

    handler: async (parms) => {

        const allNotes = (await notes.getNoteByUserId(parms.userID)).notes;

        return {
            content: [
                {
                    type: "text",
                    text: allNotes.length.toString(),
                },
            ],
        };

    }
    
}


export default get_user_notes_length;