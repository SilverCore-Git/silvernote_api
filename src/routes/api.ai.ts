import { randomUUID } from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const systeme_prompt = fs.readFileSync(path.join(__dirname, './api.ai/systeme_prompt.md'), 'utf-8');
import db from '../assets/ts/database.js';
import { getMCPService } from '../mcp.js';
import send_to_chatgpt from './api.ai/send_to_chatgpt.js';
import { Chat } from './api.ai/types.js';
import { OpenAI } from 'openai';
import { getAuth } from '@clerk/express';


const router = Router();
const AIclient = new OpenAI({ apiKey: process.env.OPENAI_SECRET_KEY });


let chats: any[] = []; //Chat[] | GeminiChat[]

router.post('/create', async (req: Request, res: Response) => {

    const user_id = String(getAuth(req).userId);

    try {

        // S'assurer que MCP est connecté
        const mcpService = getMCPService();
        await mcpService.ensureConnected();

        const existingSession = chats.find(chat => chat.userID === user_id);

        if (existingSession)
        {
            res.json({ 
                success: true, 
                session: existingSession,
                mcpConnected: mcpService.isConnected()
            });
            return;
        }

        const session: Chat = { 
            uuid: randomUUID(),
            userID: user_id,
            messages: [
                { 
                    role: "system", 
                    content: systeme_prompt 
                }
            ]
        };

        chats.push(session);

        res.json({ 
            success: true, 
            session,
            mcpConnected: mcpService.isConnected()
        });
        
    } catch (err: any) {
        res.status(500).json({ error: true, message: err.message });
        console.error('[AI CREATE SESS] : ', err)
    }

});

router.post('/close', async (req: Request, res: Response) => {
    const { uuid } = req.body;
    const user_id = String(getAuth(req).userId);

    try {
        if (!await db.get_user(user_id)) {
            res.status(400).json({ error: true, message: 'Utilisateur introuvable.' });
            return;
        }

        chats = chats.filter(chat => chat.uuid !== uuid);

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: true, message: err.message });
    }
});

router.post('/send', async (req: Request, res: Response) => {
    
    const model = req.query?.model as 'gpt' | 'gemini';

    if (true || model && model == 'gpt')
    {
        send_to_chatgpt(req, res, chats);
    }
    else
    {
        //send_to_gemini(req, res, chats);
    }

});


router.post('/send_message', async (req: Request, res: Response) => {
    
    const model = req.query?.model as string;
    const { message } = req.body;
    
    const response = await AIclient.chat.completions.create({
        model: model || 'gpt-4o',
        messages: [
            {
                role: 'system',
                content: 'You are a helpful assistant.'
            },
            {
                role: 'user',
                content: message
            }
        ]
    });

    res.json({ success: true, response: response.choices[0].message });

});

export default router;