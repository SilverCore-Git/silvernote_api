import type { Server, Socket } from "socket.io";
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import useRoom from "../../assets/ts/composables/useRoom.js";
import { clerkClient } from "@clerk/express";


async function useRoomMiddleware
(socket: Socket, roomId: string)
{

    const userId = socket.data.userId;
    const { room, save, checkAuth, leave } = await useRoom(roomId);
    const isAuthorized = checkAuth({ userId, socket });

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
    if (!isAuthorized) return;

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

    socket.emit("initial-state", {
        note: room.note,
        share: room.share,
        ydocState: Y.encodeStateAsUpdate(room.ydoc)
    });
  
  });

  socket.on("y-update", async ({ roomId, update }: { roomId: string, update: Uint8Array | number[] }) => {
    
    const { isAuthorized, room } = await useRoomMiddleware(socket, roomId);
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
    if (!isAuthorized) return;

    try {

      room.note.title = update;
      socket.to('room:'+roomId).emit("title-update", { roomId, update });

    } 
    catch (error) 
    {
      console.error("Error applying update : ", error);
    }

  });

  socket.on('icon-update', async ({ roomId, update }: { roomId: string, update: string }) => {
    
    const { isAuthorized, room } = await useRoomMiddleware(socket, roomId);
    if (!isAuthorized) return;

    try {

      room.note.icon = update;
      socket.to('room:'+roomId).emit("icon-update", { roomId, update });

    } 
    catch (error) 
    {
      console.error("Error applying update:", error);
    }

  });

  socket.on("awareness-update", async ({ roomId, update }: { roomId: string, update: Uint8Array | number[] }) => {
    
    const { isAuthorized, room } = await useRoomMiddleware(socket, roomId);
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

  socket.on('save-room', async ({ room: roomId }: { room: string }) => {

    const { save, room } = await useRoomMiddleware(socket, roomId);
    await save();
    socket.emit('note:update', room.note);

  })

  socket.on('leave-room', async ({ room: roomId }: { room: string }) => {

    const { leave, room } = await useRoomMiddleware(socket, roomId);

    await leave();
    socket.leave('room:' + roomId);
    socket.emit('note:update', room.note);

  });


  socket.on("disconnecting", async () => {
    
    for (const roomName of socket.rooms) 
    {

      if (roomName.startsWith('room:'))
      {

        const roomId = roomName.replace('room:', '');
        const { leave } = await useRoom(roomId);
        
        setImmediate(() => leave());
        
      }

    }
  });

};