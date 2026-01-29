import { Router, Request, Response } from 'express';
import { fetch } from '../assets/ts/db/db.silvernote.js';


const router = Router();


router.get('/test', async (req: Request, res: Response) => {
    res.json({ test: true });
})


router.get('/db/length', async (req: Request, res: Response) => {
    
    const notesLength = await fetch('/notes/length');
    const tagsLength = await fetch('/tags/length');

    res.json({
        notes: notesLength,
        tags: tagsLength
    });

})



export default router;
