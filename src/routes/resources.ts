import { Router, Request, Response } from 'express';
import { fetch } from '../assets/ts/db/db.silvernote.js';
import { clerkClient } from '@clerk/clerk-sdk-node';


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


router.get('/clerk/users/length', async (req: Request, res: Response) => {

    const data = await clerkClient.users.getCount()

    res.json({
        users: data || null
    });

});




export default router;
