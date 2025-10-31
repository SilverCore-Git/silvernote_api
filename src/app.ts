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
app.use('/api', requireAuth(), api);
app.use('/api/ai', requireAuth(), api_ai);
app.use('/api/db', requireAuth(), api_db);
app.use('/user', requireAuth(), user);
app.use('/admin', requireAuth(), admin);
app.use('/money', requireAuth(), money);



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


// Démarrage serveur
httpServer.listen(config.PORT, () => {
  console.log(`Serveur Express sur le port ${config.PORT}`);
});

