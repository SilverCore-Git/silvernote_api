import { io } from "socket.io-client";

type Cmd = 'insert-content' | 'set-title' | 'set-icon';

class useWS 
{

    constructor() {};

    private getSocket() 
    {
        return io('http://localhost:3434', {
            path: "/socket.io/share",
            transports: ["websocket", "polling"],
            autoConnect: true
        })
    }


    public command
    (p: { command: Cmd, room: string }, parms: any)
    {

        return new Promise<void>((resolve, reject) => {

            const socket = this.getSocket();

            socket.emit('join-room', { room: p.room })
            console.log("IA connected");

            if (p.command === "set-title") 
            {
                socket.emit('title-update', parms.newTitle);
            }

            if (p.command === "set-icon") 
            {
                socket.emit('icon-update', parms.newIcon);
            }

            if (p.command === 'insert-content')
            {
                // a faire
            }
            

            socket.disconnect();
            resolve();
            return;

        })

    }

}

export default useWS;