import useWS from "../useWS.js";

export default async function edit_note_content
(parms: { uuid: string, content: string, pos: number })
{
    const ws = new useWS();

    await ws.command(
        {
            command: 'insert-content',
            room: parms.uuid
        },
        {
            ...parms,
            replace: false
        }
    )

    return {
        message: "Contenu de la note mis a jours."
    }
}
