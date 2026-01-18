import tags from "../../../assets/ts/tags.js";
import { Tool } from "../../MCPTypes.js";
import { z } from "zod";


const get_tag: Tool = {

    name: "get_tag",
    description: "Get tag by UUID",

    params: {
        uuid: z.string().describe('tag uuid')
    },

    handler: async (parms) => {

        const tag = (await tags.getTagByUUID(parms.uuid)).tag;
        
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


export default get_tag;