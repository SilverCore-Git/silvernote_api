import { io, Socket } from "socket.io-client";

const useWSocket = (room: string) => {

    const socket: Socket = io('http://localhost:3434', {
        path: "/socket.io/share",
        transports: ["websocket", "polling"],
        autoConnect: true
    });

    socket.on('connect', () => {
        socket.emit('join-room', room);
    });

    return {
        socket,
        Socket
    };

}


export default useWSocket;