import { randomUUID } from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import __dirname from '../assets/ts/_dirname.js';
const _config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/jeremy_ai.json'), 'utf-8'))
const prompt_system = _config.prompt_system;
import db from '../assets/ts/database.js';
import { getMCPService } from '../mcp.js';
import send_to_chatgpt from './api.ai/send_to_chatgpt.js';
import { Chat } from './api.ai/types.js';

const router = Router();


let chats: any[] = []; //Chat[] | GeminiChat[]

function verify_auth(req: Request, res: Response, next: NextFunction) {
    next();
}


router.post('/create', verify_auth, async (req: Request, res: Response) => {

    const { user } = req.body;

    try {

        if (!await db.exist_user(user.id)) {
            res.status(400).json({ 
                error: true, 
                message: 'Utilisateur introuvable.', 
                exist_user: await db.exist_user(user.id), 
                user_id: user.id
            });
            return;
        }

        // S'assurer que MCP est connecté
        const mcpService = getMCPService();
        await mcpService.ensureConnected();

        const session: Chat = { 
            uuid: randomUUID(),
            userID: user.id,
            messages: [
                { 
                    role: "system", 
                    content: `${prompt_system}. L'utilisateur se nome : ${user.fullName}. Son userID est : ${user.id}.` 
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
    }

});

router.post('/close', verify_auth, async (req: Request, res: Response) => {
    const { uuid } = req.body;
    const userID = req.cookies.user_id;

    try {
        if (!await db.get_user(userID)) {
            res.status(400).json({ error: true, message: 'Utilisateur introuvable.' });
            return;
        }

        chats = chats.filter(chat => chat.uuid !== uuid);

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: true, message: err.message });
    }
});

router.post('/send', verify_auth, async (req: Request, res: Response) => {
    
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

export default router;