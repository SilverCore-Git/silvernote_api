import useWS from "../utils/useWS.js";

export default async function edit_note_content
(parms: { uuid: string, content: string, pos: number })
{

    const { socket } = useWS();

    socket.emit('ai-command', {
        command: 'insertContent',
        content: parms.content,
        pos: parms.pos
    })

    return {
        message: "Contenu de la note mis a jours."
    }

}
