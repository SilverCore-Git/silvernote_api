import { Tool } from "../../MCPTypes.js";
import useWS from "../utils/useWS.js";
import { z } from "zod";
import * as Y from "yjs";
import { JSDOM } from "jsdom";
import schema from "../../../assets/ts/utils/getTiptapSchema/getTiptapSchema.js";
import { DOMParser } from "prosemirror-model";
import { prosemirrorToYXmlFragment } from "y-prosemirror";


const edit_note_content: Tool = {

    name: "edit_note_content",
    description: "Insère du contenu HTML à une position spécifique dans une note via WebSocket",

    params: {
        uuid: z.string().describe('UUID de la note'),
        content: z.string().describe('Le contenu HTML à insérer'),
        pos: z.number().describe("The document position index (use 0 for the start, -1 to append at the end; note that each structural tag like paragraphs or list items counts as 1 unit).")
    },

    handler: async (parms) => {

        const { socket } = useWS(parms.uuid);

        socket.emit('ai-content-update', {
            content: {
                html: parms.content,
                pos: parms.pos
            },
            room: parms.uuid
        });

        return {
            content: [{
                type: "text",
                text: `Commande d'insertion envoyée à la note ${parms.uuid}`
            }],
        };

    }

}

export default edit_note_content;