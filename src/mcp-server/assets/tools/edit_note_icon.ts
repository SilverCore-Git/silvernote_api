import useWS from "../useWS";

export default async function edit_note_title 
(parms: { uuid: string, icon: string })
{

    const ws = new useWS();

    await ws.command(
        {
            command: 'set-icon',
            room: parms.uuid
        },
        {
            newIcon: parms.icon
        }
    )

    return {
        message: "Icon de la note mis a jours."
    }
}