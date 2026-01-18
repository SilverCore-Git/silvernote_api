import notes from "../../../assets/ts/notes.js";
import { Resource } from "../../MCPTypes.js";

const get_user_note: Resource = {

    name: "get_user_note",
    url: "notes:///{user_id}",

    handler: async (uri: URL) => {

        const pathParts = uri.pathname.split('/').filter(Boolean);
        const user_id = pathParts[0];

        const note = await notes.getNoteByUserId(user_id);

        return {
            contents: [
                {
                uri: uri.href,
                mimeType: "application/json",
                text: JSON.stringify(note, null, 2),
                },
            ],
        };

    }

}

export default get_user_note;