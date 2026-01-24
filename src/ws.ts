import { Server } from "socket.io";
import { createServer } from 'http';
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import fs from 'fs';
import path from 'path';
import __dirname from "./assets/ts/_dirname.js";
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config.json'), 'utf-8'))
import notes from "./assets/ts/notes.js";
import { Note } from "./assets/ts/types.js";

const httpServer = createServer();

const save_note = async (note: Note): Promise<void> => {
  await notes.updateNote({
    ...note,
    updated_at: new Date().getTime()
  });
}

const get_note = async (uuid: string): Promise<Note | undefined> => {
  const res = await notes.getNoteByUUID(uuid);
  if (res.note) return res.note;
}


const io = new Server(httpServer, {
  cors: { origin: config.corsOptions.origin },
  path: "/socket.io/share",
  transports: ["websocket", "polling"]
});

const docs = new Map<string, { 
  ydoc: Y.Doc, 
  awareness: awarenessProtocol.Awareness,
  saveInterval?: NodeJS.Timeout,
  title: string,
  icon: string
}>();

io.on("connection", (socket) => {

  console.log("Client connected :", socket.id);

  // Stocker la room du socket pour l'utiliser dans les autres événements
  let currentRoom: string | null = null;

  socket.on("join-room", async ({ room, userId }: { room: string, userId?: string }) => {

    if (!room) return;
    
    currentRoom = room; // Stocker la room
    socket.join(room);
    
    let docData = docs.get(room);

    if (!docData) {
      const ydoc = new Y.Doc();
      const fragment = ydoc.getXmlFragment("prosemirror");
      const awareness = new awarenessProtocol.Awareness(ydoc);
      const note = await get_note(room);
      
      const title = note?.title || "";
      const icon = note?.icon || "";

      const saveInterval = setInterval(async () => {
        clearInterval(saveInterval);
      }, 10000);

      docs.set(room, { ydoc, awareness, saveInterval, title, icon });
      docData = { ydoc, awareness, saveInterval, title, icon };
    }

    const { ydoc, awareness } = docData;

    const initialState = Y.encodeStateAsUpdate(ydoc);
    const stateArray = Array.from(initialState);
    socket.emit("sync", stateArray);
    
    socket.emit("title-update", docData.title);
    socket.emit("icon-update", docData.icon);
    
    if (userId) {
      socket.emit('new_user', userId);
    }
  });

  socket.on("y-update", async (update: Uint8Array | number[]) => {
    
    if (!currentRoom) return;
    const docData = docs.get(currentRoom);
    if (!docData) return;

    try {
      const uint8Array = update instanceof Uint8Array 
        ? update 
        : new Uint8Array(update);

      Y.applyUpdate(docData.ydoc, uint8Array);
      socket.to(currentRoom).emit("y-update", Array.from(uint8Array));

    } catch (error) {
      console.error("Error applying update:", error);
    }
  });

  socket.on('title-update', async (update: string) => {
    
    if (!currentRoom) return;
    const docData = docs.get(currentRoom);

    try {
      if (docData) {
        docData.title = update;
        socket.to(currentRoom).emit("title-update", update);
      }
    } catch (error) {
      console.error("Error applying update:", error);
    }
  });

  socket.on('icon-update', async (update: string) => {
    
    if (!currentRoom) return;
    const docData = docs.get(currentRoom);

    try {
      if (docData) {
        docData.icon = update;
        socket.to(currentRoom).emit("icon-update", update);
        const note: Note | undefined = await get_note(currentRoom);
        if (note) {
          await save_note({
            ...note,
            icon: update
          });
        }
      }
    } catch (error) {
      console.error("Error applying update:", error);
    }
  });

  socket.on("awareness-update", (update: Uint8Array | number[]) => {
    
    if (!currentRoom) return;
    const docData = docs.get(currentRoom);
    if (!docData) return;

    try {
      const uint8Array = update instanceof Uint8Array 
        ? update 
        : new Uint8Array(update);
      
      awarenessProtocol.applyAwarenessUpdate(docData.awareness, uint8Array, socket);
      socket.to(currentRoom).emit("awareness-update", Array.from(uint8Array));

    } catch (error) {
      console.error("Error applying awareness update:", error);
    }
  });

  socket.on('ai-content-update',
    async (data: {
            content: {
                html: string,
                pos: number
            },
            room: string
        }
    ) => {
      
      if (!data.room) return;

      try {
        io.to(data.room).emit('ai-content-update', data);
      } catch (error) {
        console.error("Error handling AI command:", error);
      }

    }
  );

  socket.on('ai-title-update',
    async (data: {
            title: string,
            room: string
        }
    ) => {
      
      if (!data.room) return;

      try {
        io.to(data.room).emit('ai-title-update', data);
      } catch (error) {
        console.error("Error handling AI command:", error);
      }

    }
  );

  socket.on('ai-icon-update',
    async (data: {
            icon: string,
            room: string
        }
    ) => {
      
      if (!data.room) return;

      try {
        io.to(data.room).emit('ai-icon-update', data);
      } catch (error) {
        console.error("Error handling AI command:", error);
      }

    }
  );

  socket.on('leave-room', ({ room }: { room: string }) => {
    socket.leave(room);
    if (currentRoom === room) {
      currentRoom = null;
    }
  });

  socket.on("disconnect", async () => {

    if (!currentRoom) return;

    const docData = docs.get(currentRoom);
    if (!docData) return;

    const { awareness, saveInterval } = docData;
    
    const note: Note | undefined = await get_note(currentRoom);
    if (note) {
      await save_note({
        ...note,
        title: docData.title,
        icon: docData.icon
      });
    }
    
    awareness.setLocalState(null);
    
    if (io.sockets.adapter.rooms.get(currentRoom)?.size === 0) {
      if (saveInterval) {
        clearInterval(saveInterval);
      }
      docs.delete(currentRoom);
    }
    
    console.log("Client disconnected:", socket.id);
  });

});

console.log("Socket.IO server running...");

httpServer.listen('3434', () => {
  console.log(`Serveur WebSocket sur le port 3434`);
});