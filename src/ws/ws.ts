import { Server } from "socket.io";
import { createServer } from 'http';
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import fs from 'fs';
import path from 'path';
import __dirname from "../api/assets/ts/_dirname.js";
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config.json'), 'utf-8'))
import notes from "../api/assets/ts/notes.js";
import { Note } from "../api/assets/ts/types.js";

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

  socket.on("join-room", async ({ room, userId }: { room: string, userId?: string }) => {

    if (!room) return;
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
        // auto save gérer par le client !!!
        clearInterval(saveInterval);
        //await saveNote();
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

    socket.on("y-update", async (update: Uint8Array | number[]) => 
    {

      try {

        const uint8Array = update instanceof Uint8Array 
          ? update 
          : new Uint8Array(update);

        Y.applyUpdate(ydoc, uint8Array);
        socket.to(room).emit("y-update", Array.from(uint8Array));

      } catch (error) {
        console.error("Error applying update:", error);
      }

    });


    socket.on('title-update', async (update: string) => 
    {

      try {

        const currentDoc = docs.get(room);

        if (currentDoc) 
        {
          currentDoc.title = update;
          socket.to(room).emit("title-update", update);
        }

      } catch (error) {
        console.error("Error applying update:", error);
      }

    });

    socket.on('icon-update', async (update: string) => 
    {

      try {

        const currentDoc = docs.get(room);

        if (currentDoc) 
        {
          currentDoc.icon = update;
          socket.to(room).emit("icon-update", update);
          const note: Note | undefined = await get_note(room);
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

    })

    socket.on("awareness-update", (update: Uint8Array | number[]) => 
    {

      try {

        const uint8Array = update instanceof Uint8Array 
          ? update 
          : new Uint8Array(update);
        awarenessProtocol.applyAwarenessUpdate(awareness, uint8Array, socket);
        
        socket.to(room).emit("awareness-update", Array.from(uint8Array));

      } catch (error) {
        console.error("Error applying awareness update:", error);
      }

    });

    socket.on('ai-command', async (data: { command: string; content: any }) => 
    {

      console.log(`AI command received in room ${room}:`, data.command);
      
      try {

        if (data.command === 'insertContent') {
          io.to(room).emit('ai-command', data);
        }

      } catch (error) {
        console.error("Error handling AI command:", error);
      }

    });

    socket.on("disconnect", async () => {

      const roomId = Array.from(socket.rooms)[1];
      if (!roomId) return;

      const docData = docs.get(roomId);
      if (!docData) return;

      const { ydoc, saveInterval } = docData;

      const note: Note | undefined = await get_note(roomId);
      if (note) {
        await save_note({
          ...note,
          // contenu maj avec autosave du client
          title: docData.title,
          icon: docData.icon
        });
      }
      
      awareness.setLocalState(null);
      
      if (room && io.sockets.adapter.rooms.get(room)?.size === 0) {
        if (saveInterval) {
          clearInterval(saveInterval);
        }
        docs.delete(room);
      }
      
      console.log("Client disconnected:", socket.id);
    });
  });
});

console.log("Socket.IO server running...");

httpServer.listen('3434', () => {
  console.log(`Serveur WebSocket sur le port 3434`);
});