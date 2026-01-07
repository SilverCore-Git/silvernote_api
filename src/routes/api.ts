import { Router, Request, Response } from 'express';
import fs from 'fs';
import type { News } from '../assets/ts/types.js';
import { clerkClient } from "@clerk/express";
import { randomUUID } from 'crypto';


const router = Router();


router.get('/get_news', async (req: Request, res: Response) => {

    const data = await fs.promises.readFile(process.env.CONFIG_PATH || './dist/config.json', 'utf-8'); // remettre ./config pour prod
    const news: Promise<News> = JSON.parse(data).news;

    res.json( (await news).active ? news : false );

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


export default router;
