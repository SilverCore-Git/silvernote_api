import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { Note } from "../types.js";
import notes from "../notes.js";
import Share from "../db/share/Share.js";
import { type Share as ShareType } from "../db/share/ShareTypes.js";


export interface Room {

  id: string; // note id
  note: Note;
  owner: string; // note owner id

  // for shared notes
  share: ShareType;

  ydoc: Y.Doc; 
  awareness: awarenessProtocol.Awareness;

  created_at: string;

}


const rooms = new Map<string, Room>();

async function useRoom (roomId: string)
{

  let room: Room | undefined = rooms.get(roomId);

  if (!room)
  {

    const note = (await notes.getNoteByUUIDNoUserID(roomId)).note;
    let share: ShareType | undefined = await Share.get(roomId);
    const ydoc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(ydoc);

    if (!note) throw new Error("Note not found");
    if (!share)
    {

      await Share.add({

        uuid: roomId,
        note_uuid: roomId,
        owner_id: note.user_id,

        params: {
          age: -1,
          editable: true,
        },

        visitor: [],
        banned: [],

        created_at: new Date().toISOString(),
        expires_at: '',

      });

      share = await Share.get(roomId);
      if (!share) throw new Error("Share not found");

    }

    room = {

      id: roomId,
      note,
      owner: note.user_id,

      share: {
        ...share,
        params: {
          ...share.params,
          passwd: undefined
        }
      },

      ydoc,
      awareness,

      created_at: new Date().toISOString()

    }

    rooms.set(roomId, room);

  }


  const save = () => {

    if (!room) return;

    const updatedNote = room.note;
    room.note.ydoc_content = Array.from(Y.encodeStateAsUpdate(room.ydoc));
    room.note.updated_at = new Date().getTime();

    notes.updateNote(updatedNote);
    Share.update(room.share);

  }


  return {
    room,
    save
  }

}


export default useRoom;