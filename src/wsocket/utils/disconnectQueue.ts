/**
 * AsyncQueue pour gérer les tâches de nettoyage lors de la disconnection
 * Assure que les sauvegardes sont complètes avant shutdown
 */

class AsyncQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  /**
   * Ajouter une tâche à la queue
   */
  async addTask(task: () => Promise<void>): Promise<void> {
    this.queue.push(task);
    await this.process();
  }

  /**
   * Traiter les tâches de la queue séquentiellement
   */
  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const task = this.queue.shift();
        if (task) {
          try {
            await task();
          } 
          catch (error) {
            console.error("[AsyncQueue] Task failed:", error);
          }
        }
      }
    } 
    finally {
      this.isProcessing = false;
    }
  }

  /**
   * Attendre que toutes les tâches soient complètes
   */
  async drain(): Promise<void> {
    while (this.queue.length > 0 || this.isProcessing) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    console.log("[AsyncQueue] All tasks completed");
  }

  /**
   * Obtenir le nombre de tâches en attente
   */
  getPendingCount(): number {
    return this.queue.length;
  }
}

// Singleton instance
const disconnectQueue = new AsyncQueue();

export type { AsyncQueue };
export { disconnectQueue };
