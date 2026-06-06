import { Router, Request, Response } from 'express';
import { clerkClient, getAuth } from "@clerk/express";
import admin, { ServiceAccount } from 'firebase-admin';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple paths for Firebase SDK (works with both Bun and Node.js)
const getFirebaseKeyPath = (): string => {
  const envPath = process.env.FIREBASE_ADMIN_SDK_PATH;
  if (envPath) {
    const fullPath = join(process.cwd(), envPath);
    try {
      readFileSync(fullPath, 'utf8');
      return fullPath;
    } catch {
      // File not found at env path, try fallback
    }
  }
  
  // Fallback paths
  const possiblePaths = [
    join(__dirname, '../../private/silvernote-f5a5a-firebase-adminsdk-fbsvc-88c7536f72.json'),
    join(process.cwd(), 'src/private/silvernote-f5a5a-firebase-adminsdk-fbsvc-88c7536f72.json'),
    join(process.cwd(), 'dist/src/private/silvernote-f5a5a-firebase-adminsdk-fbsvc-88c7536f72.json'),
  ];
  
  for (const path of possiblePaths) {
    try {
      readFileSync(path, 'utf8');
      return path;
    } catch {
      // Continue to next path
    }
  }
  
  throw new Error('Firebase Admin SDK key file not found');
};

const filePath = getFirebaseKeyPath();
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
