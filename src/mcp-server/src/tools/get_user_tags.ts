import tags from "../../../assets/ts/tags.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const get_user_tags: Tool = {

    name: "get_user_tags",
    description: "Get user tags by user id",

    params: {
        userID: z.string().describe('user id'),
        start: z.number().describe('start index'),
        end: z.number().describe('end index')
    },

    handler: async (parms) => {

        const tag = (await tags.getTagsByUserId(parms.userID)).tags;
        const slicedTags = tag.slice(parms.start, parms.end);
        
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(slicedTags, null, 2),
                },
            ],
        };

    }

}


export default get_user_tags;