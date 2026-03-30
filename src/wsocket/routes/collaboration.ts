import type { Server, Socket } from "socket.io";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import useRoom from "../../assets/ts/composables/useRoom.js";
import { clerkClient } from "@clerk/express";
import { triggerSave } from "../utils/saveRoom.js";
import { disconnectQueue } from "../utils/disconnectQueue.js";


async function useRoomMiddleware
(socket: Socket, roomId: string)
{

    const userId = socket.data.userId;
    const { room, save, checkAuth, leave } = await useRoom(roomId);
    const isAuthorized = checkAuth({ userId, socket });

    if (!room)
    {
        socket.emit("error", { message: "Room not found" });
        return { room: undefined, isAuthorized: false, checkAuth, save, leave, userId };
    }

    return {
        room,
        save,
        checkAuth,
        isAuthorized,
        userId,
        leave
    }

}


export default (io: Server, socket: Socket) => {

  socket.on("join-room", async ({ room: roomId }: { room: string }) => {

    if (!roomId) return;
    const userId = socket.data.userId;
        
    const { isAuthorized, room } = await useRoomMiddleware(socket, roomId);
    if (!room) return;
    //if (!isAuthorized) return;

    socket.join('room:' + roomId);


    socket.emit("initial-state", {
        note: room.note,
        share: room.share,
        ydocState: Y.encodeStateAsUpdate(room.ydoc)
    });
    
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

  socket.on('get-initial-state', async ({ roomId }: { roomId: string }) => {

    if (!roomId) return;
    const { room } = await useRoomMiddleware(socket, roomId);
    if (!room) return;

    socket.emit("initial-state", {
        note: room.note,
        share: room.share,
        ydocState: Y.encodeStateAsUpdate(room.ydoc)
    });
  
  });

  socket.on("y-update", async ({ roomId, update }: { roomId: string, update: Uint8Array | number[] }) => {
    
    const { isAuthorized, room } = await useRoomMiddleware(socket, roomId);
    if (!room) return;
    if (!isAuthorized) return;

    try {

      const uint8Array = Buffer.isBuffer(update) ? update : new Uint8Array(update);

      Y.applyUpdate(room.ydoc, uint8Array);
      socket.to('room:'+roomId).emit("y-update", { roomId, update: uint8Array });

    } 
    catch (error) 
    {
      console.error("Error applying update : ", error);
    }

  });

  socket.on('title-update', async ({ roomId, update }: { roomId: string, update: string }) => {
    
    const { isAuthorized, room } = await useRoomMiddleware(socket, roomId);
    if (!room) return;
    if (!isAuthorized) return;

    try {

      room.note.title = update;
      socket.to('room:'+roomId).emit("title-update", { roomId, update });
      
      // Immediate save to prevent data loss
      await triggerSave(roomId, { immediate: true });

    } 
    catch (error) 
    {
      console.error("Error applying update : ", error);
    }

  });

  socket.on('icon-update', async ({ roomId, update }: { roomId: string, update: string }) => {
    
    const { isAuthorized, room } = await useRoomMiddleware(socket, roomId);
    if (!room) return;
    if (!isAuthorized) return;

    try {

      room.note.icon = update;
      socket.to('room:'+roomId).emit("icon-update", { roomId, update });
      
      // Immediate save to prevent data loss
      await triggerSave(roomId, { immediate: true });

    } 
    catch (error) 
    {
      console.error("Error applying update:", error);
    }

  });

  socket.on("awareness-update", async ({ roomId, update }: { roomId: string, update: Uint8Array | number[] }) => {
    
    const { isAuthorized, room } = await useRoomMiddleware(socket, roomId);
    if (!room) return;
    if (!isAuthorized) return;

    try {

      const uint8Array = update instanceof Uint8Array 
        ? update 
        : new Uint8Array(update);
      
      awarenessProtocol.applyAwarenessUpdate(room.awareness, uint8Array, socket);
      socket.to('room:'+roomId).emit("awareness-update", { roomId, update: Array.from(uint8Array) });

    } 
    catch (error) 
    {
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
        
        const { room } = await useRoomMiddleware({} as Socket, data.room);
        if (room) 
        {
          const ytext = room.ydoc.getText('content');
          ytext.insert(data.content.pos, data.content.html);
          console.log(`[AI Update] Content inserted at pos ${data.content.pos}, ${data.content.html.length} chars`);
        }
        
        io.to(data.room).emit('ai-content-update', data);
        
        await triggerSave(data.room, { immediate: true });

      } 
      catch (error) 
      {
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
        
        const { room } = await useRoomMiddleware({} as Socket, data.room);
        if (room) 
        {
          room.note.title = data.title;
          console.log(`[AI Update] Title set to: ${data.title}`);
        }
        
        io.to(data.room).emit('ai-title-update', data);
        
        await triggerSave(data.room, { immediate: true });

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
        
        const { room } = await useRoomMiddleware({} as Socket, data.room);
        if (room) 
        {
          room.note.icon = data.icon;
          console.log(`[AI Update] Icon set to: ${data.icon}`);
        }
        
        io.to(data.room).emit('ai-icon-update', data);
        
        await triggerSave(data.room, { immediate: true });
        
      } catch (error) {
        console.error("Error handling AI command:", error);
      }

    }
  );

  socket.on('save-room', async ({ room: roomId }: { room: string }) => {

    const { save, room } = await useRoomMiddleware(socket, roomId);
    if (!room) return;
    await save();
    socket.emit('note:update', room.note);

  })

  socket.on('leave-room', async ({ room: roomId }: { room: string }) => {

    const { leave, room } = await useRoomMiddleware(socket, roomId);
    if (!room) return;

    await leave();
    socket.leave('room:' + roomId);
    io.to(`room:${roomId}`).emit('note:update', room.note);

  });


  socket.on("disconnecting", async () => {
    
    for (const roomName of socket.rooms) 
    {

      if (roomName.startsWith('room:'))
      {

        const roomId = roomName.replace('room:', '');
        const { leave } = await useRoom(roomId);
        
        // Add to async cleanup queue instead of setImmediate
        // This ensures saves complete before server shutdown
        await disconnectQueue.addTask(async () => {
          await leave();
        });
        
      }

    }
    
    // Wait for all cleanup tasks to complete
    await disconnectQueue.drain();
  });

};