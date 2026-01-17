import useWS from "../utils/useWS.js";

export default async function edit_note_title 
(parms: { uuid: string, title: string })
{

    const { socket } = useWS();

    socket.emit('title-update', parms.title);

    return {
        message: "Titre de la note mis a jours."
    }
}