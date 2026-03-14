import nodeFetch from 'node-fetch';
import { dbAgent } from './db/userDB.js';
import 'dotenv/config';
import type { Share as ShareType } from './db/share/ShareTypes.js';


class Share {

    constructor() 
    {
        this.ping()
            .then(ok => console.log(ok ? 'Ping db successfully.' : 'Error ping db.'));
    }

    private async ping(): Promise<boolean> 
    {
        try {
            const res = await nodeFetch('https://db.silvernote.fr/ping', {
                headers: {
                    "Authorization": process.env.DB_API_SK_1 || "",
                    "X-API-Key": process.env.DB_API_SK_2 || ""
                }
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    private async fetch(
        path: string,
        opt: { method?: 'POST' | 'GET' | 'DELETE' | 'PATCH', body?: any } = { method: 'GET' }
    ): Promise<any>
    {

        try {
            
            const url = 'https://db.silvernote.fr/v3/share' + path;
            
            const res = await nodeFetch(url, {
                method: opt.method || 'GET',
                body: opt.body ? JSON.stringify(opt.body) : undefined,
                agent: dbAgent,
                headers: {
                    "Authorization": process.env.DB_API_SK_1 || "",
                    "X-API-Key": process.env.DB_API_SK_2 || "",
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) 
            {
                const text = await res.text();
                console.error(`API ${res.status} on ${url}:`, text);
                return null;
            }

            return await res.json();

        } 
        catch (err) 
        {
            console.error("Network error:", err);
            return null;
        }

    }

    async getByNoteId(noteId: string): Promise<ShareType | null> 
    {
        return await this.fetch(`/one?id=${noteId}`);
    }

    async create(data: ShareType): Promise<{ insertedId: string } | null> 
    {
        return await this.fetch('/', {
            method: 'POST',
            body: data
        });
    }

    async update(noteId: string, updates: Partial<ShareType>): Promise<{ modifiedCount: number } | null> 
    {
        return await this.fetch(`?id=${noteId}`, {
            method: 'PATCH',
            body: updates
        });
    }


    async delete(noteId: string): Promise<{ deletedCount: number } | null> 
    {
        return await this.fetch(`?id=${noteId}`, {
            method: 'DELETE'
        });
    }


    async listByOwner(ownerId: string): Promise<ShareType[]> 
    {
        const res = await this.fetch(`/all?owner_id=${ownerId}`);
        return res || [];
    }

}


export default new Share();