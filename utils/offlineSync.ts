import AsyncStorage from "@react-native-async-storage/async-storage";

const OFFLINE_QUEUE_KEY = "@offline_queue";

export interface QueuedOperation {
  id: string;
  type: "connection" | "invitation" | "prescription" | "appointment";
  data: any;
  timestamp: number;
}

/**
 * Add operation to offline queue
 */
export async function addToQueue(operation: QueuedOperation): Promise<void> {
  try {
    const queue = await getQueue();
    queue.push(operation);
    await setQueue(queue);
  } catch (error) {
    console.error("Error adding to offline queue:", error);
  }
}

/**
 * Get all queued operations
 */
export async function getQueue(): Promise<QueuedOperation[]> {
  try {
    const queueJson = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!queueJson) return [];
    return JSON.parse(queueJson);
  } catch (error) {
    console.error("Error getting offline queue:", error);
    return [];
  }
}

/**
 * Save queue to storage
 */
async function setQueue(queue: QueuedOperation[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("Error saving offline queue:", error);
  }
}

/**
 * Remove operation from queue
 */
export async function removeFromQueue(operationId: string): Promise<void> {
  try {
    const queue = await getQueue();
    const updated = queue.filter((op) => op.id !== operationId);
    await setQueue(updated);
  } catch (error) {
    console.error("Error removing from offline queue:", error);
  }
}

/**
 * Clear the offline queue
 */
export async function clearQueue(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (error) {
    console.error("Error clearing offline queue:", error);
  }
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  // In production, you could use NetInfo from @react-native-community/netinfo
  // For now, assume always online
  return true;
}

/**
 * Process queued operations when back online
 */
export async function processQueue(): Promise<void> {
  if (!isOnline()) return;

  const queue = await getQueue();
  if (queue.length === 0) return;

  console.log(`Processing ${queue.length} queued operations...`);

  // Import operations dynamically to avoid circular dependencies
  const { createConnection } = await import("./connections");
  const { createInvitation } = await import("./connections");
  const { createPrescription } = await import("./prescriptionManager");
  const { createAppointment } = await import("./appointments");

  let processed = 0;
  for (const operation of queue) {
    try {
      switch (operation.type) {
        case "connection":
          await createConnection(
            operation.data.doctorId,
            operation.data.patientId
          );
          break;

        case "invitation":
          await createInvitation(
            operation.data.doctorId,
            operation.data.patientEmail
          );
          break;

        case "prescription":
          await createPrescription(operation.data.prescriptionData);
          break;

        case "appointment":
          await createAppointment(operation.data.appointmentData);
          break;
      }

      await removeFromQueue(operation.id);
      processed++;
    } catch (error) {
      console.error(`Error processing queued operation ${operation.id}:`, error);
      // Keep in queue to retry later
      continue;
    }
  }

  console.log(`Processed ${processed}/${queue.length} queued operations`);
}
