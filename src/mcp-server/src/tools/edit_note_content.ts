import { Tool } from "../../MCPTypes.js";
import useWS from "../utils/useWS.js";
import { z } from "zod";


const edit_note_content: Tool = {

    name: "edit_note_content",
    description: "editing content of a note",

    params: {
        uuid: z.string().describe('note uuid'),
        content: z.string().describe('the content to insert on the note'),
        pos: z.number().describe('the position where the content will be inserted corresponds to a certain number of characters.')
    },

    handler: async (parms) => {

        const { socket } = useWS(parms.uuid);

        socket.emit('ai-command', {
            command: 'insertContent',
            content: parms.content,
            pos: parms.pos
        })

        return {
            content: [
                {
                    type: "text",
                    text: 'Contenu de la note mis a jours.',
                },
            ],
        };

    }

}


export default edit_note_content;