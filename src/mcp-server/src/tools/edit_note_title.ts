import { Tool } from "../../MCPTypes.js";
import useWS from "../utils/useWS.js";
import { z } from "zod";


export const edit_note_title: Tool = {

    name: "edit_note_title",
    description: "editing icon of a note",

    params: z.object({
        uuid: z.string().describe('note uuid'),
        title: z.string().describe('new title of the note'),
    }),

    handler: async (parms) => {

        const { socket } = useWS(parms.uuid);

        socket.emit('title-update', parms.title);

        return {
            content: [
                {
                    type: "text",
                    text: 'Titre de la note mis a jours.',
                },
            ],
        };

    }

}