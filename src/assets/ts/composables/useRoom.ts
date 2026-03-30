import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { Note } from "../types.js";
import notes from "../notes.js";
import Share from "../db/share/Share.js";
import { type Share as ShareType } from "../db/share/ShareTypes.js";
import { Socket } from "socket.io";
import { decrypt } from "../utils/scrypto/scrypto.js";


export interface Room {

  id: string; // note id
  note: Note;
  owner: string; // note owner id
  saveInterval?: NodeJS.Timeout;

  // for shared notes
  share?: ShareType;

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

    if (!note)
    {
      console.error(`[Room ${roomId}] Erreur : Note introuvable en DB`);
      return { room: undefined, checkAuth: () => false, save: async () => {}, leave: async () => {} };
    };

    room = {

      id: roomId,
      note,
      owner: note.user_id,

      share: share ? {
        ...share,
        params: {
          ...share.params,
          passwd: undefined
        }
      } : undefined,

      ydoc,
      awareness,

      created_at: new Date().toISOString()

    }

    if (room.note.content_type == 'ydoc')
    {
      if (room.note.ydoc_content && room.note.ydoc_content.length > 0) Y.applyUpdate(ydoc, room.note.ydoc_content as Buffer, 'database');
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

          // BUG FIX: Apply HTML content to Yjs document
          // Otherwise ydoc starts empty after migration
          const ytext = ydoc.getText('content');
          ytext.insert(0, content);
          
          // Encode the applied content to ydoc_content buffer
          room.note.ydoc_content = Buffer.from(Y.encodeStateAsUpdate(ydoc));
          room.note.content_type = 'ydoc';

          console.log(`[Room ${roomId}] HTML→Yjs migration completed, applied ${content.length} chars`);

      } 
      catch (err) 
      {
          console.error(`[Room ${roomId}] Migration failed : ${err}`);
      }

    }
    else
    {
      console.error(`Invalid content type : ${JSON.stringify(room.note, null, 2)}`);
    }

    const saveInternal = async () => {
      
      const currentRoom = rooms.get(roomId);
      if (!currentRoom) return; 

      try {

        const update = Y.encodeStateAsUpdate(currentRoom.ydoc);

        currentRoom.note.ydoc_content = Buffer.from(update);
        currentRoom.note.updated_at = Date.now();
        await notes.updateNote(currentRoom.note);

        console.log(`[Room ${currentRoom.id}] Auto-saved`);
        
      }
      catch (error) 
      {
        console.error("Erreur sauvegarde auto:", error);
      }

    };

    room.saveInterval = setInterval(saveInternal, 10000);

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
              notes.updateNote(room.note)
          ]);
          
          console.log(`[Room ${room.id}] Saved successfully`);

      } 
      catch (error) 
      {
          console.error("Erreur lors de la sauvegarde de la room : ", error);
      }

  };

  const checkAuth = ({ userId, socket }: { userId: string, socket: Socket }) => {

    if (userId !== room.owner && !room.share?.visitor.includes(userId))
    {
      socket.emit('error', 'Unauthorized');
      return false;
    }
    return true;

  }

  const leave = async () => {
    
    const roomToCleanup = rooms.get(roomId);
    if (!roomToCleanup) return;

    console.log(`[Room ${roomId}] Cleaning up...`);
    
    if (roomToCleanup.saveInterval) 
    {
      clearInterval(roomToCleanup.saveInterval);
      roomToCleanup.saveInterval = undefined; 
    }

    await save();

    roomToCleanup.awareness.destroy();
    roomToCleanup.ydoc.destroy();
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