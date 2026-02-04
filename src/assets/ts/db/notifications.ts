import { randomUUID, type UUID } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


interface Btn { 
    text: string; 
    action: string, // () => void 
    type: 'default-primary' | 'primary' | 'primary danger'
};

interface NotificationItem {
    id: UUID;
    title: string;
    content: string; // md format
    date: Date;
    readBy: string[];
    forUserId: string[];
    btns?: Btn[];
}

export class NotificationManager
{

    private dbPath: string;

    constructor() {
        this.dbPath = path.join(__dirname, '../../../', 'db', 'notifications.json');
        if (!fs.existsSync(this.dbPath)) fs.writeFileSync(this.dbPath, JSON.stringify([]), 'utf-8');
    }

    /**
     * Read all notifications from the JSON file
     */
    private async getAll(): Promise<NotificationItem[]>
    {

        try {

            const data = await readFile(this.dbPath, 'utf-8');
            const parseData: NotificationItem[] = JSON.parse(data);
            
            return parseData.map((n: any) => ({
                ...n,
                date: new Date(n.date)
            }));

        }
        catch (error) {
            return [];
        }

    }

    /**
     * Save all notifications to the JSON file
     */
    private async save(notifications: NotificationItem[]): Promise<void>
    {
        await writeFile(this.dbPath, JSON.stringify(notifications, null, 2), 'utf-8');
    }

    /**
     * Get notifications for a specific user
     */
    public async getForUser(userId: string): Promise<NotificationItem[]>
    {
        const all = await this.getAll();
        return all.filter(n => n.forUserId.includes(userId));
    }

    /**
     * Count unread notifications for today for a specific user
     */
    public async countTodayUnread(userId: string): Promise<number>
    {

        const all = await this.getAll();
        const today = new Date().toLocaleDateString();
        
        return all.filter(n => 
            n.forUserId.includes(userId) && 
            !n.readBy.includes(userId) && 
            new Date(n.date).toLocaleDateString() === today
        ).length;

    }

    /**
     * Add a new notification
     */
    public async add(notif: Omit<NotificationItem, 'id' | 'date' | 'readBy'>): Promise<NotificationItem>
    {

        const all = await this.getAll();
        const newNotif: NotificationItem = {
            ...notif,
            id: randomUUID(),
            date: new Date(),
            readBy: []
        };

        all.push(newNotif);
        await this.save(all);
        return newNotif;

    }

    /**
     * Mark a notification as read
     */
    public async markAsRead(id: string, user_id: string): Promise<void>
    {

        const all = await this.getAll();
        const index = all.findIndex(n => n.id === id);

        if (index !== -1) {
            if (all[index].readBy.includes(user_id)) return;
            all[index].readBy.push(user_id);
            await this.save(all);
        }

    }

    public async getByUserId(userId: string): Promise<NotificationItem[]>
    {
        const all = await this.getAll();
        return all.filter(n => n.forUserId.includes(userId));
    }

}

export default new NotificationManager();

export {
    type NotificationItem
}