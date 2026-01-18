import tags from "../../../assets/ts/tags.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const get_user_tags_length: Tool = {

    name: "get_user_tags_length",
    description: "Get user tags length by user id",

    params: {
        userID: z.string()
    },

    handler: async (parms) => {

        const alltags = (await tags.getTagsByUserId(parms.userID)).tags;

        return {
            content: [
                {
                    type: "text",
                    text: alltags.length.toString(),
                },
            ],
        };

    }
    
}


export default get_user_tags_length;