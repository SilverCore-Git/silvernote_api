import { randomUUID, type UUID } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface NotificationItem {
    id: UUID;
    title: string;
    content: string; // md format
    date: Date;
    read: boolean;
    forUserId: string[];
}

export class NotificationManager
{

    private dbPath: string;

    constructor() {
        this.dbPath = path.join(__dirname, '../../../../', 'db', 'notifications.json');
    }

    /**
     * Read all notifications from the JSON file
     */
    private async getAll(): Promise<NotificationItem[]>
    {

        try {

            const data = await readFile(this.dbPath, 'utf-8');
            
            return JSON.parse(data).map((n: any) => ({
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
    async getForUser(userId: string): Promise<NotificationItem[]>
    {
        const all = await this.getAll();
        return all.filter(n => n.forUserId.includes(userId));
    }

    /**
     * Count unread notifications for today for a specific user
     */
    async countTodayUnread(userId: string): Promise<number>
    {

        const all = await this.getAll();
        const today = new Date().toLocaleDateString();
        
        return all.filter(n => 
            n.forUserId.includes(userId) && 
            !n.read && 
            new Date(n.date).toLocaleDateString() === today
        ).length;

    }

    /**
     * Add a new notification
     */
    async add(notif: Omit<NotificationItem, 'id' | 'date' | 'read'>): Promise<NotificationItem>
    {

        const all = await this.getAll();
        const newNotif: NotificationItem = {
            ...notif,
            id: randomUUID(),
            date: new Date(),
            read: false
        };

        all.push(newNotif);
        await this.save(all);
        return newNotif;

    }

    /**
     * Mark a notification as read
     */
    async markAsRead(id: UUID): Promise<void>
    {
        
        const all = await this.getAll();
        const index = all.findIndex(n => n.id === id);

        if (index !== -1) {
            all[index].read = true;
            await this.save(all);
        }

    }

}