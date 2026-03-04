import { Server, Socket } from "socket.io";
import type { Tag } from "../../assets/ts/types.js";
import tags from "../../assets/ts/tags.js";


export default (io: Server, socket: Socket) => {

    socket.on('tag:create', async (tag: Tag) => {

        const userId = socket.data.userId;

        if (tag.user_id !== userId)
        {
            socket.emit('error', 'Unauthorized');
            return;
        }

        const res = await tags.createTag(tag);

        if (res.error)
        {
            socket.emit('error', res.error);
            return;
        }

        socket.to(`user:${userId}`).emit('tag:create', res.tag);

    })

    socket.on('tag:update', async (tag: Tag) => {

        const userId = socket.data.userId;

        if (tag.user_id !== userId)
        {
            socket.emit('error', 'Unauthorized');
            return;
        }

        const res = await tags.updateTag(tag);

        if (res.error)
        {
            socket.emit('error', res.error);
            return;
        }

        socket.to(`user:${userId}`).emit('tag:update', res.tag);

    })

    socket.on('tag:delete', async (tag: Tag) => {

        const userId = socket.data.userId;

        if (tag.user_id !== userId)
        {
            socket.emit('error', 'Unauthorized');
            return;
        }

        const res = await tags.deleteTagByUUID(tag.user_id!, tag.uuid!);

        if (res.error)
        {
            socket.emit('error', res.error);
            return;
        }

        socket.to(`user:${userId}`).emit('tag:delete', tag);

    })

};