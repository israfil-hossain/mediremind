import { ENV } from "../config/env";
import { FamilyProfile } from "./familyProfiles";
import { Medication } from "./storage";

const RESEND_API_URL = "https://api.resend.com/emails";

export interface MissedMedicationEmailData {
  patientName: string;
  patientEmail?: string;
  medicationName: string;
  dosage: string;
  scheduledTime: string;
  missedDate: string;
}

/**
 * Send email notification to family members when medication is missed
 */
export async function sendMissedMedicationEmail(
  recipientProfile: FamilyProfile,
  emailData: MissedMedicationEmailData
): Promise<{ success: boolean; error?: string }> {
  // Check if Resend API key is configured
  if (!ENV.RESEND_API_KEY) {
    console.error("Resend API key not configured");
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  // Check if recipient has email
  if (!recipientProfile.email) {
    console.warn(`No email configured for ${recipientProfile.name}`);
    return {
      success: false,
      error: "No email configured for recipient",
    };
  }

  try {
    const emailHtml = generateMissedMedicationEmailHTML(emailData);
    const emailText = generateMissedMedicationEmailText(emailData);

    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ENV.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "MediRemind <notifications@mediremind.flowentech.com>",
        to: [recipientProfile.email],
        subject: `⚠️ Missed Medication Alert: ${emailData.patientName}`,
        html: emailHtml,
        text: emailText,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      return {
        success: false,
        error: data.message || "Failed to send email",
      };
    }

    console.log("Email sent successfully:", data);
    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

/**
 * Send email notifications to all family members with configured emails
 */
export async function notifyFamilyMembersMissedMedication(
  familyProfiles: FamilyProfile[],
  emailData: MissedMedicationEmailData
): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0;
  let failureCount = 0;

  // Filter profiles with email addresses (excluding the patient themselves if they have an email)
  const recipientsWithEmail = familyProfiles.filter(
    (profile) =>
      profile.email &&
      profile.email.trim() !== "" &&
      profile.email !== emailData.patientEmail
  );

  if (recipientsWithEmail.length === 0) {
    console.log("No family members with email configured");
    return { successCount: 0, failureCount: 0 };
  }

  console.log(
    `Sending missed medication alerts to ${recipientsWithEmail.length} family members`
  );

  // Send emails to all recipients
  for (const recipient of recipientsWithEmail) {
    const result = await sendMissedMedicationEmail(recipient, emailData);
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  return { successCount, failureCount };
}

/**
 * Generate HTML email for missed medication alert
 */
function generateMissedMedicationEmailHTML(
  data: MissedMedicationEmailData
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Missed Medication Alert</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 12px;
      padding: 30px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #f0f0f0;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #1a8e2d;
      margin-bottom: 10px;
    }
    .alert-icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .title {
      color: #d32f2f;
      font-size: 24px;
      font-weight: 600;
      margin: 20px 0;
    }
    .info-box {
      background-color: #fff3e0;
      border-left: 4px solid #ff9800;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      margin: 10px 0;
    }
    .label {
      font-weight: 600;
      color: #666;
    }
    .value {
      color: #333;
      font-size: 16px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
      text-align: center;
      color: #999;
      font-size: 14px;
    }
    .button {
      display: inline-block;
      background-color: #1a8e2d;
      color: white !important;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 8px;
      margin-top: 20px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">💊 MediRemind</div>
      <div class="alert-icon">⚠️</div>
    </div>

    <h1 class="title">Missed Medication Alert</h1>

    <p>This is an automated alert from MediRemind.</p>

    <div class="info-box">
      <div class="info-row">
        <span class="label">Patient:</span>
        <span class="value">${data.patientName}</span>
      </div>
      <div class="info-row">
        <span class="label">Medication:</span>
        <span class="value">${data.medicationName}</span>
      </div>
      <div class="info-row">
        <span class="label">Dosage:</span>
        <span class="value">${data.dosage}</span>
      </div>
      <div class="info-row">
        <span class="label">Scheduled Time:</span>
        <span class="value">${data.scheduledTime}</span>
      </div>
      <div class="info-row">
        <span class="label">Date:</span>
        <span class="value">${data.missedDate}</span>
      </div>
    </div>

    <p><strong>${data.patientName}</strong> has not taken their medication <strong>${data.medicationName}</strong> that was scheduled for <strong>${data.scheduledTime}</strong>.</p>

    <p>Please check in with them to ensure they take their medication as prescribed.</p>

    <center>
      <a href="https://mediremind.flowentech.com" class="button">Open MediRemind App</a>
    </center>

    <div class="footer">
      <p>This is an automated message from MediRemind Family Care.</p>
      <p>If you no longer wish to receive these alerts, please update your notification settings in the app.</p>
      <p>&copy; ${new Date().getFullYear()} Flowentech. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text email for missed medication alert
 */
function generateMissedMedicationEmailText(
  data: MissedMedicationEmailData
): string {
  return `
⚠️ MISSED MEDICATION ALERT

Patient: ${data.patientName}
Medication: ${data.medicationName}
Dosage: ${data.dosage}
Scheduled Time: ${data.scheduledTime}
Date: ${data.missedDate}

${data.patientName} has not taken their medication ${data.medicationName} that was scheduled for ${data.scheduledTime}.

Please check in with them to ensure they take their medication as prescribed.

---
This is an automated message from MediRemind Family Care.
If you no longer wish to receive these alerts, please update your notification settings in the app.

© ${new Date().getFullYear()} Flowentech. All rights reserved.
  `;
}

/**
 * Check for missed medications and send alerts
 * This should be called periodically (e.g., every 30 minutes)
 */
export async function checkAndNotifyMissedMedications(
  medications: any[],
  doseHistory: any[],
  familyProfiles: FamilyProfile[],
  activeProfile: FamilyProfile | null
): Promise<void> {
  const now = new Date();
  const today = now.toDateString();

  // Check each medication scheduled for today
  for (const medication of medications) {
    // Skip if no times scheduled
    if (!medication.times || medication.times.length === 0) continue;

    for (const scheduledTime of medication.times) {
      // Parse scheduled time
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const scheduledDateTime = new Date();
      scheduledDateTime.setHours(hours, minutes, 0, 0);

      // Check if scheduled time has passed by more than 30 minutes
      const timeDiff = now.getTime() - scheduledDateTime.getTime();
      const thirtyMinutes = 30 * 60 * 1000;

      if (timeDiff < thirtyMinutes) {
        // Not yet time to send alert (less than 30 minutes overdue)
        continue;
      }

      // Check if dose was already taken
      const doseKey = `${medication.id}_${today}_${scheduledTime}`;
      const doseTaken = doseHistory.some(
        (dose) =>
          dose.medicationId === medication.id &&
          new Date(dose.timestamp).toDateString() === today &&
          dose.taken
      );

      if (!doseTaken) {
        // Medication was missed - send notification
        console.log(
          `Missed medication detected: ${medication.name} at ${scheduledTime}`
        );

        const emailData: MissedMedicationEmailData = {
          patientName: activeProfile?.name || "Patient",
          patientEmail: activeProfile?.email,
          medicationName: medication.name,
          dosage: medication.dosage,
          scheduledTime: scheduledTime,
          missedDate: now.toLocaleDateString(),
        };

        await notifyFamilyMembersMissedMedication(familyProfiles, emailData);
      }
    }
  }
}
