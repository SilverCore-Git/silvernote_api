class AsyncQueue 
{

    private queue: Array<() => Promise<void>> = [];
    private isProcessing = false;

    async addTask(task: () => Promise<void>): Promise<void> 
    {
        this.queue.push(task);
        await this.process();
    }


    private async process(): Promise<void> 
    {
        
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;

        try {

            while (this.queue.length > 0) 
            {
                const task = this.queue.shift();
                if (task) 
                {
                    try {
                        await task();
                    } 
                    catch (error) {
                        console.error("[AsyncQueue] Task failed:", error);
                    }
                }
            }

        } 
        finally 
        {
            this.isProcessing = false;
        }
    }

    async drain(): Promise<void> 
    {
        while (this.queue.length > 0 || this.isProcessing) 
        {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        console.log("[AsyncQueue] All tasks completed");
    }

    getPendingCount(): number 
    {
        return this.queue.length;
    }

}

const disconnectQueue = new AsyncQueue();

export type { AsyncQueue };
export { disconnectQueue };
