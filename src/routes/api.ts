import { Router, Request, Response } from 'express';
import { clerkClient, requireAuth } from "@clerk/express";
import { randomUUID, UUID } from 'crypto';
import News from '../assets/ts/news.js';
import notifications from '../assets/ts/db/notifications.js';


const router = Router();


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


router.get('/news', (req: Request, res: Response) => {

    const news = News.getAllNews();

    res.json(news);

});

export default router;
