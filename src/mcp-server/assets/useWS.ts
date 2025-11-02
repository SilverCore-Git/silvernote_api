import { io, Socket } from "socket.io-client";

type Cmd = 'insert-content' | 'set-title' | 'set-icon';

class useWS 
{
    private socket: Socket | null = null;

    constructor() {};

    private getSocket() 
    {
        if (!this.socket) {
            this.socket = io('http://localhost:3434', {
                path: "/socket.io/share",
                transports: ["websocket", "polling"],
                autoConnect: true
            });
        }
        return this.socket;
    }

    public command(
        p: { command: Cmd, room: string }, 
        parms: any
    )
    {
        try {
            return new Promise<void>((resolve, reject) => {
                const socket = this.getSocket();

                socket.on('connect', () => {
                    console.log("IA connected to room:", p.room);
                    socket.emit('join-room', { room: p.room });

                    // Attendre un peu que la room soit bien setup
                    setTimeout(() => {
                        this.executeCommand(socket, p.command, p.room, parms);

                        // Déconnecter après l'envoi
                        setTimeout(() => {
                            socket.disconnect();
                            this.socket = null;
                            resolve();
                        }, 500);
                    }, 200);
                });

                socket.on('connect_error', (error) => {
                    console.error("Connection error:", error);
                    reject(error);
                });

                // Timeout de sécurité
                setTimeout(() => {
                    if (socket.connected) {
                        socket.disconnect();
                    }
                    this.socket = null;
                    reject(new Error('Timeout: Command took too long'));
                }, 5000);
            });
        }
        catch (err) {
            throw new Error(`An error occurred on useWS: ${err}`);
        }
    }


    private executeCommand
    (socket: Socket, command: Cmd, room: string, parms: any) 
    {

        if (command === "set-title") {
            console.log("Setting title:", parms.newTitle);
            socket.emit('title-update', parms.newTitle);
        }

        if (command === "set-icon") {
            console.log("Setting icon:", parms.newIcon);
            socket.emit('icon-update', parms.newIcon);
        }

        if (command === 'insert-content') {
            socket.emit('ai-command', {
                command: 'insertContent',
                content: parms.content,
                position: parms.pos,
                replace: parms.replace
            });
            console.log("Inject content : ", { ...parms, content: parms.content.slice(0, 100) + '...' });
        }

    }

}


export default useWS;