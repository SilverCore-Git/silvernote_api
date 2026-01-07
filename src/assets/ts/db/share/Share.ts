import ShareDB from './ShareDB.js';
import ShareLayout from './ShareLayout.js';
import type { Share } from './ShareTypes.js';

class ShareManager
{

    private db: typeof ShareDB;
    private layout: typeof ShareLayout;

    constructor()
    {
        this.db = ShareDB;
        this.layout = ShareLayout;
    }

    public async add(share: Share)
    {
        await this.db.create_share(share);
        await this.layout.add_share_to_layout({
            uuid: share.uuid,
            owner_id: share.owner_id,
            created_at: share.created_at,
            expires_at: share.expires_at
        });
    }

    public async get(uuid: string)
    {
        return await this.db.get_share(uuid);
    }

    public async delete(uuid: string)
    {
        await this.db.delete_share(uuid);
        await this.layout.remove_share_from_layout(uuid);
    }

    public async update(share: Share)
    {
        await this.db.update_share(share);
    }

    public async addUsersOnShare(uuid: string, users: string[])
    {
        const share = await this.get(uuid);
        if (share) {
            share.visitor.push(...users);
            await this.update(share);
        }
    }

}

export default new ShareManager();