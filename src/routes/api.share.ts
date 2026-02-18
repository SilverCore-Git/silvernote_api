import { Router } from 'express';
import type { Note } from '../assets/ts/types.js';
import notes from '../assets/ts/notes.js';
import Share from '../assets/ts/db/share/index.js';
import { getAuth } from '@clerk/express';


const router = Router();


router.get('/:uuid', async (req, res) => {

    const { uuid } = req.params;
    const passwd = req.query.passwd;
    const visitor_userid = getAuth(req).userId;
    if (!visitor_userid) return;

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

        if (TheShare.params.age !== -1 && isExpired) {
            Share.delete(uuid);
            res.json({ expired: isExpired });
            return;
        }

        const note = await notes.getNoteByUUID(TheShare.note_uuid, TheShare.owner_id);

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

    if (!_share) {
        res.json({ success: false, error: true, message: 'Partage non trouvée.' });
        return;
    }

    res.json({
        success: true,
        share: {
            ..._share,
            params: {
                ..._share.params,
                passwd: _share.params.passwd ? true : false
            }
        }
    });
    return;

})

router.post('/create', async (req, res) => {

    const { note_uuid, params } = req.body;
    const user_id = getAuth(req).userId;

    try {

        if (!user_id || !note_uuid || !params)
        {
            res.json({ error: true, message: 'Missing parameters.' });
            return;
        }

        if (await Share.get(note_uuid)) {
            await Share.delete(note_uuid);
        }

        const TheShareData = {
            uuid: note_uuid,
            owner_id: user_id,
        }

        await Share.add({

            uuid: note_uuid,
            owner_id: user_id,
            note_uuid,

            params,

            created_at: new Date().toISOString(),
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

router.post('/:uuid/ban', async (req, res) => {

    const { banned_id } = req.body;
    const uuid = req.params.uuid;

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


router.post('/:uuid/update', async (req, res) => {

    const { share } = req.body;
    const uuid = req.params.uuid;


    try {

        const TheShare = await Share.get(uuid);

        if (TheShare) {

            const updatedShare = { ...TheShare, ...share, params: { passwd: TheShare.params.passwd, ...share.params } };

            await Share.update(updatedShare!);

            res.json({ success: true, share: updatedShare });
            return;

        }

        res.json({ success: false });
        return;

    }

    catch (err) {
        res.status(500).json({ error: true, message: err });
        return;
    }

})

router.post('/:uuid/delete', async (req, res) => {

    const uuid = req.params.uuid;

    try {

        await Share.delete(uuid);

        res.json({ success: true });

    }
    catch (err) {
        res.status(500).json({ error: true, message: err });
        return;
    }

})


router.get('/for/me', async (req, res) => {

    const auth = getAuth(req);
    const user_id = auth.userId;

    if (!user_id) {
        res.status(401).json({ error: true, message: "Unauthorized" });
        return;
    }

    try {


        const share_db = await Share.getAll();
        
        const share_for_me = share_db.filter(share => 
            share.visitor.includes(user_id) && share.owner_id !== user_id
        );

        if (share_for_me.length === 0) {
            res.json({ length: 0, notes: [] });
            return;
        }

        const notePromises = share_for_me.map(async (share) => {
            try {
                const result = await notes.getNoteByUUID(share.note_uuid, share.owner_id);
                return result.note;
            } catch (err) {
                console.warn(`Could not fetch note ${share.note_uuid}:`, err);
                return null;
            }
        });

        const results = await Promise.all(notePromises);

        const shared_notes = results.filter((note): note is Note => note !== null && note !== undefined);

        res.json({
            length: shared_notes.length,
            notes: shared_notes
        });

    } 
    catch (err) {
        console.error('Error on /db/share/for/me:', err);
        res.status(500).json({ 
            error: true, 
            message: err instanceof Error ? err.message : "Internal Server Error" 
        });
    }

});


router.get('/by/me', async (req, res) => {

    const user_id = getAuth(req).userId;
    if (!user_id) return;

    try {

        const share_db = await Share.getAll();
        
        const my_share = share_db.filter(share => share.owner_id == user_id);

        let _notes: (Note)[] = [];

        for (const share of my_share)
        {
            const __note = await notes.getNoteByUUID(share.note_uuid, user_id);
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