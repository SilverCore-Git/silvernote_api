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

// In-flight room creations. Without this, concurrent calls for a missing room
// (typically the burst of buffered y-updates flushed by a client on reconnect)
// each load the note and build their own Y.Doc; the last rooms.set() wins and
// the updates applied to the other docs are silently lost.
const pendingRooms = new Map<string, Promise<Room | undefined>>();

// Rooms whose final save is in progress (leave()). New arrivals wait for it and
// reload from DB, instead of writing into a Y.Doc that is about to be destroyed
// after its snapshot was already taken.
const closingRooms = new Map<string, Promise<void>>();

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

async function getRoom (roomId: string): Promise<Room | undefined>
{

  const closing = closingRooms.get(roomId);
  if (closing) await closing;

  const existing = rooms.get(roomId);
  if (existing) return existing;

  let pending = pendingRooms.get(roomId);
  if (!pending)
  {
    pending = loadRoom(roomId).finally(() => pendingRooms.delete(roomId));
    pendingRooms.set(roomId, pending);
  }

  return pending;

}

async function loadRoom (roomId: string): Promise<Room | undefined>
{

    const note = (await notes.getNoteByUUIDNoUserID(roomId)).note;
    let share: ShareType | undefined = await Share.get(roomId);
    const ydoc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(ydoc);

    if (!note)
    {
      console.error(`[Room ${roomId}] Erreur : Note introuvable en DB`);
      return undefined;
    };

    const room: Room = {

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

    return room;

}


async function useRoom (roomId: string)
{

  const room = await getRoom(roomId);

  if (!room)
  {
    return { room: undefined, checkAuth: () => false, save: async () => {}, leave: async () => {} };
  }

  const save = async () => {

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

    // Already left, or replaced by a fresher room since.
    if (rooms.get(roomId) !== room) return;

    console.log(`[Room ${roomId}] Cleaning up...`);

    // Detach first so that no new update can land in this doc after the save
    // snapshot: concurrent callers will wait on `closing` then reload from DB.
    rooms.delete(roomId);

    if (room.saveInterval)
    {
      clearInterval(room.saveInterval);
      room.saveInterval = undefined;
    }

    const closing = (async () => {
      await save();
      room.awareness.destroy();
      room.ydoc.destroy();
    })();

    closingRooms.set(roomId, closing);

    try {
      await closing;
    }
    finally {
      if (closingRooms.get(roomId) === closing) closingRooms.delete(roomId);
    }

  };


  return {
    room,
    checkAuth,
    save,
    leave
  }

}


export default useRoom;