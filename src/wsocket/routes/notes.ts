import { Server, Socket } from "socket.io";
import type { Note } from "../../assets/ts/types.js";
import notes from "../../assets/ts/notes.js";


export default (io: Server, socket: Socket) => {

    socket.on('note:create', async (note: Note) => {

        const userId = socket.data.userId;

        if (note.user_id !== userId)
        {
            socket.emit('error', 'Unauthorized');
            return;
        }

        const res = await notes.createNote(note);

        if (res.error)
        {
            socket.emit('error', res.error);
            return;
        }

        socket.to(`user:${userId}`).emit('note:create', res.note);

    })

    socket.on('note:update', async (note: Note) => {

        const userId = socket.data.userId;

        if (note.user_id !== userId)
        {
            socket.emit('error', 'Unauthorized');
            return;
        }

        const res = await notes.updateNote(note, { noContent: true });

        if (res.error)
        {
            socket.emit('error', res.error);
            return;
        }

        socket.to(`user:${userId}`).emit('note:update', note);

    })

    socket.on('note:delete', async (note: Note) => {

        const userId = socket.data.userId;

        if (note.user_id !== userId)
        {
            socket.emit('error', 'Unauthorized');
            return;
        }

        const res = await notes.deleteNoteByUUID(note.user_id, note.uuid!);

        if (res.error)
        {
            socket.emit('error', res.error);
            return;
        }

        socket.to(`user:${userId}`).emit('note:delete', note);

    })

};