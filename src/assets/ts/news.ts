import fs from 'fs';
import path from 'path';
import __dirname from './_dirname.js';

interface NewsItem {
    id: number;
    title: string;
    content: string; // md format
    date: Date;
}

class News
{

    private getNewsFile (): NewsItem[]
    {
        return JSON.parse(fs.readFileSync(path.join(__dirname, '../config/news.json'), 'utf-8'));
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

}

export default new News();

export {
    type NewsItem
}