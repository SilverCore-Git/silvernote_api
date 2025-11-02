import notes from "../../../assets/ts/notes"
import { Note } from "../../../assets/ts/types"


export default async function get_note 
(parms: { uuid?: string, title?: string, userId?: string })
{

    if (parms.uuid)
    {

        const note: Note | undefined = (await notes.getNoteByUUID(parms.uuid)).note;

        if (!note) return { note: undefined };
        else return {
            note
        }

    }

    if (parms.title && parms.userId)
    {

        const all_notes: Note[] = (await notes.getNoteByUserId(parms.userId)).notes;

        const note: Note | undefined = all_notes.find(note => note.title === parms.title);

        if (!note) return { note: undefined };
        else return {
            note
        }
        
    }
    
}