import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


interface UserItem {
    id: string;
    best_score: number;
    total_score: number;
    max_tile: number;
    lastPlayed: Date | null;
    partiesCount: number;
}

interface UserItemSmall {
    id: string;
    best_score: number;
    max_tile: number;
    lastPlayed: Date | null;
}



export class GameManager
{

    private dbPath: string;

    constructor()
    {

        const dbDir = path.join(__dirname, '../../../', 'db');
        this.dbPath = path.join(dbDir, '2048.json');

        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        if (!fs.existsSync(this.dbPath)) {
            fs.writeFileSync(this.dbPath, JSON.stringify([]), 'utf-8');
        }

    }

    public async getAll(): Promise<UserItem[]>
    {

        try {

            const data = await readFile(this.dbPath, 'utf-8');
            const users: UserItem[] = JSON.parse(data);
            
            return users.map(user => ({
                ...user,
                lastPlayed: user.lastPlayed ? new Date(user.lastPlayed) : null
            }));

        }
        catch (error) {
            console.error("Erreur lecture 2048.json:", error);
            return [];
        }

    }

    public async getByUserID(userId: string): Promise<UserItem>
    {

        const users = await this.getAll();
        const user = users.find(u => u.id === userId);

        if (user) return user;

        const newUser: UserItem = {
            id: userId,
            best_score: 0,
            total_score: 0,
            max_tile: 0,
            lastPlayed: null,
            partiesCount: 0
        };

        users.push(newUser);
        await this.saveAll(users);

        return newUser;

    }


    public async update(rawUpdate: UserItemSmall): Promise<void>
    {

        let existingUser = await this.getByUserID(rawUpdate.id);

        if (!existingUser)
        {
            existingUser = await this.create(rawUpdate.id);
        }

        const update: UserItem = {
            id: rawUpdate.id,
            best_score: rawUpdate.best_score > existingUser.best_score ? rawUpdate.best_score : existingUser.best_score,
            total_score: existingUser.total_score + rawUpdate.best_score, // best score = score
            max_tile: rawUpdate.max_tile > existingUser.max_tile ? rawUpdate.max_tile : existingUser.max_tile,
            lastPlayed: rawUpdate.lastPlayed || new Date(),
            partiesCount: existingUser.partiesCount + 1
        };

        const users = await this.getAll();
        const index = users.findIndex(u => u.id === update.id);

        if (index !== -1) {
            users[index] = { ...update };
        } else {
            users.push(update);
        }

        await this.saveAll(users);

    }

    public async create(userId: string): Promise<UserItem>
    {

        const users = await this.getAll();
        const existingUser = users.find(u => u.id === userId);

        if (existingUser) {
            return existingUser;
        }

        const newUser: UserItem = {
            id: userId,
            best_score: 0,
            total_score: 0,
            max_tile: 0,
            lastPlayed: null,
            partiesCount: 0
        };

        users.push(newUser);
        await this.saveAll(users);

        return newUser;

    }


    private async saveAll(users: UserItem[]): Promise<void>
    {
        try {
            await writeFile(this.dbPath, JSON.stringify(users, null, 2), 'utf-8');
        } catch (error) {
            console.error("Erreur écriture 2048.json:", error);
        }
    }

}

export default new GameManager();

export {
    type UserItem
};