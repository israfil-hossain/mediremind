import { ENV } from "../config/env";

/**
 * Send invitation email via Cloud Functions
 * This would typically use a Cloud Function or your backend API
 */

export interface InvitationEmailRequest {
  doctorName: string;
  patientEmail: string;
  invitationLink: string;
  message?: string;
}

/**
 * Send invitation email to patient
 *
 * This function creates a Firestore document for tracking and then
 * triggers an email via Cloud Function or your backend API.
 *
 * Implementation options:
 * 1. Cloud Function (recommended): Deploy a Firebase Cloud Function
 *    POST https://your-project.cloudfunctions.net/sendInvitationEmail
 *    Body: { doctorName, patientEmail, invitationLink, message }
 *
 * 2. Backend API: Send to your own backend
 *    POST https://your-api.com/api/send-invitation
 *    Body: { doctorName, patientEmail, invitationLink, message }
 *
 * 3. Email Service: Use a service like SendGrid, Mailgun, etc.
 *    Configure in Firebase Console for transactional emails
 */
export async function sendInvitationEmail(request: InvitationEmailRequest): Promise<void> {
  const projectId = ENV.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error("Firebase project ID not configured");
    throw new Error("Firebase project ID not configured");
  }

  try {
    // Create invitation document for tracking (already done in createInvitation)
    // The actual email sending requires a backend service

    console.log("📧 Invitation email request prepared:", {
      doctor: request.doctorName,
      patient: request.patientEmail,
      link: request.invitationLink,
    });

    // TODO: Uncomment one of the options below and configure:

    // Option 1: Cloud Function
    // const response = await fetch(
    //   `https://us-central1-${projectId}.cloudfunctions.net/sendInvitationEmail`,
    //   {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(request),
    //   }
    // );
    // if (!response.ok) throw new Error("Failed to send invitation email");

    // Option 2: Your Backend API
    // const response = await fetch(
    //   `${process.env.EXPO_PUBLIC_API_URL}/api/invitations/send`,
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       "Authorization": `Bearer ${userToken}`
    //     },
    //     body: JSON.stringify(request),
    //   }
    // );
    // if (!response.ok) throw new Error("Failed to send invitation email");

    // Option 3: SendGrid/Mailgun directly
    // Requires API key configuration in environment variables
    // const sgMail = require("@sendgrid/mail");
    // const msg = { to: patientEmail, from: "doctor@yourdomain.com", ... };
    // await sgMail.send(msg);

    // For now, just log the request
    console.log("✅ Invitation email sending configured (requires backend setup)");

  } catch (error) {
    console.error("Error sending invitation email:", error);
    throw error;
  }
}

/**
 * Check if email delivery is enabled
 */
export function isEmailDeliveryEnabled(): boolean {
  // In production, check your backend configuration
  return true; // Default to true for demo purposes
}

/**
 * Get invitation email template
 */
export function getInvitationEmailTemplate(
  doctorName: string,
  patientEmail: string,
  invitationLink: string
): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; padding: 30px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #fff; margin: 0; font-size: 24px;">📋 You're Invited!</h1>
        </div>

        <div style="background-color: #fff; padding: 25px; border-radius: 10px; margin-bottom: 20px;">
          <p style="font-size: 16px; color: #333; margin: 0;">
            <strong>${doctorName}</strong> has invited you to connect on MediRemind.
          </p>

          <p style="font-size: 14px; color: #666; margin: 10px 0;">
            Click the button below to accept the invitation and start receiving medication reminders and prescriptions from your doctor.
          </p>

          <a href="${invitationLink}"
             style="display: block; width: 100%; padding: 15px; background-color: #1a8e2d; color: #fff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; text-align: center;">
            Accept Invitation
          </a>
        </div>

        <div style="text-align: center; padding: 15px; color: #999; font-size: 12px;">
          <p style="margin: 0;">This invitation will expire in 7 days.</p>
        </div>
      </div>
    </div>
  `.trim();
}
