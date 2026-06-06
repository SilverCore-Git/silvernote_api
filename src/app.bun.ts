// SilverNote API - Bun optimized entry point
// Combines HTTP (Express) and WebSocket (Socket.io) on the same server

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import cors from 'cors';
import { clerkMiddleware, requireAuth, verifyToken } from '@clerk/express';
import { getMCPService } from './mcp.ts';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));

// Import routes
import api from './routes/api.ts';
import api_db from './routes/api.db.ts';
import api_ai from './routes/api.ai.ts';
import api_firebase from './routes/api.firebase.ts';
import api_share from './routes/api.share.ts';
import user from './routes/user.ts';
import money from './routes/money.ts';
import admin from './routes/admin.ts';
import resources from './routes/resources.ts';
import notifications from './routes/api.notifications.ts';
import api_2048 from './routes/api.2048.ts';
import wsRoutes from './wsocket/routes/index.ts';

// Create Express app
const app = express();

// Middlewares
const corsOptionsDelegate = function (req: Request, callback: any) {
  const origin = req.header('Origin');
  const allowedOrigins = config.corsOptions.origin;
  let corsOptions;

  if (allowedOrigins == '*') {
    corsOptions = {
      origin: origin,
      credentials: true,
      methods: config.corsOptions.methods,
      allowedHeaders: config.corsOptions.allowedHeaders,
    };
  } else if (Array.isArray(allowedOrigins) && allowedOrigins.includes(origin)) {
    corsOptions = {
      origin: origin,
      credentials: true,
      methods: config.corsOptions.methods,
      allowedHeaders: config.corsOptions.allowedHeaders,
    };
  } else {
    corsOptions = { origin: false };
  }

  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));
app.use(cookieParser(process.env.COOKIE_SIGN_KEY));
app.use(morgan('dev'));
app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(clerkMiddleware());

// Routes
app.use('/api', api);
app.use('/user', user);
app.use('/admin', admin);
app.use('/money', money);
app.use('/resources', resources);
app.use('/api/ai', requireAuth(), api_ai);
app.use('/api/firebase', requireAuth(), api_firebase);
app.use('/api/share', requireAuth(), api_share);
app.use('/api/db', requireAuth(), api_db);
app.use('/api/notifications', requireAuth(), notifications);
app.use('/api/2048', requireAuth(), api_2048);

app.get('/version', (req, res) => {
  res.json({ v: pkg.version });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ route: req.path, error: 'Route non trouvée' });
});

// Create HTTP server
const httpServer = createServer(app);

// Setup WebSocket server on the same HTTP server
const io = new Server(httpServer, {
  cors: { origin: config.corsOptions.origin },
  path: "/socket",
  transports: ["websocket", "polling"]
});

// WebSocket authentication
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error("Unauthorized: No token provided"));
  }
  try {
    const sessionClaims = await verifyToken(token, {
      jwtKey: process.env.CLERK_JWT_KEY as string
    });
    socket.data.userId = sessionClaims.sub;
    next();
  } catch (error) {
    console.error("Erreur d'auth Socket.io :", error);
    next(new Error("Unauthorized: Invalid token"));
  }
});

// WebSocket routes
io.on("connection", (socket) => {
  wsRoutes.forEach((registerRoutes) => {
    registerRoutes(io, socket);
  });
});

// MCP Initialization
async function initializeMCP() {
  try {
    console.log('Initializing MCP service...');
    const mcpService = getMCPService();
    await mcpService.connect();
    console.log('MCP service initialized successfully');
  } catch (error: any) {
    console.error('Failed to initialize MCP service:', error.message);
    console.log('Server will start without MCP features');
  }
}

// Start server
async function startServer() {
  await initializeMCP();
  
  const port = Number(process.env.PORT) || config.PORT || 3000;
  
  httpServer.listen(port, () => {
    console.log(`SilverNote API server running on port ${port}`);
    console.log(`WebSocket available on ws://localhost:${port}/socket`);
  });
}

// Graceful shutdown
function gracefulShutdown(signal: string) {
  return async () => {
    console.log(`[MCP]: ${signal} received, shutting down gracefully...`);
    try {
      const mcpService = getMCPService();
      await mcpService.disconnect();
    } catch (error) {
      console.error('Error disconnecting MCP:', error);
    }
    
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    
    setTimeout(() => {
      console.log('Forcing exit...');
      process.exit(1);
    }, 5000);
  };
}

process.on('SIGTERM', gracefulShutdown('SIGTERM'));
process.on('SIGINT', gracefulShutdown('SIGINT'));

// Start the server
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export { app, httpServer, io };
