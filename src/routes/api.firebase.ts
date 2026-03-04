import { Router, Request, Response } from 'express';
import { clerkClient, getAuth } from "@clerk/express";
import admin, { ServiceAccount } from 'firebase-admin';
import { join } from 'path';
import { readFileSync } from 'fs';

const filePath = join(process.cwd(), 'src/private/silvernote-f5a5a-firebase-adminsdk-fbsvc-88c7536f72.json');
const serviceAccount = JSON.parse(readFileSync(filePath, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as ServiceAccount)
});

const router = Router();


router.patch('/token', async (req: Request, res: Response) => {

    const token = req.body.token;
    const userId = String(getAuth(req).userId);

    if (!token) 
    {
        res.status(400).json({ error: true, message: 'Missing token' });
        return;
    }

    await clerkClient.users.updateUserMetadata(userId, {
        unsafeMetadata: {
            firebaseToken: token
        }
    });

})


router.post('/send/notification', async (req: Request, res: Response) => {

    const { title, body }: { title: string, body: string } = req.body;
    const userId = String(getAuth(req).userId);

    const user = await clerkClient.users.getUser(userId);

    const token = user.unsafeMetadata?.firebaseToken;
    if (!token) 
    {
        res.status(400).json({ error: true, message: 'User does not have a firebase token' });
        return;
    }

    const message = {
        notification: { title, body },
        android: {
            priority: 'high' as const,
            notification: {
                sound: 'default',
                clickAction: 'OPEN_ACTIVITY_1'
            }
        },
        token: token as string
    };

    try {

        const response = await admin.messaging().send(message);
        res.status(200).send({ success: true, messageId: response });
            
    } 
    catch (error) {
        res.status(500).send({ success: false, error });
    }

})


export default router;
