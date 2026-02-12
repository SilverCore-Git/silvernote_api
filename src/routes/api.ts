import { Router, Request, Response } from 'express';
import { clerkClient } from "@clerk/express";
import { randomUUID, UUID } from 'crypto';


const router = Router();


router.get('/uuid', (req: Request, res: Response) => {
    res.json({ id: randomUUID() })
})

router.get('/user/by/id/:userid', async (req: Request, res: Response) => {

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
