import ShareDB from './ShareDB.js';
import ShareLayout from './ShareLayout.js';
import type { Share } from './ShareTypes.js';
import argon2 from "argon2";

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
        await this.layout.add_share_to_layout(share);
    }

    public async get(uuid: string)
    {
        return await this.db.get_share(uuid);
    }

    public async getAll()
    {
        return await this.db.get_all_shares();
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

    public async addUsersOnShare(uuid: string, users: string)
    {
        const share = await this.get(uuid);
        if (share) {
            share.visitor.push(users);
            await this.update(share);
        }
    }

    public async verifyPasswd(uuid: string, passwd: string)
    {
        const share = await this.get(uuid);
        if (share && share.params.passwd) {
            return await argon2.verify(share.params.passwd, passwd);
        }
        return false
    }

}

export default new ShareManager();