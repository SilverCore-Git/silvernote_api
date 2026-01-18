import notes from "../../../assets/ts/notes.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const get_note: Tool = {

    name: "get_note",
    description: "Get note by UUID",

    params: {
        uuid: z.string().describe('note uuid')
    },

    handler: async (parms) => {

        const note = (await notes.getNoteByUUID(parms.uuid)).note;
        
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


export default get_note;