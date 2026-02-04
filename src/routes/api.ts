import { Router, Request, Response } from 'express';
import { clerkClient } from "@clerk/express";
import { randomUUID } from 'crypto';
import News from '../assets/ts/news.js';


const router = Router();


router.get('/news', (req: Request, res: Response) => {

    const news = News.getAllNews();

    res.json(news);

})

router.get('/uuid', (req, res) => {
    res.json({ id: randomUUID() })
})

router.get('/user/by/id/:userid', async (req, res) => {

    const userid: string = req.params.userid;
    const client_userId = req.cookies.user_id;

    const user = await clerkClient.users.getUser(userid);

    res.json({ 
        isMe: client_userId == userid,
        user_id: userid,
        username: user.username,
        imageUrl: user.imageUrl 
    });

})


router.get('/notifications', async (req, res) => {

    const client_userId = req.cookies.user_id;

    if (!client_userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const notifications = await clerkClient.users.getUserNotifications(client_userId);

    res.json({ notifications });

});


export default router;
