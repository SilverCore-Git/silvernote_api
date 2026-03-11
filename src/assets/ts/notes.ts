import nodeFetch from 'node-fetch';
import type { Note } from "./types.js";
import { randomUUID } from "crypto";
import { dbAgent } from './db/userDB.js';
import 'dotenv/config';
import { decrypt, decryptBuffer, encrypt, encryptBuffer } from './utils/scrypto/scrypto.js';

const CRYPTED_PATTERN = /^[a-f0-9]{24}:[a-f0-9]{32}:[a-f0-9]+$/i;

function looksEncrypted(content?: string): boolean {
    if (!content) return false;
    return CRYPTED_PATTERN.test(content.trim());
}

class Notes {

    constructor() {
        this.ping()
            .then(ok => console.log(ok ? 'Ping db successfully.' : 'Error ping db.'));
    }


    private async ping(): Promise<boolean> {
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
        opt: { method?: 'POST' | 'GET' | 'DELETE', body?: string } = { method: 'GET' }
    ): Promise<any> {

        try {
            const res = await nodeFetch(
                'https://db.silvernote.fr/v2/notes' + path,
                {
                    method: opt.method || 'GET',
                    body: opt.body,
                    agent: dbAgent,
                    headers: {
                        "Authorization": process.env.DB_API_SK_1 || "",
                        "X-API-Key": process.env.DB_API_SK_2 || "",
                        "Content-Type": "application/json"
                    }
                }
            );

            if (!res.ok) {
                console.error(`API ${res.status}:`, await res.text());
                return null;
            }

            return await res.json();
        } catch (err) {
            console.error("Network error:", err);
            return null;
        }
    }

    private fullyDecryptContent(content: string, userId: string): string {
        let current = content;

        while (looksEncrypted(current)) 
        {
            try {
                current = decrypt(current, userId);
            } catch (e) {
                console.error("Decrypt failed");
                break;
            }
        }

        return current;
    }

    private fullyDecryptNote(note: Note): Note 
    {

        if (!note?.content) return note;

        if (note.content_type == 'ydoc') 
        {

            if (looksEncrypted(note.content)) {
                note.ydoc_content = decryptBuffer(note.content, note.user_id);
            }

            note.icon = decrypt(note.icon || '', note.user_id);
            note.title = decrypt(note.title, note.user_id);

        }
        else if (looksEncrypted(note.content)) 
        {
            const decrypted = this.fullyDecryptContent(note.content, note.user_id);
            return {
                ...note,
                content: decrypted,
                content_type: "text/html"
            };
        }

        return note;

    }


    public async createNote(note: Note) {

        if (!note.user_id) {
            return { error: true, message: "user_id requis" };
        }

        note.uuid = note.uuid || randomUUID();
        note.created_at = Date.now();

        const noteToStore = { ...note };

        if (noteToStore.content_type == 'ydoc')
        {

            noteToStore.content = encryptBuffer(noteToStore?.ydoc_content as Buffer || Buffer.from(''), note.user_id);
            noteToStore.ydoc_content = Buffer.from('');
            noteToStore.content_type = "ydoc";

            noteToStore.title = encrypt(noteToStore.title || '', note.user_id);
            noteToStore.icon = encrypt(noteToStore.icon || '', note.user_id);

        }
        else if (noteToStore.content) 
        {
            noteToStore.content = encrypt(noteToStore.content, note.user_id);
            noteToStore.content_type = "text/html/crypted";
        }

        const res = await this.fetch('/push', {
            method: 'POST',
            body: JSON.stringify({ note: noteToStore })
        });

        return { success: !!res?._id, note };
    }


    public async getNoteByUUID(uuid: string, userId: string) {

        const res = await this.fetch(`/user/${userId}/id/${uuid}`);
        if (!res?.notes?.length) {
            return { error: true, message: "Note introuvable" };
        }

        const note = this.fullyDecryptNote(res.notes[0]);
        return { success: true, note };
    }

    public async getNoteByUUIDNoUserID(uuid: string) {

        const res = await this.fetch(`/user/justID/id/${uuid}`);
        if (!res?.notes?.length) {
            return { error: true, note: undefined, message: "Note introuvable" };
        }

        const note = this.fullyDecryptNote(res.notes[0]);
        return { success: true, note };
    }

    public async getNoteByUserId(user_id: string) {

        const res = await this.fetch(`/user/${user_id}`);
        if (!res?.notes) {
            return { success: true, notes: [] };
        }

        const notes = res.notes.map((n: Note) => this.fullyDecryptNote(n));
        return { success: true, notes };
    }

    public async getNoteByUserIdIndex(
        user_id: string,
        start: number,
        end: number,
        noPinned?: '1' | '0'
    ) {

        const res = await this.fetch(
            `/user/${user_id}/index/start/${start}/end/${end}?noPinned=${noPinned}`
        );

        if (!res?.notes) {
            return { success: true, notes: [] };
        }

        const notes = res.notes.map((n: Note) => this.fullyDecryptNote(n));

        return { ...res, success: true, notes };
    }

    public async getPinnedNotesByUserID(user_id: string) {

        const res = await this.fetch(`/user/${user_id}/pinned`);
        if (!res?.notes) {
            return { success: true, notes: [] };
        }

        const notes = res.notes.map((n: Note) => this.fullyDecryptNote(n));
        return { success: true, notes };
    }


    public async updateNote(note: Note) 
    {

        if (!note.uuid || !note.user_id) {
            return { error: true, message: "uuid et user_id requis" };
        }

        const noteToStore = { ...note };

        if (noteToStore.content_type == 'ydoc')
        {

            noteToStore.content = encryptBuffer(noteToStore.ydoc_content as Buffer, note.user_id);
            noteToStore.ydoc_content = Buffer.from('');
            noteToStore.content_type = "ydoc"

            noteToStore.title = encrypt(noteToStore.title, note.user_id);
            noteToStore.icon = encrypt(noteToStore.icon || '', note.user_id);

        }
        else
        {

            if (noteToStore.content) 
            {
                noteToStore.content = encrypt(noteToStore.content, note.user_id);
                noteToStore.content_type = "text/html/crypted";
            }

        }

        const res = await this.fetch('/update', {
            method: "POST",
            body: JSON.stringify({ note: noteToStore })
        });

        if (!res || res.error) {
            return { error: true, message: "Erreur API" };
        }

        if (res.uuid) {
            return { success: true, ...res };
        }

        return { error: true, message: "Réponse inattendue" };

    }

    public async clearUserNotes(user_id: string) {
        await this.fetch('/delete/user/' + user_id, { method: 'DELETE' });
        return { success: true };
    }

    public async deleteNoteByUUID(user_id: string, uuid: string) {

        const res = await this.fetch(`/delete/user/${user_id}/id/${uuid}`, {
            method: "DELETE"
        });

        if (res?.success) return { success: true };
        return { error: true, message: "Note introuvable" };
    }

}

export default new Notes();
