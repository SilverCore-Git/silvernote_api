import { UUID, randomUUID } from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import __dirname from '../assets/ts/_dirname.js';
const _config = JSON.parse(fs.readFileSync(path.join(__dirname, '../config/jeremy_ai.json'), 'utf-8'))
const prompt_system = _config.prompt_system;
import db from '../assets/ts/database.js';
import notes_db from '../assets/ts/notes.js';
import tags_db from '../assets/ts/tags.js';
import { getMCPService } from '../mcp.js';
import send_to_chatgpt from './api.ai/send_to_chatgpt.js';
import { Chat } from './api.ai/types.js';

const router = Router();


let chats: Chat[] = [];

function verify_auth(req: Request, res: Response, next: NextFunction) {
    next();
}


router.post('/create', verify_auth, async (req: Request, res: Response) => {
    const { user } = req.body;

    try {
        const notes = await notes_db.getNoteByUserId(user.id);
        const tags = await tags_db.getTagsByUserId(user.id);

        if (!await db.exist_user(user.id)) {
            res.status(400).json({ 
                error: true, 
                message: 'Utilisateur introuvable.', 
                exist_user: await db.exist_user(user.id), 
                user_id: user.id
            });
            return;
        }

        const truncatedNotes = notes.notes.map(note => ({
            ...note,
            content: note.content?.slice(0, 1000) + '...'
        }));

        // S'assurer que MCP est connecté
        const mcpService = getMCPService();
        await mcpService.ensureConnected();

        const session: Chat = { 
            uuid: randomUUID(),
            userID: user.id,
            data: {
                notes,
                tags
            },
            messages: [
                { 
                    role: "system", 
                    content: `${prompt_system}. L'utilisateur se nome : ${user.fullName}. Voici les donnés de l'utilisateur en format json : notes: ${JSON.stringify(truncatedNotes)} tags: ${JSON.stringify(tags.tags)}` 
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
    const { uuid, userID } = req.body;

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
    return send_to_chatgpt(req, res, chats);
});

export default router;