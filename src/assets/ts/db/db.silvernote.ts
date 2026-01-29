import nodeFetch from 'node-fetch';



async function fetch(
    path: string, 
    opt: { 
        method?: 'POST' | 'GET' | 'DELETE', 
        body?: string 
    } = { method: 'GET' }
): Promise<any> {

    try {

        const res = await nodeFetch('https://db.silvernote.fr' + path, { 
            method: opt.method || 'GET',
            body: opt.body,
            headers: {
                "Authorization": process.env.DB_API_SK_1 || "",
                "X-API-Key": process.env.DB_API_SK_2 || "",
                "Content-Type": "application/json"
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`Erreur API ${res.status} : `, errorText);
            return null;
        }

        return await res.json();

    } catch (error) {
        console.error("Erreur réseau/fetch:", error);
        return null;
    }
            
}


export {
    fetch
}