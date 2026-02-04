import { Router, Request, Response } from 'express';
import { UUID } from 'crypto';
import notifications from '../assets/ts/db/notifications.js';


const router = Router();

router.get('/', async (req: Request, res: Response) => {

    const client_userId = req.cookies.user_id;

    if (!client_userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const notif = await notifications.getByUserId(client_userId);

    res.json(notif);

});

router.post('/mark-read/:id', async (req: Request, res: Response) => {

    const client_userId = req.cookies.user_id;

    if (!client_userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    const notifId: string = req.params.id;

    await notifications.markAsRead(notifId as UUID);

    res.json({ success: true });

});



export default router;
