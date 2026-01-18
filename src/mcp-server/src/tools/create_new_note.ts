import { randomUUID } from "crypto";
import notes from "../../../assets/ts/notes.js";
import type { Note } from "../../../assets/ts/types.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const create_new_note: Tool = {

    name: "create_new_note",
    description: "Create a note with user id, title, icon and content",

    params: {
        user_id: z.string().describe('user id'),
        title: z.string().describe('The title of the note'),
        icon: z.string().describe('The icon of the note, only a link (ex: emojiapi.dev)'),
        content: z.string().describe('The content of the note wright on HTML'),
    },

    handler: async (parms) => {

        const note: Note = {
            uuid: randomUUID(),
            user_id: parms.user_id,
            title: parms.title,
            icon: parms.icon,
            content: parms.content,
            tags: []
        }

        const res = await notes.createNote(note);

        return {
            content: [
                {
                    type: "text",
                    text: res.success ? 'Note créée avec succès.' : 'Erreur lors de la création de la note.'
                },
                res.note ? 
                {
                    type: "text",
                    text: JSON.stringify(res.note, null, 2),
                }
                : null,
            ],
        };

    }

}


export default create_new_note;