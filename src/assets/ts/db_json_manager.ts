import fs from "fs";
const fsp = fs.promises;
import path from "path";
import { randomUUID } from "crypto";
import __dirname from "./_dirname.js";

interface Item { 

    user_id: string;
    uuid: string;
    note_uuid: string;

    parms: {
        life: number; // age en milliseconde
        passwd?: string;
        editable: boolean;
    }

    created_at: string;

    visitor: string[]; // user ids
    banned: string[]; // user ids

}

class JsonListManager<T extends Item> {
    private filePath: string;

    // File d'attente de promesses en mémoire : sérialise les cycles
    // lire-modifier-écrire (push/update/delete/clear) sur cette instance
    // pour éviter les "lost updates" en cas d'appels concurrents sur le
    // même filePath. Les lectures seules (getAll/getByUUID) ne passent
    // pas par cette file.
    private writeQueue: Promise<any> = Promise.resolve();

    constructor(filePath: string) {
        this.filePath = path.join(__dirname, '../../db/', filePath);
    }

    // Enchaîne `task` après la fin (succès ou échec) de l'opération
    // précédente de la file, puis renvoie son résultat. La file elle-même
    // ne reste jamais bloquée par un échec : elle est toujours remise à un
    // état résolu une fois la tâche terminée, qu'elle ait réussi ou non.
    private enqueue<R>(task: () => Promise<R>): Promise<R> {
        const run = this.writeQueue.then(task, task);
        this.writeQueue = run.then(
            () => undefined,
            () => undefined
        );
        return run;
    }

    private async init() {
        if (!fs.existsSync(this.filePath)) {
            await fsp.mkdir(path.dirname(this.filePath), { recursive: true });
            await fsp.writeFile(this.filePath, JSON.stringify([], null, 2), "utf-8");
        }
    }

    private async readFileSafe(): Promise<T[]> {
        try {
            await this.init();
            const data = await fsp.readFile(this.filePath, "utf-8");
            return JSON.parse(data);
        } catch (err) {
            console.error("Erreur lecture fichier :", err);
            return [];
        }
    }

    private async save(data: T[]): Promise<void> {
        // Écriture atomique : on écrit d'abord dans un fichier temporaire
        // (suffixe aléatoire pour éviter toute collision entre écritures
        // concurrentes), puis on publie le résultat via rename(), qui est
        // atomique au niveau du système de fichiers. Ainsi this.filePath
        // n'est jamais observable dans un état partiellement écrit, même
        // en cas de crash du process pendant l'écriture.
        const tmpPath = `${this.filePath}.${randomUUID()}.tmp`;
        await fsp.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf-8");
        await fsp.rename(tmpPath, this.filePath);
    }

    public async getAll(): Promise<T[]> {
        return await this.readFileSafe();
    }

    public async getByUUID(uuid: string): Promise<T | undefined> {
        const items = await this.readFileSafe();
        return items.find(item => item.uuid === uuid);
    }

    public async push(item: T): Promise<T> {
        return this.enqueue(async () => {
            const items = await this.readFileSafe();
            item.uuid = item.uuid || randomUUID();
            items.push(item);
            await this.save(items);
            return item;
        });
    }

    public async update(item: T): Promise<{ success: boolean; item?: T; message?: string }> {
        if (!item.uuid) return { success: false, message: "uuid requis" };

        return this.enqueue(async () => {
            const items = await this.readFileSafe();
            const index = items.findIndex(i => i.uuid === item.uuid);

            if (index === -1) return { success: false, message: "Élément introuvable" };

            items[index] = { ...items[index], ...item };
            await this.save(items);
            return { success: true, item: items[index] };
        });
    }

    public async delete(uuid: string): Promise<boolean> {
        return this.enqueue(async () => {
            const items = await this.readFileSafe();
            const newItems = items.filter(i => i.uuid !== uuid);
            const changed = newItems.length !== items.length;
            if (changed) await this.save(newItems);
            return changed;
        });
    }

    public async clear(): Promise<void> {
        return this.enqueue(async () => {
            await this.save([]);
        });
    }
}

export default JsonListManager;
