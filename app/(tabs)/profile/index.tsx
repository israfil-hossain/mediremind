import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { isPremium, getSubscription } from "../../../utils/subscription";
import { getMedications } from "../../../utils/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "@app_settings";

interface AppSettings {
  notificationsEnabled: boolean;
  biometricEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  defaultSnooze: number;
  theme: "light" | "dark" | "system";
}

const defaultSettings: AppSettings = {
  notificationsEnabled: true,
  biometricEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  defaultSnooze: 10,
  theme: "system",
};

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  disabled?: boolean;
  premium?: boolean;
}

interface MenuItemInternalProps extends MenuItemProps {
  theme: any;
}

function MenuItemInternal({
  icon,
  iconColor,
  title,
  subtitle,
  onPress,
  rightElement,
  disabled,
  premium,
  theme,
}: MenuItemInternalProps) {
  return (
    <TouchableOpacity
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 16,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        },
        disabled && { opacity: 0.5 },
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View
        style={[
          {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          },
          { backgroundColor: `${iconColor}15` },
        ]}
      >
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={[
              { fontSize: 16, fontWeight: "500", color: theme.colors.text },
              disabled && { color: theme.colors.textTertiary },
            ]}
          >
            {title}
          </Text>
          {premium && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#FFF3E0",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 10,
                marginLeft: 8,
              }}
            >
              <Ionicons name="star" size={10} color="#FF9800" />
              <Text style={{ fontSize: 10, fontWeight: "600", color: "#FF9800", marginLeft: 2 }}>
                PRO
              </Text>
            </View>
          )}
        </View>
        {subtitle && (
          <Text
            style={[
              { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
              disabled && { color: theme.colors.textTertiary },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />}
    </TouchableOpacity>
  );
}

function MenuItem(props: MenuItemProps) {
  const { theme } = useTheme();
  return <MenuItemInternal {...props} theme={theme} />;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { theme, setThemeMode } = useTheme();
  const {
    user,
    isLoading,
    isOnline,
    lastSyncTime,
    logOut,
    refreshUser,
    syncNow,
    restoreFromCloud,
  } = useAuth();

  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [medicationCount, setMedicationCount] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSyncing, setIsSyncing] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<string>("free");

  useEffect(() => {
    loadData();
  }, []);

  // Refresh user when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      refreshUser();
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [premium, medications, subscription, savedSettings] = await Promise.all([
        isPremium(),
        getMedications(),
        getSubscription(),
        AsyncStorage.getItem(SETTINGS_KEY),
      ]);

      setIsPremiumUser(premium);
      setMedicationCount(medications.length);
      setSubscriptionType(subscription?.type || "free");

      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const handleSignIn = () => {
    router.push("/auth");
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logOut();
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const handleSyncNow = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to sync your data.");
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncNow();
      if (result.success) {
        Alert.alert("Success", "Data synced successfully!");
      } else {
        Alert.alert("Sync Failed", result.error || "Could not sync data");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to restore your data.");
      return;
    }

    Alert.alert(
      "Restore from Cloud",
      "This will replace your local data with cloud data. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            setIsSyncing(true);
            try {
              const result = await restoreFromCloud();
              if (result.success) {
                Alert.alert("Success", "Data restored successfully!");
                loadData();
              } else {
                Alert.alert("Restore Failed", result.error);
              }
            } finally {
              setIsSyncing(false);
            }
          },
        },
      ]
    );
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return "Never synced";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getSubscriptionLabel = (type: string) => {
    switch (type) {
      case "premium_monthly":
        return "Premium Monthly";
      case "premium_yearly":
        return "Premium Yearly";
      case "premium_lifetime":
        return "Premium Lifetime";
      case "family_care_monthly":
        return "Family Care Monthly";
      case "family_care_yearly":
        return "Family Care Yearly";
      case "family_care_lifetime":
        return "Family Care Lifetime";
      default:
        return "Free Plan";
    }
  };

  const styles = createStyles(theme);

  return (
    <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* User Profile Card */}
          <View style={styles.profileCard}>
            {user ? (
              <>
                <View style={styles.profileHeader}>
                  {user.photoURL ? (
                    <Image
                      source={{ uri: user.photoURL }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Ionicons name="person" size={40} color={theme.colors.primary} />
                    </View>
                  )}
                  <View style={styles.profileInfo}>
                    <Text style={styles.userName}>
                      {user.displayName || "User"}
                    </Text>
                    <Text style={styles.userEmail}>{user.email}</Text>
                    <View style={styles.statusRow}>
                      <View
                        style={[
                          styles.statusDot,
                          isOnline ? styles.onlineDot : styles.offlineDot,
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {isOnline ? "Online" : "Offline"}
                      </Text>
                      <Text style={styles.syncText}>
                        • {formatLastSync(lastSyncTime)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.profileActions}>
                  <TouchableOpacity
                    style={[styles.syncButton, (!isOnline || isSyncing) && styles.buttonDisabled]}
                    onPress={handleSyncNow}
                    disabled={!isOnline || isSyncing}
                  >
                    {isSyncing ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                        <Text style={styles.syncButtonText}>Sync</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.signOutBtn}
                    onPress={handleSignOut}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#E53935" />
                    <Text style={styles.signOutBtnText}>Sign Out</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.signInContainer}>
                <View style={styles.signInIcon}>
                  <Ionicons name="cloud-outline" size={40} color={theme.colors.primary} />
                </View>
                <Text style={styles.signInTitle}>Sign in for Cloud Backup</Text>
                <Text style={styles.signInSubtitle}>
                  Keep your medications synced across devices
                </Text>
                <TouchableOpacity
                  style={styles.googleSignInButton}
                  onPress={handleSignIn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.colors.text} size="small" />
                  ) : (
                    <>
                      <Ionicons name="log-in-outline" size={20} color={theme.colors.primary} />
                      <Text style={styles.googleSignInText}>
                        Sign In
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Subscription Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SUBSCRIPTION</Text>
            <View style={styles.sectionCard}>
              <View style={styles.subscriptionHeader}>
                <View style={styles.subscriptionInfo}>
                  <View style={[
                    styles.planBadge,
                    isPremiumUser ? styles.premiumPlanBadge : styles.freePlanBadge
                  ]}>
                    <Ionicons
                      name={isPremiumUser ? "star" : "leaf"}
                      size={16}
                      color={isPremiumUser ? "#FF9800" : theme.colors.primary}
                    />
                    <Text style={[
                      styles.planBadgeText,
                      isPremiumUser ? styles.premiumPlanText : styles.freePlanText
                    ]}>
                      {getSubscriptionLabel(subscriptionType)}
                    </Text>
                  </View>
                  <Text style={styles.subscriptionDetail}>
                    {isPremiumUser
                      ? "Unlimited medications & features"
                      : `${medicationCount}/5 medications used`}
                  </Text>
                </View>
              </View>

              {!isPremiumUser && (
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => router.push("/premium")}
                >
                  <LinearGradient
                    colors={["#FF9800", "#F57C00"]}
                    style={styles.upgradeGradient}
                  >
                    <Ionicons name="star" size={20} color="#fff" />
                    <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <MenuItem
                icon="card-outline"
                iconColor="#9C27B0"
                title="Manage Subscription"
                subtitle="View plans and billing"
                onPress={() => router.push("/premium")}
              />

              <MenuItem
                icon="refresh-outline"
                iconColor="#2196F3"
                title="Restore Purchases"
                subtitle="Restore previous purchases"
                onPress={() => {
                  Alert.alert("Restore", "Checking for previous purchases...");
                }}
              />
            </View>
          </View>

          {/* Medications Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MEDICATIONS</Text>
            <View style={styles.sectionCard}>
              <MenuItem
                icon="albums-outline"
                iconColor="#00BCD4"
                title="Medication Templates"
                subtitle="Save & reuse medication setups"
                premium={!isPremiumUser}
                disabled={!isPremiumUser}
                onPress={() => {
                  if (isPremiumUser) {
                    Alert.alert("Coming Soon", "Templates feature coming soon!");
                  } else {
                    router.push("/premium");
                  }
                }}
              />

              <MenuItem
                icon="download-outline"
                iconColor="#FF5722"
                title="Import / Export"
                subtitle="Backup medications to file"
                onPress={() => {
                  Alert.alert("Export", "Export feature coming soon!");
                }}
              />

              <MenuItem
                icon="notifications-outline"
                iconColor="#E91E63"
                title="Refill Reminders"
                subtitle="Manage refill alerts"
                onPress={() => router.push("/refills")}
              />
            </View>
          </View>

          {/* History & Analytics Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HISTORY & ANALYTICS</Text>
            <View style={styles.sectionCard}>
              <MenuItem
                icon="analytics-outline"
                iconColor="#009688"
                title="Analytics Dashboard"
                subtitle="Adherence stats & trends"
                premium={!isPremiumUser}
                disabled={!isPremiumUser}
                onPress={() => {
                  if (isPremiumUser) {
                    router.push("/analytics");
                  } else {
                    router.push("/premium");
                  }
                }}
              />

              <MenuItem
                icon="document-text-outline"
                iconColor="#795548"
                title="Export Reports"
                subtitle="HTML, CSV & JSON reports"
                premium={!isPremiumUser}
                disabled={!isPremiumUser}
                onPress={() => {
                  if (isPremiumUser) {
                    router.push("/analytics");
                  } else {
                    router.push("/premium");
                  }
                }}
              />
            </View>
          </View>

          {/* Backup & Sync Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BACKUP & SYNC</Text>
            <View style={styles.sectionCard}>
              <MenuItem
                icon="cloud-outline"
                iconColor="#2196F3"
                title="Cloud Backup"
                subtitle={user ? "Connected" : "Not connected"}
                onPress={() => {
                  if (!user) {
                    handleSignIn();
                  }
                }}
                rightElement={
                  <View style={[
                    styles.cloudStatus,
                    user ? styles.cloudConnected : styles.cloudDisconnected
                  ]}>
                    <Text style={styles.cloudStatusText}>
                      {user ? "ON" : "OFF"}
                    </Text>
                  </View>
                }
              />

              {user && (
                <>
                  <MenuItem
                    icon="sync-outline"
                    iconColor="#4CAF50"
                    title="Sync Now"
                    subtitle={formatLastSync(lastSyncTime)}
                    onPress={handleSyncNow}
                    rightElement={
                      isSyncing ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                      ) : (
                        <Ionicons name="chevron-forward" size={20} color={theme.colors.border} />
                      )
                    }
                  />

                  <MenuItem
                    icon="cloud-download-outline"
                    iconColor="#FF9800"
                    title="Restore from Cloud"
                    subtitle="Download data from backup"
                    onPress={handleRestoreFromCloud}
                  />
                </>
              )}
            </View>
          </View>

          {/* App Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>APP SETTINGS</Text>
            <View style={styles.sectionCard}>
              <MenuItem
                icon="notifications-outline"
                iconColor="#FF5722"
                title="Notifications"
                subtitle={settings.notificationsEnabled ? "Enabled" : "Disabled"}
                rightElement={
                  <Switch
                    value={settings.notificationsEnabled}
                    onValueChange={(value) =>
                      saveSettings({ ...settings, notificationsEnabled: value })
                    }
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + "80" }}
                    thumbColor={settings.notificationsEnabled ? theme.colors.primary : theme.colors.surface}
                  />
                }
              />

              <MenuItem
                icon="finger-print-outline"
                iconColor="#9C27B0"
                title="Biometric Lock"
                subtitle="Require authentication to open"
                rightElement={
                  <Switch
                    value={settings.biometricEnabled}
                    onValueChange={(value) =>
                      saveSettings({ ...settings, biometricEnabled: value })
                    }
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary + "80" }}
                    thumbColor={settings.biometricEnabled ? theme.colors.primary : theme.colors.surface}
                  />
                }
              />

              <MenuItem
                icon="moon-outline"
                iconColor="#3F51B5"
                title="Quiet Hours"
                subtitle={
                  settings.quietHoursEnabled
                    ? `${settings.quietHoursStart} - ${settings.quietHoursEnd}`
                    : "Disabled"
                }
                premium={!isPremiumUser}
                rightElement={
                  isPremiumUser ? (
                    <Switch
                      value={settings.quietHoursEnabled}
                      onValueChange={(value) =>
                        saveSettings({ ...settings, quietHoursEnabled: value })
                      }
                      trackColor={{ false: theme.colors.border, true: theme.colors.primary + "80" }}
                      thumbColor={settings.quietHoursEnabled ? theme.colors.primary : theme.colors.surface}
                    />
                  ) : (
                    <Ionicons name="lock-closed" size={18} color={theme.colors.border} />
                  )
                }
                onPress={() => {
                  if (!isPremiumUser) {
                    router.push("/premium");
                  }
                }}
              />

              <MenuItem
                icon="color-palette-outline"
                iconColor="#E91E63"
                title="Theme"
                subtitle={theme.mode.charAt(0).toUpperCase() + theme.mode.slice(1)}
                onPress={() => {
                  Alert.alert(
                    "Select Theme",
                    "Choose your preferred theme",
                    [
                      {
                        text: "Light",
                        onPress: async () => {
                          await setThemeMode("light");
                          await saveSettings({ ...settings, theme: "light" });
                        },
                      },
                      {
                        text: "Dark",
                        onPress: async () => {
                          await setThemeMode("dark");
                          await saveSettings({ ...settings, theme: "dark" });
                        },
                      },
                      {
                        text: "Auto",
                        onPress: async () => {
                          await setThemeMode("auto");
                          await saveSettings({ ...settings, theme: "system" });
                        },
                      },
                      { text: "Cancel", style: "cancel" },
                    ]
                  );
                }}
              />
            </View>
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ABOUT</Text>
            <View style={styles.sectionCard}>
              <MenuItem
                icon="help-circle-outline"
                iconColor="#607D8B"
                title="Help & Support"
                subtitle="FAQs and contact support"
                onPress={() => {
                  Alert.alert("Help", "Visit our support page");
                }}
              />

              <MenuItem
                icon="document-outline"
                iconColor="#607D8B"
                title="Privacy Policy"
                onPress={() => {
                  Alert.alert("Privacy Policy", "View privacy policy");
                }}
              />

              <MenuItem
                icon="shield-checkmark-outline"
                iconColor="#607D8B"
                title="Terms of Service"
                onPress={() => {
                  Alert.alert("Terms", "View terms of service");
                }}
              />

              <MenuItem
                icon="information-circle-outline"
                iconColor="#607D8B"
                title="About MedRemind"
                subtitle="Version 1.0.0"
                onPress={() => {
                  Alert.alert(
                    "MedRemind",
                    "Version 1.0.0\n\nYour personal medication reminder app.\n\n© 2024 Flowentech"
                  );
                }}
              />
            </View>
          </View>

          {/* Danger Zone */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.dangerTitle]}>DANGER ZONE</Text>
            <View style={styles.sectionCard}>
              <MenuItem
                icon="trash-outline"
                iconColor="#E53935"
                title="Clear All Data"
                subtitle="Delete all medications and history"
                onPress={() => {
                  Alert.alert(
                    "Clear All Data",
                    "This will permanently delete all your medications and history. This cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete All",
                        style: "destructive",
                        onPress: async () => {
                          try {
                            const { clearAllData } = await import("../../../utils/storage");
                            await clearAllData();
                            Alert.alert("Success", "All data has been cleared.");
                            loadData();
                          } catch (error) {
                            Alert.alert("Error", "Failed to clear data.");
                          }
                        },
                      },
                    ]
                  );
                }}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Made with ❤️ by Flowentech</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  profileCard: {
    backgroundColor: theme.colors.card,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: theme.colors.primary,
  },
  offlineDot: {
    backgroundColor: "#FF9800",
  },
  statusText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  syncText: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    marginLeft: 4,
  },
  profileActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },
  syncButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  signOutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFEBEE",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  signOutBtnText: {
    color: "#E53935",
    fontWeight: "600",
    fontSize: 14,
  },
  signInContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  signInIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  signInTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 4,
  },
  signInSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
  },
  googleSignInButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 10,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleSignInText: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.text,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: theme.colors.textTertiary,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  dangerTitle: {
    color: "#E53935",
  },
  sectionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  subscriptionHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  subscriptionInfo: {
    flex: 1,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: 8,
  },
  freePlanBadge: {
    backgroundColor: theme.colors.surface,
  },
  premiumPlanBadge: {
    backgroundColor: "#FFF3E0",
  },
  planBadgeText: {
    fontSize: 14,
    fontWeight: "600",
  },
  freePlanText: {
    color: theme.colors.primary,
  },
  premiumPlanText: {
    color: "#FF9800",
  },
  subscriptionDetail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  upgradeButton: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    overflow: "hidden",
  },
  upgradeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },
  menuTitleDisabled: {
    color: theme.colors.textTertiary,
  },
  menuSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  menuSubtitleDisabled: {
    color: theme.colors.textTertiary,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#FF9800",
  },
  cloudStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cloudConnected: {
    backgroundColor: theme.colors.surface,
  },
  cloudDisconnected: {
    backgroundColor: theme.colors.background,
  },
  cloudStatusText: {
    fontSize: 11,
    fontWeight: "bold",
    color: theme.colors.primary,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 30,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
});
