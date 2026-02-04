import { Router, Request, Response } from 'express';
import { UUID } from 'crypto';
import Notifications from '../assets/ts/db/notifications.js';
import News from '../assets/ts/news.js';


const router = Router();

router.get('/', async (req: Request, res: Response) => {

    const client_userId = req.cookies.user_id;

    if (!client_userId) {
        res.status(401).json({ error: true, message: 'UserId cookie not set' });
        return;
    }

    const notif = await Notifications.getByUserId(client_userId);
    const news = News.getAllNews();

    let response = [
        ...notif,
        ...news
    ]
    .filter(n => {

        const readers = n.readBy || [];
        const isRead = readers.includes(client_userId);
        
        const notifDate = new Date(n.date).getTime();
        const now = new Date().getTime();
        const oneDayInMs = 24 * 60 * 60 * 1000;
        const isOlderThanADay = (now - notifDate) > oneDayInMs;

        return !isRead || !isOlderThanADay;
        
    })
    .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
    });

    res.json(response);

});

router.post('/mark-read/:id', async (req: Request, res: Response) => {

    const client_userId = req.cookies.user_id;

    if (!client_userId) {
        res.status(401).json({ error: true, message: 'UserId cookie not set' });
        return;
    }

    const notifId: string = req.params.id;

    await Promise.all([
        Notifications.markAsRead(notifId, client_userId),
        News.markNewsAsRead(notifId, client_userId)
    ]);

    res.json({ success: true });

});


export default router;
