import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createServer } from 'http';
import { SilverIssueMiddleware, webhook } from './lib/silverissue/index.js';
import AllowedOriginCheck from './middleware/AllowedOriginCheck.js';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import 'dotenv/config';

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf-8'));
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));


// Import des routes
import api from './routes/api.js';
import api_db from './routes/api.db.js';
import api_ai from './routes/api.ai.js';
import user from './routes/user.js';
import money from './routes/money.js';
import admin from './routes/admin.js';

const app = express();
const httpServer = createServer(app);
import './ws.js'; 
import { getMCPService } from './mcp.js';

// Middlewares
const corsOptionsDelegate = function (req: Request, callback: any) {
  const origin = req.header('Origin');
  const allowedOrigins = config.corsOptions.origin;
   let corsOptions;

  if (allowedOrigins == '*') 
  {
    corsOptions = {
        origin: origin,
        credentials: true,
        methods: config.corsOptions.methods,
        allowedHeaders: config.corsOptions.allowedHeaders,
    };
  }
  else 
  {
    if (allowedOrigins.includes(origin)) {
      corsOptions = {
        origin: origin,
        credentials: true,
        methods: config.corsOptions.methods,
        allowedHeaders: config.corsOptions.allowedHeaders,
      };
    } else {
      corsOptions = { origin: false };
    }
  }

  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));

app.use(cookieParser(process.env.COOKIE_SIGN_KEY));
app.use(morgan('dev'));

// app.use(AllowedOriginCheck);
app.use(SilverIssueMiddleware);

app.use(express.json({ limit: "1000mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(clerkMiddleware());


// Routes
app.use('/api', api);
app.use('/api/ai', api_ai); //requireAuth()
app.use('/user',  user);
app.use('/admin',  admin);
app.use('/money',  money);
app.use('/api/db',  api_db); //requireAuth()


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
