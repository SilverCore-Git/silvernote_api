import axios from "axios";
import path from "path";
import fs from "fs";

const uploadDir: string = path.join('../../temp');

export default async function
(uuid: string): Promise<string>
{
        
    try {

        const url = `https://db.silvernote.fr/file/see/${uuid}`;

        const response = await axios.get(url, { 
            responseType: 'arraybuffer',
            headers: {
                "Authorization": process.env.DB_API_SK_1 || "",
                "X-API-Key": process.env.DB_API_SK_2 || "",
            }
        });

        const disposition = response.headers['content-disposition'];
        let fileName = uuid
        if (disposition && disposition.includes('filename=')) {
            fileName = disposition.split('filename=')[1].replace(/"/g, '');
        }

        const filePath: string = path.join(uploadDir, fileName);

        fs.writeFileSync(filePath, response.data);

        return filePath;
    } catch (err: any) {
        console.error('Erreur téléchargement :', err.message);
        return '';
    }

}