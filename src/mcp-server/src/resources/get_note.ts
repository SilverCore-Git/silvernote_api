import notes from "../../../assets/ts/notes.js";
import { Resource } from "../../MCPTypes.js";

const get_note: Resource = {

    name: "get_note",
    url: "note:///{uuid}",

    handler: async (uri: URL) => {

        const pathParts = uri.pathname.split('/').filter(Boolean);
        const uuid = pathParts[0];

        const note = await notes.getNoteByUUID(uuid);

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

export default get_note;