import tags from "../../../assets/ts/tags.js";
import { Resource } from "../../MCPTypes.js";

const get_tag: Resource = {

    name: "get_tag",
    url: "tag:///{uuid}",

    handler: async (uri: URL) => {

        const pathParts = uri.pathname.split('/').filter(Boolean);
        const uuid = pathParts[0];

        const tag = await tags.getTagByUUID(uuid);

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

export default get_tag;