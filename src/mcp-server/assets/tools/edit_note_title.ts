import useWS from "../useWS";

export default async function edit_note_title 
(parms: { uuid: string, title: string })
{

    const ws = new useWS();

    await ws.command(
        {
            command: 'set-title',
            room: parms.uuid
        },
        {
            newTitle: parms.title
        }
    )

    return {
        message: "Titre de la note mis a jours."
    }
}