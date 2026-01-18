import { Tool } from "../../MCPTypes.js";
import useWS from "../utils/useWS.js";
import { z } from "zod";


const edit_note_icon: Tool = {

    name: "edit_note_icon",
    description: "editing icon of a note",

    params: {
        uuid: z.string().describe('note uuid'),
        icon: z.string().describe('new icon of the note, link only (ex: emojiapi.dev)'),
    },

    handler: async (parms) => {

        const { socket } = useWS(parms.uuid);

        socket.emit('icon-update', parms.icon);


        return {
            content: [
                {
                    type: "text",
                    text: 'Icon de la note mis a jours.',
                },
            ],
        };

    }

}


export default edit_note_icon;