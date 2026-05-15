import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ENV } from "../config/env";

const PUSH_TOKEN_KEY = "@push_token";
const LAST_TOKEN_KEY = "@last_push_token";

/**
 * Request push notification permissions
 */
export async function requestPushPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    if (existingStatus === "granted") {
      return true;
    }

    const { status: finalStatus } =
      await Notifications.requestPermissionsAsync();

    return finalStatus === "granted";
  } catch (error) {
    console.error("Error requesting push permissions:", error);
    return false;
  }
}

/**
 * Register device for push notifications
 */
export async function registerForPushNotifications(): Promise<void> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsyncAsync("default", {
        name: "MediRemind",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4CAF50",
        lightColor: "#0D9488",
      });
    }

    const token = await Notifications.getExpoPushTokenAsync();
    const lastToken = await AsyncStorage.getItem(LAST_TOKEN_KEY);

    if (token && token !== lastToken) {
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      await AsyncStorage.setItem(LAST_TOKEN_KEY, token);
      console.log("✓ Push token registered:", token);

      // Send token to server (in production, send to your backend)
      await sendTokenToServer(token);
    }
  } catch (error) {
    console.error("Error registering for push notifications:", error);
  }
}

/**
 * Send local notification (for immediate feedback)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        vibrate: true,
      },
      trigger: { seconds: 1 },
    });
  } catch (error) {
    console.error("Error sending local notification:", error);
  }
}

/**
 * Send push notification to specific device (for admin/doctor actions)
 */
export async function sendPushNotification(
  deviceToken: string,
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    await Notifications.sendPushNotificationAsync([deviceToken], {
      to: deviceToken,
      sound: "default",
      title,
      body,
      data,
    });
  } catch (error) {
    console.error("Error sending push notification:", error);
  }
}

/**
 * Send token to server (implement with your backend)
 */
async function sendTokenToServer(token: string): Promise<void> {
  try {
    // TODO: Send token to your backend API
    // Example fetch call:
    // const response = await fetch('https://your-api.com/push/register', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
    //   body: JSON.stringify({ token, deviceId: Device.osBuildId, platform: Platform.OS }),
    // });

    console.log("Token sent to server:", token);
  } catch (error) {
    console.error("Error sending token to server:", error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error canceling notifications:", error);
  }
}

/**
 * Get push notification categories
 */
export function getNotificationCategories() {
  return [
    {
      identifier: "prescription",
      name: "Prescriptions",
      importance: Notifications.AndroidImportance.HIGH,
    },
    {
      identifier: "medication",
      name: "Medications",
      importance: Notifications.AndroidImportance.HIGH,
    },
    {
      identifier: "appointment",
      name: "Appointments",
      importance: Notifications.AndroidImportance.HIGH,
    },
    {
      identifier: "reminder",
      name: "Reminders",
      importance: Notifications.AndroidImportance.MAX,
    },
  ];
}
