import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { SilverIssueMiddleware, webhook } from './lib/silverissue/';
import AllowedOriginCheck from './middleware/AllowedOriginCheck';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import 'dotenv/config';

import pkg from './package.json';
import config from './config.json';

// Import des routes
import api from './routes/api';
import api_db from './routes/api.db';
import api_ai from './routes/api.ai';
import user from './routes/user';
import money from './routes/money';
import admin from './routes/admin';

const app = express();
const httpServer = createServer(app);
import './ws'; 
import { getMCPService } from './mcp';

// Middlewares
app.use(cors(config.corsOptions));
app.use(cookieParser(process.env.COOKIE_SIGN_KEY));
app.use(morgan('dev'));

app.use(AllowedOriginCheck);
app.use(SilverIssueMiddleware);

app.use(clerkMiddleware());

app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


// Routes
app.use('/api',  api); //requireAuth(),
app.use('/api/ai',  api_ai); //requireAuth(),
app.use('/api/db',  api_db); //requireAuth(),
app.use('/user',  user); //requireAuth(),
app.use('/admin',  admin); //requireAuth(),
app.use('/money',  money); //requireAuth(),



app.get('/version', (req, res) => {
  res.json({ v: pkg.version })
})

app.get('/discord_webhook_test', (req, res) => {
  if (req.query.mdp === process.env.SECRET_AI_API_KEY) webhook.sendMessage('test de webhook !');
})


// 404
app.use((req: Request, res: Response) => {
  res.status(404).json({ route: req.path, error: 'Route non trouvée' });
});


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


async function startServer() 
{
  await initializeMCP();
  httpServer.listen(config.PORT, () => {
    console.log(`Serveur Express sur le port ${config.PORT}`);
  });
} 


process.on('SIGTERM', async () => {
    console.log('[MCP]: SIGTERM received, shutting down gracefully...');
    
    const mcpService = getMCPService();
    await mcpService.disconnect();
    
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('[MCP]: SIGINT received, shutting down gracefully...');
    
    const mcpService = getMCPService();
    await mcpService.disconnect();
    
    process.exit(0);
});

// Démarrer
startServer().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
});
