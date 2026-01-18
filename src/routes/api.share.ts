import { Router } from 'express';
import type { Note } from '../assets/ts/types.js';
import notes from '../assets/ts/notes.js';
import Share from '../assets/ts/db/share/index.js';


const router = Router();


router.get('/:uuid', async (req, res) => {

    const { uuid } = req.params;
    const passwd = req.query.passwd;
    const visitor_userid = req.cookies.user_id;

    const TheShare = await Share.get(uuid);

    if (TheShare) {

        // verify banned
        if (TheShare.banned.includes(visitor_userid)) {
            res.json({ success: false, banned: true });
            return;
        }

        // verify passwd
        if (TheShare.params.passwd && !await Share.verifyPasswd(uuid, passwd as string)) {
            res.json({ success: false, need: 'passwd' });
            return;
        }

        // add visitor
        if (!TheShare.visitor.includes(visitor_userid) && visitor_userid) Share.addUsersOnShare(uuid, visitor_userid);

        const createdTime = new Date(TheShare.created_at).getTime();
        const now = Date.now();
        const isExpired: boolean = now - createdTime > TheShare.params.age;

        if (TheShare.params.age !== -1 &&isExpired) {
            Share.delete(uuid);
            res.json({ expired: isExpired });
            return;
        }

        const note = await notes.getNoteByUUID(TheShare.note_uuid);

        res.json({ 
            success: true, 
            editable: TheShare.params.editable, 
            note: note.note, 
            user_id: TheShare.owner_id,
            visitor: TheShare.visitor
        });
        return;

    }

    else {
        res.json({ error: true, message: 'Partage non trouvée.' })
    }

})

router.get('/:uuid/info', async (req, res) => {
    
    const uuid = req.params.uuid;

    const _share = await Share.get(uuid);

    res.json({ 
        share: {
            ..._share,
            params: {}
        }
    });
    return;

})

router.post('/create', async (req, res) => {

    const { note_uuid, params } = req.body;
    const user_id = req.cookies.user_id;

    try {

        if (await Share.get(note_uuid)) {
            await Share.delete(note_uuid);
        }

        const TheShareData = {
            uuid: note_uuid,
            owner_id: user_id,
        }

        const TheShare = await Share.add({

            uuid: note_uuid,
            owner_id: user_id,
            note_uuid,

            params,

            created_at: new Date().toString(),
            expires_at: "",

            visitor: [],
            banned: [],

        })

        res.json({ success: true, share: TheShareData });
        return;

    }

    catch (err) {
        res.json({ error: true, message: err });
        return;
    }

})

router.post('/ban', async (req, res) => {

    const { uuid, banned_id } = req.body;

    try {

        const TheShare = await Share.get(uuid);

        if (TheShare) {

            TheShare.banned.push(banned_id);

            await Share.update(TheShare);

            res.json({ success: true, share: TheShare });
            return;

        }

        res.json({ success: false });
        return;

    }

    catch (err) {
        res.json({ error: true, message: err });
        return;
    }

})


router.get('/for/me', async (req, res) => {

    const { user_id } = req.cookies;

    try {

        const share_db = await Share.getAll();

        if (!share_db.length)
        {
            res.json({ length: 0, notes: null });
            return;
        }
        
        const share_for_me = share_db.filter(share =>
            share.visitor.includes(user_id) && share.owner_id !== user_id);

        if (share_for_me.length) {

            let shared_notes: Note[] = [];

            for (const share of share_for_me) {

                const note: Note | undefined = (await notes.getNoteByUUID(share.note_uuid)).note;

                if (!note) continue;
                shared_notes.push(note);

            }

            res.json({
                length: shared_notes.length,
                notes: shared_notes
            });

        }
        else {
            res.json({ length: 0, notes: null });
            return;
        }

    }
    catch (err) {
        res.status(500).json({ error: true, message: (err as any).message });
        console.error('Error on /db/share/for/me : ', err)
        return;
    }

})


router.get('/by/me', async (req, res) => {

    const user_id = req.cookies.user_id || req.signedCookies.user_id;

    try {

        const share_db = await Share.getAll();
        
        const my_share = share_db.filter(share => share.owner_id == user_id);

        let _notes: (Note)[] = [];

        for (const share of my_share)
        {
            const __note = await notes.getNoteByUUID(share.note_uuid);
            if (!__note.note) continue;
            _notes.push(__note.note);
        }

        res.json({
            length: my_share.length,
            share: my_share,
            notes: _notes
        });

    }
    catch (err) {
        res.json({ error: true, message: err });
        return;
    }

})




export default router;