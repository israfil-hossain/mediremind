import * as Network from "expo-network";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  processSyncQueue,
  getCurrentUser,
  isFirebaseReady,
  initializeFirebase,
} from "./firebase";

const NETWORK_STATE_KEY = "@network_state";

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string | null;
}

let networkSubscription: (() => void) | null = null;
let syncInProgress = false;

// Get current network state
export async function getNetworkState(): Promise<NetworkState> {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return {
      isConnected: networkState.isConnected ?? false,
      isInternetReachable: networkState.isInternetReachable ?? false,
      type: networkState.type ?? null,
    };
  } catch (error) {
    console.error("Error getting network state:", error);
    return {
      isConnected: false,
      isInternetReachable: false,
      type: null,
    };
  }
}

// Check if device is online and can sync
export async function canSync(): Promise<boolean> {
  const state = await getNetworkState();
  const user = await getCurrentUser();
  return (
    state.isConnected &&
    state.isInternetReachable === true &&
    user !== null &&
    isFirebaseReady()
  );
}

// Start network monitoring
export function startNetworkMonitoring(): void {
  // Check network state periodically (every 30 seconds)
  const intervalId = setInterval(async () => {
    const state = await getNetworkState();
    const previousState = await AsyncStorage.getItem(NETWORK_STATE_KEY);
    const prevConnected = previousState
      ? JSON.parse(previousState).isConnected
      : false;

    // Store current state
    await AsyncStorage.setItem(NETWORK_STATE_KEY, JSON.stringify(state));

    // If we just came online, process sync queue
    if (state.isConnected && state.isInternetReachable && !prevConnected) {
      console.log("Network restored - processing sync queue...");
      await triggerSync();
    }
  }, 30000);

  networkSubscription = () => {
    clearInterval(intervalId);
  };

  // Initial network check
  (async () => {
    const state = await getNetworkState();
    await AsyncStorage.setItem(NETWORK_STATE_KEY, JSON.stringify(state));
    if (state.isConnected && state.isInternetReachable) {
      await triggerSync();
    }
  })();
}

// Stop network monitoring
export function stopNetworkMonitoring(): void {
  if (networkSubscription) {
    networkSubscription();
    networkSubscription = null;
  }
}

// Trigger sync (with debounce/lock)
export async function triggerSync(): Promise<void> {
  if (syncInProgress) {
    console.log("Sync already in progress, skipping...");
    return;
  }

  const canSyncNow = await canSync();
  if (!canSyncNow) {
    console.log("Cannot sync - offline or not logged in");
    return;
  }

  syncInProgress = true;
  try {
    await initializeFirebase();
    await processSyncQueue();
    console.log("Sync completed successfully");
  } catch (error) {
    console.error("Sync failed:", error);
  } finally {
    syncInProgress = false;
  }
}

// Force sync immediately (for manual trigger)
export async function forceSyncNow(): Promise<{
  success: boolean;
  error?: string;
}> {
  const state = await getNetworkState();
  const user = await getCurrentUser();

  if (!state.isConnected || !state.isInternetReachable) {
    return { success: false, error: "No internet connection" };
  }

  if (!user) {
    return { success: false, error: "Not logged in" };
  }

  try {
    await initializeFirebase();
    await processSyncQueue();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Sync failed" };
  }
}
