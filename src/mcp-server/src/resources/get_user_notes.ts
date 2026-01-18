import tags from "../../../assets/ts/tags.js";
import { Resource } from "../../MCPTypes.js";

const get_user_tag: Resource = {

    name: "get_user_tag",
    url: "tags:///{user_id}",

    handler: async (uri: URL) => {

        const pathParts = uri.pathname.split('/').filter(Boolean);
        const user_id = pathParts[0];

        const tag = await tags.getTagsByUserId(user_id);

        return {
            contents: [
                {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(tag, null, 2),
                },
            ],
        };

    }

}

export default get_user_tag;