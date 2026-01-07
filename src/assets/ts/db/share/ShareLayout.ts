import fs from 'fs';
const fsp = fs.promises;

import { share_db_layout_path } from "./const.js";
import type { ShareOnLayout, Layout } from "./ShareTypes.js";


class ShareLayout
{

    private layout_path: string;

    constructor()
    {
        this.layout_path = share_db_layout_path;
        this.init();
    }

    private async init()
    {
        if (!fs.existsSync(this.layout_path)) {
            await fsp.writeFile(this.layout_path, JSON.stringify([], null, 2), 'utf-8');
        }
    }

    private async read_layout(): Promise<Layout>
    {
        await this.init();
        const data = await fsp.readFile(this.layout_path, 'utf-8');
        return JSON.parse(data);
    }

    private async save_layout(layout: Layout): Promise<void>
    {
        await fsp.writeFile(this.layout_path, JSON.stringify(layout, null, 2), 'utf-8');
    }

    public async add_share_to_layout(share: ShareOnLayout): Promise<void>
    {
        const layout = await this.read_layout();
        layout.push(share);
        await this.save_layout(layout);
    }

    public async remove_share_from_layout(uuid: string): Promise<void>
    {
        const layout = await this.read_layout();
        const updated_layout = layout.filter(s => s.uuid !== uuid);
        await this.save_layout(updated_layout);
    }

    public async get_share_from_layout(uuid: string): Promise<ShareOnLayout | undefined>
    {
        const layout = await this.read_layout();
        return layout.find(s => s.uuid === uuid);
    }

    public async get_all_shares_from_layout(): Promise<Layout>
    {
        return await this.read_layout();
    }

}

export default new ShareLayout();