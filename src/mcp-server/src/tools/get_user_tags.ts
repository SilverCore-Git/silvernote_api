import tags from "../../../assets/ts/tags.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const get_user_tags: Tool = {

    name: "get_user_tags",
    description: "Get user tags by user id",

    params: {
        userID: z.string().describe('user id')
    },

    handler: async (parms) => {

        const tag = (await tags.getTagsByUserId(parms.userID)).tags;
        
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(tag, null, 2),
                },
            ],
        };

    }

}


export default get_user_tags;