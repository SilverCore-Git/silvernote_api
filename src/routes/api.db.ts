import express, { type Request, type Response } from "express";

import note_db from "../assets/ts/notes.js";
import tag_db from "../assets/ts/tags.js";
import utils from "../assets/ts/utils.js";
import { Note, Tag } from "../assets/ts/types.js";
import multer from 'multer';
import path from "path";
import fs from 'fs';
import axios from 'axios';
import FormData from "form-data";
import downloadFile from "../assets/ts/downloadFile.js";
import { fileURLToPath } from "url";
import { getUserFingerprint } from "../assets/ts/utils/scrypto/scrypto.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();



router.post('/verify/data', async (req: Request, res: Response) => {

    try {

        const { notes, tags } = req.body as { notes: string; tags: string }; // hash of notes and tags
        const user_id: string | undefined = req.cookies?.user_id;

        if (!notes || !tags || !user_id) {
            res.json({ error: true, message: 'Missing parameters.' });
            return;
        }

        const db_notes: Note[] = (await note_db.getNoteByUserId(user_id)).notes.filter(note => note.title !== '' && note.content !== '');
        const db_tags: Tag[] = (await tag_db.getTagsByUserId(user_id)).tags;

        const db_notes_hash: string = await utils.hash(db_notes);
        const db_tags_hash: string = await utils.hash(db_tags);

        const notesMatch = notes === db_notes_hash;
        const tagsMatch = tags === db_tags_hash;

        res.json({
            ok: notesMatch && tagsMatch,
            notes: notesMatch,
            notes_length: db_notes.length,
            tags: tagsMatch,
            tags_length: db_tags.length,
        });
        return;

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: true, message: 'Internal server error.' });
    }

});


router.get('/get/scrypto/fingerprint', async (req: Request, res: Response) => {

    const userId = req.cookies.user_id;
    if (!userId) {
        res.status(400).json({ error: true, message: 'user_id cookie is required.' });
        return;
    }

    const fingerprint = getUserFingerprint(userId);

    res.json({ fingerprint });

});



// for notes
router.post('/new/note', async (req: Request, res: Response) => {
    const note = req.body.note;
    note.user_id = req.cookies.user_id;
    res.json(await note_db.createNote(note));
});

router.get('/get/a/note', async (req: Request, res: Response) => {
    res.json(await note_db.getNoteByUUID(req.query.uuid as string, req.cookies.user_id));
});

router.post('/update/a/note', async (req: Request, res: Response) => {
    const note = req.body.note;
    note.user_id = req.cookies.user_id;
    res.json(await note_db.updateNote(note));
});

router.post('/delete/a/note', async (req: Request, res: Response) => {
    res.json(await note_db.deleteNoteByUUID(req.cookies.user_id, req.query.uuid as string));
});

router.get('/notes/start/:start/end/:end', async (req: Request, res: Response) => {

    const userId = String(req.cookies.userId);
    const start = Number(req.params.start);
    const end = Number(req.params.end);

    const db_res = await note_db.getNoteByUserIdIndex(userId, start, end);

    res.json({
        ...db_res,
        notes: db_res.notes.filter(note => note.title !== '' || note.content !== '')
    });

    // identify gost notes
    const ghostNotes: Note[] = db_res.notes.filter(note => 
        note.title === '' && note.content === ''
        || note.title === '' && note.content === '<p></p>'
    );

    if (ghostNotes.length > 0) {
        await Promise.all(ghostNotes.map(note => note_db.deleteNoteByUUID(userId, note.uuid || '')));
    }

});

router.post('/delete/notes', async (req: Request, res: Response) => {
    res.json(await note_db.clearUserNotes(req.cookies.user_id));
});



// for tags
router.post('/new/tag', async (req: Request, res: Response) => {
    const tag = req.body.tag;
    tag.user_id = req.cookies.user_id;
    res.json(await tag_db.createTag(tag));
});

router.post('/update/a/tag', async (req: Request, res: Response) => {
    const tag = req.body.tag;
    tag.user_id = req.cookies.user_id;
    res.json(await tag_db.updateTag(tag));
});

router.post('/delete/a/tag', async (req: Request, res: Response) => {
    res.json(await tag_db.deleteTagByUUID(req.cookies.user_id, String(req.query.uuid)));
});

router.get('/get/user/tags', async (req: Request, res: Response) => {
    res.json(await tag_db.getTagsByUserId(req.query.user_id as string));
});

router.post('/delete/tags', async (req: Request, res: Response) => {
    res.json(await tag_db.clearUserTags(req.cookies.user_id));
});



const uploadDir = path.join(__dirname, "../temp");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
    destination: (req: Request, file: any, cb: any) => {
        cb(null, uploadDir);
    },
    filename: (req: Request, file: any, cb: any) => {
        cb(null, file.originalname);
    }
});

const upload = multer({ 
    storage,
    limits: {
        fileSize: 1 * 1024 * 1024 * 1024 // 16 Go
    }
});


router.post('/image/upload', upload.single('file'), async (req: Request, res: Response) => {
    if (!req.file) {
        res.json({ error: true, message: 'File not found' });
        return;
    }

    const file = req.file;
    const fileStream = fs.createReadStream(file.path);

    const formData = new FormData();
    formData.append("file", fileStream, {
        filename: file.originalname,
        contentType: file.mimetype,
    });

    try {
        const _res = await axios.post("https://db.silvernote.fr/file/upload", formData, {
            headers: {
                ...formData.getHeaders(),
                "Authorization": process.env.DB_API_SK_1 || "",
                "X-API-Key": process.env.DB_API_SK_2 || "",
            },
            maxBodyLength: Infinity,
        });

        res.json({
            ..._res.data,
            url: 'http://localhost:3000/api/db/image/get/' + _res.data.file.UUID
        });
    } catch (err: any) {
        res.status(500).json({
            error: true,
            message: err.message || err
        });
    }
});



router.get('/image/get/:name', async (req, res) => {

    const baseName = req.params.name;

    const files = fs.readdirSync(uploadDir);

    const match = files.find(f => f.startsWith(baseName + "."));

    if (match) 
    {
        const filePath = path.join(uploadDir, match);
        res.sendFile(filePath);
        return;
    }
    
    await downloadFile(baseName).then(filePath => {
        res.sendFile(filePath);
    })

});


export default router;
