import { getMedications, getDoseHistory } from "./storage";
import {
  getFamilyProfiles,
  getActiveProfileId,
  FamilyProfile,
} from "./familyProfiles";
import {
  checkAndNotifyMissedMedications,
  MissedMedicationEmailData,
  notifyFamilyMembersMissedMedication,
} from "./emailNotifications";
import { isFamilyCare } from "./subscription";

const MISSED_MEDICATION_THRESHOLD_MINUTES = 30;

/**
 * Start monitoring for missed medications
 * This should be called when the app starts and when user is logged in
 */
export async function startMedicationMonitoring(): Promise<void> {
  // Check if family care is active
  const hasFamilyCare = await isFamilyCare();

  if (!hasFamilyCare) {
    console.log("Family Care not active - medication monitoring disabled");
    return;
  }

  console.log("Starting medication monitoring service...");

  // Check immediately
  await checkMissedMedications();

  // Then check every 30 minutes
  const intervalId = setInterval(
    async () => {
      await checkMissedMedications();
    },
    30 * 60 * 1000
  ); // 30 minutes

  // Store interval ID for cleanup if needed
  (global as any).__medicationMonitoringInterval = intervalId;
}

/**
 * Stop medication monitoring
 */
export function stopMedicationMonitoring(): void {
  const intervalId = (global as any).__medicationMonitoringInterval;
  if (intervalId) {
    clearInterval(intervalId);
    delete (global as any).__medicationMonitoringInterval;
    console.log("Medication monitoring stopped");
  }
}

/**
 * Check for missed medications and send alerts
 */
async function checkMissedMedications(): Promise<void> {
  try {
    console.log("Checking for missed medications...");

    const [medications, doseHistory, familyProfiles, activeProfileId] =
      await Promise.all([
        getMedications(),
        getDoseHistory(),
        getFamilyProfiles(),
        getActiveProfileId(),
      ]);

    const activeProfile = familyProfiles.find((p) => p.id === activeProfileId);

    if (!activeProfile) {
      console.log("No active profile found");
      return;
    }

    await checkAndNotifyMissedMedications(
      medications,
      doseHistory,
      familyProfiles,
      activeProfile
    );
  } catch (error) {
    console.error("Error checking missed medications:", error);
  }
}

/**
 * Manually trigger a missed medication alert
 * Useful for testing or manual notifications
 */
export async function sendMissedMedicationAlert(
  medicationId: string,
  scheduledTime: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const [medications, familyProfiles, activeProfileId] = await Promise.all([
      getMedications(),
      getFamilyProfiles(),
      getActiveProfileId(),
    ]);

    const medication = medications.find((m) => m.id === medicationId);
    const activeProfile = familyProfiles.find((p) => p.id === activeProfileId);

    if (!medication) {
      return { success: false, error: "Medication not found" };
    }

    if (!activeProfile) {
      return { success: false, error: "Active profile not found" };
    }

    const emailData: MissedMedicationEmailData = {
      patientName: activeProfile.name,
      patientEmail: activeProfile.email,
      medicationName: medication.name,
      dosage: medication.dosage,
      scheduledTime: scheduledTime,
      missedDate: new Date().toLocaleDateString(),
    };

    const result = await notifyFamilyMembersMissedMedication(
      familyProfiles,
      emailData
    );

    if (result.successCount > 0) {
      return {
        success: true,
      };
    } else {
      return {
        success: false,
        error: "No emails sent (no family members with email configured)",
      };
    }
  } catch (error: any) {
    console.error("Error sending missed medication alert:", error);
    return {
      success: false,
      error: error.message || "Failed to send alert",
    };
  }
}

/**
 * Get monitoring status
 */
export function isMedicationMonitoringActive(): boolean {
  return !!(global as any).__medicationMonitoringInterval;
}
