import useWS from "../useWS";

export default async function edit_note_content
(parms: { uuid: string, content: string, line: number })
{
    const ws = new useWS();

    await ws.command(
        {
            command: 'set-icon',
            room: parms.uuid
        },
        parms
    )

    return {
        message: "Contenu de la note mis a jours."
    }
}
