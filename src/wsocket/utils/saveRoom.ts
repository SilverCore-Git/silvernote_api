import type { Server } from "socket.io";
import useRoom from "../../assets/ts/composables/useRoom.js";

export async function triggerSave(
  roomId: string,
  options?: { immediate?: boolean }
): Promise<void> 
{
  
  if (!roomId) return;

  try {
    const { save, room } = await useRoom(roomId);
    
    if (!room) {
      console.warn(`[SaveRoom] Room ${roomId} not found`);
      return;
    }

    if (options?.immediate) {
      await save();
      console.log(`[SaveRoom] Immediate save triggered for room ${roomId}`);
    } else {
      // La sauvegarde sera faite par auto-save (10s interval)
      console.log(`[SaveRoom] Queued for auto-save: room ${roomId}`);
    }
  } 
  catch (error) {
    console.error(`[SaveRoom] Error saving room ${roomId}:`, error);
  }
  
}
