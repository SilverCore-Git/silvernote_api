import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import { Note } from "../types.js";
import notes from "../notes.js";
import Share from "../db/share/Share.js";
import { type Share as ShareType } from "../db/share/ShareTypes.js";
import { Socket, Server } from "socket.io";
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

  // true when the HTML -> Yjs migration failed (e.g. decrypt() threw) :
  // saving must be blocked while this is true, to avoid overwriting the
  // original content with an empty Y.Doc.
  migrationFailed: boolean;

}


const rooms = new Map<string, Room>();

// Socket.io server instance, injected once from collaboration.ts so that
// useRoom() can emit save acknowledgements ('note-persisted') even from the
// autosave interval, which isn't tied to any particular socket.
let ioInstance: Server | undefined;

export function setIO (io: Server)
{
  ioInstance = io;
}

function notifyPersisted (roomId: string, ok: boolean, message?: string)
{
  if (!ioInstance) return;
  ioInstance.to('room:' + roomId).emit('note-persisted', { roomId, ok, ...(message ? { message } : {}) });
}

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

      created_at: new Date().toISOString(),

      migrationFailed: false

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

          room.note.content_type = 'ydoc';

      }
      catch (err)
      {
          console.error(`[Room ${roomId}] Migration failed : ${err}`);
          room.migrationFailed = true;
      }

    }
    else
    {
      console.error(`Invalid content type : ${JSON.stringify(room.note, null, 2)}`);
    }

    const saveInternal = async () => {
      
      const currentRoom = rooms.get(roomId);
      if (!currentRoom) return;

      if (currentRoom.migrationFailed)
      {
        console.error(`[Room ${roomId}] Auto-save skipped : migration from HTML to Y.Doc failed earlier, refusing to overwrite the original content with an empty note.`);
        notifyPersisted(roomId, false, "Migration failed, save aborted to avoid data loss");
        return;
      }

      try {

        const update = Y.encodeStateAsUpdate(currentRoom.ydoc);

        currentRoom.note.ydoc_content = Buffer.from(update);
        currentRoom.note.content_type = 'ydoc';
        currentRoom.note.updated_at = Date.now();
        await notes.updateNote(currentRoom.note);

        console.log(`[Room ${currentRoom.id}] Auto-saved`);
        notifyPersisted(roomId, true);

      }
      catch (error)
      {
        console.error(`[Room ${roomId}] Erreur sauvegarde auto:`, error);
        notifyPersisted(roomId, false, "Auto-save failed");
      }

    };

    room.saveInterval = setInterval(saveInternal, 10000);

    rooms.set(roomId, room);

  }


  const save = async () => {

      if (!room) return;

      if (room.migrationFailed)
      {
        console.error(`[Room ${roomId}] Save skipped : migration from HTML to Y.Doc failed earlier, refusing to overwrite the original content with an empty note.`);
        notifyPersisted(roomId, false, "Migration failed, save aborted to avoid data loss");
        return;
      }

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
          notifyPersisted(roomId, true);

      }
      catch (error)
      {
          console.error(`[Room ${roomId}] Erreur lors de la sauvegarde de la room : `, error);
          notifyPersisted(roomId, false, "Save failed");
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