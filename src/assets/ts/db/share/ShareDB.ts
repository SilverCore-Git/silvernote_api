import fs from 'fs';
const fsp = fs.promises;
import argon2 from "argon2";

import { share_db_dir_path } from './const.js';
import type { Share } from './ShareTypes.js';

class ShareDB
{

    private share_db_dir_path: string;

    constructor()
    {
        this.share_db_dir_path = share_db_dir_path;
        this.init();
    }

    private async init()
    {
        if (!fs.existsSync(this.share_db_dir_path)) {
            await fsp.mkdir(this.share_db_dir_path, { recursive: true });
        }
    }

    private get_share_path(uuid: string): string
    {
        return `${this.share_db_dir_path}/${uuid}.json`;
    }

    public async create_share(share: Share): Promise<void>
    {
        await this.init();
        const share_path = this.get_share_path(share.uuid);
        const _share = {
            ...share,
            params: {
                ...share.params,
                created_at: new Date().toISOString(),
                passwd: share.params.passwd 
                    ? await argon2.hash(share.params.passwd)
                    : undefined
            }
        }
        await fsp.writeFile(share_path, JSON.stringify(_share, null, 2), 'utf-8');
    }

    public async get_all_shares(): Promise<Share[]>
    {
        await this.init();
        const files = await fsp.readdir(this.share_db_dir_path);
        const shares: Share[] = [];
        for (const file of files) {
            if (file == 'layout.json') continue;
            const share_path = `${this.share_db_dir_path}/${file}`;
            const data = await fsp.readFile(share_path, 'utf-8');
            shares.push(JSON.parse(data));
        }
        return shares;
    }

    public async get_share(uuid: string): Promise<Share | undefined>
    {
        await this.init();
        const share_path = this.get_share_path(uuid);
        if (fs.existsSync(share_path)) {
            const data = await fsp.readFile(share_path, 'utf-8');
            return JSON.parse(data);
        }
        return undefined;
    }

    public async update_share(share: Share): Promise<void>
    {
        await this.init();
        const share_path = this.get_share_path(share.uuid);
        if (fs.existsSync(share_path)) {
            await fsp.writeFile(share_path, JSON.stringify(share, null, 2), 'utf-8');
        } else {
            throw new Error(`Share with UUID ${share.uuid} not found.`);
        }
    }

    public async delete_share(uuid: string): Promise<void>
    {
        await this.init();
        const share_path = this.get_share_path(uuid);
        if (fs.existsSync(share_path)) {
            await fsp.unlink(share_path);
        }
    }


}

export default new ShareDB();