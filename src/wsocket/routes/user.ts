import { Server, Socket } from "socket.io";


export default (io: Server, socket: Socket) => {

    socket.on('user-connect', () => {

        const userId = socket.data.userId;

        socket.join(`user:${userId}`);

        console.log(`[WS] User ${userId} joined silvernote socket.`);

    })

    socket.on('disconnect', () => {

        const userId = socket.data.userId;

        socket.leave(`user:${userId}`);

        console.log(`[WS] User ${userId} left silvernote socket.`);

    })

};