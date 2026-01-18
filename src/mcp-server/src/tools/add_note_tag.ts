import notes from "../../../assets/ts/notes.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const add_note_tag: Tool = {

    name: "add_note_tag",
    description: "Add a tag on a note with tag id",

    params: {
        uuid: z.string().describe('note uuid'),
        tagId: z.string().describe('tag id'),
    },

    handler: async (parms) => {

        const note = (await notes.getNoteByUUID(parms.uuid)).note;

        if (!note) return {
            content: [
                {
                    type: "text",
                    text: 'Note introuvable.',
                },
            ],
        };

        note.tags?.push(parms.tagId);

        await notes.updateNote(note);
        
        return {
            content: [
                {
                    type: "text",
                    text: 'Tag ajouté a la note.',
                },
            ],
        };

    }

}


export default add_note_tag;