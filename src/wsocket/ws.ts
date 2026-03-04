import { Server } from "socket.io";
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import __dirname from "../assets/ts/_dirname.js";
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../config.json'), 'utf-8'))
import routes from "./routes/index.js";
import { verifyToken } from "@clerk/express";

const httpServer = createServer();


const io = new Server(httpServer, {
  cors: { origin: config.corsOptions.origin },
  path: "/socket",
  transports: ["websocket", "polling"]
});


io.use(async (socket, next) => {
    
    const token = socket.handshake.auth.token; // on client in socket init 

    if (!token)
    {
        return next(new Error("Unauthorized: No token provided"));
    }

    try {
        
        const sessionClaims = await verifyToken(token, {
            jwtKey: process.env.CLERK_JWT_KEY as string
        });
        
        socket.data.userId = sessionClaims.sub;

        next();

    } 
    catch (error) 
    {
        console.error("Erreur d'auth Socket.io :", error);
        next(new Error("Unauthorized: Invalid token"));
    }

});

io.on("connection", (socket) => {

    routes.forEach((registerRoutes) => {
        registerRoutes(io, socket);
    });

});



console.log("Socket.IO server running...");

httpServer.listen('3434', () => {
  console.log(`Serveur WebSocket sur le port 3434`);
});