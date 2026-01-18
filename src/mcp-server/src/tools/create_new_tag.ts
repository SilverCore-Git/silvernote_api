import { randomUUID } from "crypto";
import type { Tag } from "../../../assets/ts/types.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";
import tags from "../../../assets/ts/tags.js";


const create_new_tag: Tool = {

    name: "create_new_tag",
    description: "Create a tag with user id, name and color",

    params: {
        user_id: z.string().describe('user id'),
        name: z.string().describe('Tag name'),
        color: z.string().describe('Tag color on hex format (ex: #000000)')
    },

    handler: async (parms) => {

        const tag: Tag = {
            uuid: randomUUID(),
            user_id: parms.user_id,
            name: parms.name,
            color: parms.color,
            id: parseInt(Date.now() + Math.floor(Math.random() * 1000).toString()),
            active: false
        }

        const res = await tags.createTag(tag);

        return {
            content: [
                {
                    type: "text",
                    text: res.success ? 'Tag créée avec succès.' : 'Erreur lors de la création du tag.'
                },
                res.tag ? 
                {
                    type: "text",
                    text: JSON.stringify(res.tag, null, 2),
                }
                : null,
            ],
        };

    }

}


export default create_new_tag;