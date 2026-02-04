import fs from 'fs';
import path from 'path';
import __dirname from './_dirname.js';
import { UUID } from 'crypto';

interface NewsItem {
    id: UUID;
    title: string;
    content: string; // md format
    readBy: string[];
    date: Date;
}

const newsFilePath = path.join(__dirname, '../../', 'db', 'news.json');


class News
{

    constructor()
    {
        if (!fs.existsSync(newsFilePath)) {
            fs.writeFileSync(newsFilePath, JSON.stringify([], null, 2), 'utf-8');
        }
    }

    private getNewsFile (): NewsItem[]
    {
        return JSON.parse(fs.readFileSync(newsFilePath, 'utf-8'));
    }

    private async saveNewsFile (news: NewsItem[]): Promise<void>
    {
        await fs.promises.writeFile(newsFilePath, JSON.stringify(news, null, 2), 'utf-8');
    }

    public getAllNews (): NewsItem[]
    {
        return this.getNewsFile();
    }

    public getLastNews (count: number): NewsItem[]
    {
        const news = this.getNewsFile();
        return news.slice(0, count);
    }

    public async markNewsAsRead (newsId: string, userId: string): Promise<void>
    {

        const news = this.getNewsFile();
        const index = news.findIndex(n => n.id === newsId);

        if (index !== -1) {
            if (news[index].readBy.includes(userId)) return;
            news[index].readBy.push(userId);
            console.log(`User ${userId} marked news ${newsId} as read, ${news[index].readBy.length} total reads.`);
            await this.saveNewsFile(news);
        }

    }

}

export default new News();

export {
    type NewsItem
}