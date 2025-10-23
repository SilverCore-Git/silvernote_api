import nodeFetch from 'node-fetch';
import type { Note } from "./types";
import { randomUUID } from "crypto";

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

        private async fetch (
            path: string, 
            opt
                : { 
                    method?: 'POST' | 'GET' | 'DELETE', 
                    body?: string 
                } 
                = {
                    method: 'GET'
                }
        ): Promise<any>
        {
            const res = await nodeFetch('https://db.silvernote.fr/notes' + path, { 
                ...opt,
                headers: {
                    "Authorization": process.env.DB_API_SK_1 || "",
                    "X-API-Key": process.env.DB_API_SK_2 || "",
                    "Content-Type": "application/json"
                },
            }).then(res => res.json());
            console.log('/notes' + path + ' :\n' + JSON.stringify(res));
            return res;
        }

        public async createNote(note: Note) {

            if (!note.user_id) return { error: true, message: "user_id requis" };
            note.uuid = note.uuid || randomUUID();
            note.created_at = note.created_at || Date.now();
            
            const res = await this.fetch('/push', {
                method: 'POST',
                body: JSON.stringify({ note })
            })

            return { success: res._id ? true : false, note };
            
        }


        public async getNoteByUUID(uuid: string) {

            const res: Note[] = await this.fetch(`/get/${uuid}`);

            const note: Note = res[0];

            if (note && note.uuid) 
            {
                return { success: true, note };
            }
            else return { error: true, message: "Note introuvable" };

        }

        public async getNoteByUserId(user_id: string) {

            const notes: Note[] = await this.fetch(`/get/byuserid/${user_id}`);

            return { success: true, notes };

        }

        public async updateNote(note: Note) {

            if (!note.uuid || !note.user_id) {
                return { error: true, message: "uuid et user_id requis" };
            }
            
            const res = await this.fetch('/update', {
                method: "POST",
                body: JSON.stringify({ note })
            });

            if (res.error) {
                return { error: true, message: "erreur", res };
            }

            if (res.uuid) {
                return { success: true, note };
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
