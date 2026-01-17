import useWS from "../utils/useWS.js";

export default async function edit_note_title 
(parms: { uuid: string, icon: string })
{

    const { socket } = useWS();

    socket.emit('icon-update', parms.icon);

    return {
        message: "Icon de la note mis a jours."
    }
}