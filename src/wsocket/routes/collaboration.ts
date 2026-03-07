import { Server, Socket } from "socket.io";
import { Note } from "../../assets/ts/types.js";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import useRoom from "../../assets/ts/composables/useRoom.js";
import { clerkClient } from "@clerk/express";




export default (io: Server, socket: Socket) => {

  socket.on("join-room", async ({ room: roomId }: { room: string }) => {

    if (!roomId) return;
    const userId = socket.data.userId;
        
    const { room } = await useRoom(roomId);

    if (userId !== room.owner && !room.share.visitor.includes(userId)) {
      socket.emit('error', 'Unauthorized');
      return;
    }

    socket.join('room:' + roomId);


    socket.emit("initial-state", ({ room }));
    
    if (userId)
    {
      if (room.share && userId == room.share.owner_id) return;
      const user = await clerkClient.users.getUser(userId);
      socket.to('room:'+roomId).emit('user-join', { user: { 
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullname: user.fullName,
        imageUrl: user.imageUrl,
      } });
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
      socket.to('room:'+currentRoom).emit("y-update", Array.from(uint8Array));

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
        socket.to('room:'+currentRoom).emit("title-update", update);
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
        socket.to('room:'+currentRoom).emit("icon-update", update);
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
      socket.to('room:'+currentRoom).emit("awareness-update", Array.from(uint8Array));

    } catch (error) {
      console.error("Error applying awareness update:", error);
    }
  });

  // MCP tools emits
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
    socket.leave('room:' + room);
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

};