import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { Note } from "../types.js";
import notes from "../notes.js";
import Share from "../db/share/Share.js";
import { type Share as ShareType } from "../db/share/ShareTypes.js";
import { Server, Socket } from "socket.io";
import { TiptapTransformer } from '@hocuspocus/transformer';
import { decrypt } from "../utils/scrypto/scrypto.js";


export interface Room {

  id: string; // note id
  note: Note;
  owner: string; // note owner id
  saveInterval?: NodeJS.Timeout;

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

    if (room.note.content_type == 'ydoc')
    {
      if (room.note.ydoc_content) Y.applyUpdate(ydoc, room.note.ydoc_content as Buffer, 'database');
    }
    else if (room.note.content_type == 'text/html/crypted' || room.note.content_type == 'text/html')
    {

      try {

          let content = room.note.content;

          if (room.note.content_type == 'text/html/crypted')
          {
            content = decrypt(room.note.content, room.note.user_id);
          }

          if (!content || content.trim() === '')
          {
              content = '<p></p>'; 
          }

          const tempDoc = TiptapTransformer.toYdoc(content, 'default');
          const state = Y.encodeStateAsUpdate(tempDoc);
          Y.applyUpdate(ydoc, state, 'migration-html');

          room.note.content_type = 'ydoc';

      } 
      catch (err) 
      {
          throw new Error(`[Room ${roomId}] Migration failed : ${err}`);
      }

    }
    else
    {
      throw new Error(`Invalid content type : ${JSON.stringify(room.note, null, 2)}`);
    }

    rooms.set(roomId, room);

  }


  const save = async () => {

      if (!room) return;

      try {
        
          const update = Y.encodeStateAsUpdate(room.ydoc);
          const ydocBuffer = Buffer.from(update);
          
          room.note.ydoc_content = ydocBuffer;
          room.note.content_type = 'ydoc';
          room.note.updated_at = Date.now();

          await Promise.all([
              notes.updateNote(room.note),
              Share.update(room.share)
          ]);
          
          console.log(`[Room ${room.id}] Saved successfully`);

      } 
      catch (error) 
      {
          console.error("Erreur lors de la sauvegarde de la room : ", error);
      }

  };

  const checkAuth = ({ userId, socket }: { userId: string, socket: Socket }) => {

    if (userId !== room.owner && !room.share.visitor.includes(userId))
    {
      socket.emit('error', 'Unauthorized');
      return false;
    }
    return true;

  }

  if (!room.saveInterval) room.saveInterval = setInterval(save, 10000);

  const leave = async () => {
  
    clearInterval(room.saveInterval);
    await save();

    room.awareness.destroy();
    room.ydoc.destroy();
    rooms.delete(roomId);


  };


  return {
    room,
    checkAuth,
    save,
    leave
  }

}


export default useRoom;