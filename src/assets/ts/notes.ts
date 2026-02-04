import nodeFetch from 'node-fetch';
import type { Note } from "./types.js";
import { randomUUID } from "crypto";
import 'dotenv/config';
import { decrypt, encrypt } from './utils/scrypto/scrypto.js';

    class Notes {

        constructor() {
            this.ping().then(a => a ? console.log('Ping db succesfuly.') : console.error('Error on ping db.'))
        }

        private ping(): Promise<boolean> {
            return nodeFetch('https://db.silvernote.fr/ping', {
                headers: {
                    "Authorization": process.env.DB_API_SK_1 || "",
                    "X-API-Key": process.env.DB_API_SK_2 || ""
                },
            }).then(res => {
                if (res) return true;
                return false;
            });
        }  

        private async fetch(
            path: string, 
            opt: { 
                method?: 'POST' | 'GET' | 'DELETE', 
                body?: string 
            } = { method: 'GET' }
        ): Promise<any> {

            try {

                const res = await nodeFetch('https://db.silvernote.fr/notes' + path, { 
                    method: opt.method || 'GET',
                    body: opt.body,
                    headers: {
                        "Authorization": process.env.DB_API_SK_1 || "",
                        "X-API-Key": process.env.DB_API_SK_2 || "",
                        "Content-Type": "application/json"
                    },
                });

                if (!res.ok) {
                    const errorText = await res.text();
                    console.error(`Erreur API ${res.status} : `, errorText);
                    return null;
                }

                return await res.json();

            } catch (error) {
                console.error("Erreur réseau/fetch:", error);
                return null;
            }
            
        }

        public async createNote(note: Note) {

            if (!note.user_id) return { error: true, message: "user_id requis" };
            note.uuid = note.uuid || randomUUID();
            note.created_at = Date.now();

            const noteToStore = { ...note };
            if (noteToStore.content)
            {
                noteToStore.content = encrypt(noteToStore.content);
                noteToStore.content_type = "text/html/crypted";
            }
            
            const res = await this.fetch('/push', {
                method: 'POST',
                body: JSON.stringify({ note: noteToStore })
            })

            return { success: res?._id ? true : false, note };
            
        }


        public async getNoteByUUID(uuid: string) {

            const res: Note[] = await this.fetch(`/get/${uuid}`);

            const note: Note = res[0];

            if (note && note.uuid) 
            {

                if (note.content_type === "text/html/crypted" && note.content)
                {

                    if (note.content && note.content.includes(':'))
                    {

                        try {
                            note.content = decrypt(note.content);
                            return { success: true, note };
                        }
                        catch (e) {
                            console.error("Error on decrypting note : ", note.uuid);
                            return { success: false, error: true, message: "Error on decrypting note" };
                        }

                    }

                }
                else
                {
                    return { success: true, note };
                }

            }
            else
            {
                return { error: true, message: "Note introuvable" };
            }

            return { error: true, message: "Note introuvable" };

        }

        public async getNoteByUserId(user_id: string) {

            const notes: Note[] = await this.fetch(`/get/byuserid/${user_id}`);
            const decryptedNotes: Note[] = [];

            for (const note of notes)
            {

                if (note.content_type === "text/html/crypted" && note.content)
                {

                    try {
                        note.content = decrypt(note.content);
                        decryptedNotes.push(note);
                    } catch (e) {
                        console.error("Error on decrypting note : ", note.uuid);
                    }

                }
                else
                {
                    decryptedNotes.push(note);
                }

            }

            return { success: true, notes: decryptedNotes };

        }

        public async updateNote(note: Note) {

            if (!note.uuid || !note.user_id) {
                return { error: true, message: "uuid et user_id requis" };
            }

            const noteToStore = { ...note };
            if (noteToStore.content)
            {
                noteToStore.content = encrypt(noteToStore.content);
                noteToStore.content_type = "text/html/crypted";
            }
            
            const res = await this.fetch('/update', {
                method: "POST",
                body: JSON.stringify({ note: noteToStore })
            });

            if (res.error) {
                return { error: true, message: "erreur", res };
            }

            if (res.uuid) {
                return { success: true, note: note };
            }
            
            return { error: true, message: "réponse inattendue", res };
        }

        public async clearUserNotes(user_id: string) {
            await this.fetch('/delete/byuserid/' + user_id, {
                method: 'DELETE'
            })
            return { success: true };
        }

        public async deleteNoteByUUID(user_id: string, uuid: string) {
            
            const res = await this.fetch('/delete/' + uuid, {
                method: "DELETE"
            })

            if (res.success) return { success: true };
            return { error: true, message: "Note introuvable" };
        }


    }

    export default new Notes();
