import express, { Request, Response } from "express";

import note_db from "../assets/ts/notes.js";
import tag_db from "../assets/ts/tags.js";
import utils from "../assets/ts/utils.js";
import { Note, Tag } from "../assets/ts/types.js";

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



// for notes
router.post('/new/note', async (req: Request, res: Response) => {
    const note = req.body.note;
    note.user_id = req.cookies.user_id;
    res.json(await note_db.createNote(note));
});

router.get('/get/a/note', async (req: Request, res: Response) => {
    res.json(await note_db.getNoteByUUID(req.query.uuid as string));
});

router.post('/update/a/note', async (req: Request, res: Response) => {
    const note = req.body.note;
    note.user_id = req.cookies.user_id;
    res.json(await note_db.updateNote(note));
});

router.post('/delete/a/note', async (req: Request, res: Response) => {
    res.json(await note_db.deleteNoteByUUID(req.cookies.user_id, req.query.uuid as string));
});

router.get('/get/user/notes', async (req: Request, res: Response) => {
    const db_res = await note_db.getNoteByUserId(req.query.user_id as string);
    res.json({
        ...db_res,
        notes: db_res.notes.filter(note => note.title !== '' && note.content !== '')
    });
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



export default router;
