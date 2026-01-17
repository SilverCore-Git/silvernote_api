import { io, Socket } from "socket.io-client";

const useWSocket = () => {

    const socket: Socket = io('http://localhost:3434', {
        path: "/socket.io/share",
        transports: ["websocket", "polling"],
        autoConnect: true
    });

    return {
        socket,
        Socket
    };

}


export default useWSocket;