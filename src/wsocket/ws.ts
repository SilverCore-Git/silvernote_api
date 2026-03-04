import { Server } from "socket.io";
import { createServer } from 'http';
import fs from 'fs';
import path from 'path';
import __dirname from "../assets/ts/_dirname.js";
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '../../../config.json'), 'utf-8'))
import routes from "./routes/index.js";

const httpServer = createServer();


const io = new Server(httpServer, {
  cors: { origin: config.corsOptions.origin },
  path: "/socket.io/share",
  transports: ["websocket", "polling"]
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