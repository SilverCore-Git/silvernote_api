import nodeFetch from 'node-fetch';
import type { Tag } from "./types.js";
import { randomUUID } from "crypto";

    class Tags {

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
            const res = await nodeFetch('https://db.silvernote.fr/tags' + path, { 
                ...opt,
                headers: {
                    "Authorization": process.env.DB_API_SK_1 || "",
                    "X-API-Key": process.env.DB_API_SK_2 || "",
                    "Content-Type": "application/json"
                },
            }).then(res => res.json());
            //console.log('/tags' + path + ' :\n' + JSON.stringify(res));
            return res;
        }

        public async createTag(tag: Tag) {

            if (!tag.user_id) return { error: true, message: "user_id requis" };
            tag.uuid = tag.uuid || randomUUID();
            tag._id = tag.uuid || randomUUID();
            tag.created_at = tag.created_at || Date.now();
            
            const res = await this.fetch('/push', {
                method: 'POST',
                body: JSON.stringify({ tag })
            })

            return { success: res._id ? true : false, tag };
            
        }


        public async getTagByUUID(uuid: string) {

            const res: Tag[] = await this.fetch(`/get/${uuid}`);

            const tag: Tag = res[0];

            if (tag && tag.uuid) 
            {
                return { success: true, tag };
            }
            else return { error: true, message: "Tag introuvable" };

        }

        public async getTagsByUserId(user_id: string) {

            const tags: Tag[] = await this.fetch(`/get/byuserid/${user_id}`);

            return { success: true, tags };

        }

        public async updateTag(tag: Tag) {

            if (!tag.uuid || !tag.user_id) {
                return { error: true, message: "uuid et user_id requis" };
            }
            
            const res = await this.fetch('/update', {
                method: "POST",
                body: JSON.stringify({ tag })
            });

            if (res.error) {
                return { error: true, message: "erreur", res };
            }

            if (res.uuid) {
                return { success: true, tag };
            }
            
            return { error: true, message: "réponse inattendue", res };
        }

        public async clearUserTags(user_id: string) {
            await this.fetch('/delete/byuserid/' + user_id, {
                method: 'DELETE'
            })
            return { success: true };
        }

        public async deleteTagByUUID(user_id: string, uuid: string) {
            
            const res = await this.fetch('/delete/' + uuid, {
                method: "DELETE"
            })

            if (res.success) return { success: true };
            return { error: true, message: "Tag introuvable" };
        }


    }

    export default new Tags();
