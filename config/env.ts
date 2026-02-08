// Environment configuration
// Values come from .env file via EXPO_PUBLIC_ prefix

export const ENV = {
  // Firebase Web Client ID for Google Sign-In
  FIREBASE_WEB_CLIENT_ID:
    process.env.EXPO_PUBLIC_FIREBASE_WEB_CLIENT_ID || "",

  // RevenueCat API Key
  REVENUECAT_API_KEY:
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "",

  // Firebase Project Config
  FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  FIREBASE_AUTH_DOMAIN: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  FIREBASE_STORAGE_BUCKET: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  FIREBASE_MESSAGING_SENDER_ID:
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",

  // Development: Override premium status for testing
  DEV_IS_PREMIUM: process.env.EXPO_PUBLIC_DEV_IS_PREMIUM === "true",

  // Resend API Key for email notifications (server-side only, not exposed to client)
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
};

// Firebase config object for initialization
export const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
  storageBucket: ENV.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: ENV.FIREBASE_MESSAGING_SENDER_ID,
  appId: ENV.FIREBASE_APP_ID,
};

// Validation helper
export function validateEnvConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!ENV.FIREBASE_WEB_CLIENT_ID) {
    missing.push("FIREBASE_WEB_CLIENT_ID");
  }

  if (!ENV.FIREBASE_PROJECT_ID) {
    missing.push("FIREBASE_PROJECT_ID");
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}
