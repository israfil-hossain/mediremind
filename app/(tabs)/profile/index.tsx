import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, ScreenBackground } from "../../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../../constants/design";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { getMedications, getUserProfile, updateUserProfile, UserProfile } from "../../../utils/storage";
import { getSubscription, isPremium } from "../../../utils/subscription";

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

function MenuItem({ icon, iconColor, title, subtitle, onPress, rightElement, disabled, premium }: MenuItemProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, { borderBottomColor: theme.colors.border }, disabled && { opacity: 0.5 }, pressed && onPress ? { opacity: 0.6 } : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.rowIcon, { backgroundColor: withAlpha(iconColor, 0.14) }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={[styles.rowTitle, { color: disabled ? theme.colors.textTertiary : theme.colors.text }]}>{title}</Text>
          {premium && (
            <View style={styles.proBadge}>
              <Ionicons name="star" size={9} color={accents.amber} />
              <Text style={styles.proText}>PRO</Text>
            </View>
          )}
        </View>
        {subtitle && <Text style={[styles.rowSub, { color: theme.colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {rightElement || (onPress && <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />)}
    </Pressable>
  );
}

function SectionLabel({ children, danger }: { children: string; danger?: boolean }) {
  const { theme } = useTheme();
  return <Text style={[styles.sectionLabel, { color: danger ? accents.rose : theme.colors.textTertiary }]}>{children}</Text>;
}

export default function ProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, setThemeMode } = useTheme();
  const { user, userRole, isLoading, isOnline, lastSyncTime, logOut, syncNow, restoreFromCloud } = useAuth();

  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [medicationCount, setMedicationCount] = useState(0);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isSyncing, setIsSyncing] = useState(false);
  const [subscriptionType, setSubscriptionType] = useState<string>("free");
  const [userProfile, setUserProfile] = useState<UserProfile>({});
  const [showProfileEdit, setShowProfileEdit] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (params.edit === "true") {
      setShowProfileEdit(true);
      router.setParams({ edit: undefined });
    }
  }, [params.edit]);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [userRole])
  );

  const loadData = async () => {
    try {
      if (userRole === "doctor") {
        const [savedSettings, profile] = await Promise.all([AsyncStorage.getItem(SETTINGS_KEY), getUserProfile()]);
        setIsPremiumUser(true);
        setMedicationCount(0);
        setSubscriptionType("free");
        setUserProfile(profile);
        if (savedSettings) setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
        return;
      }
      const [premium, medications, subscription, savedSettings, profile] = await Promise.all([
        isPremium(),
        getMedications(),
        getSubscription(),
        AsyncStorage.getItem(SETTINGS_KEY),
        getUserProfile(),
      ]);
      setIsPremiumUser(premium);
      setMedicationCount(medications.length);
      setSubscriptionType(subscription?.type || "free");
      setUserProfile(profile);
      if (savedSettings) setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
    } catch (e) {
      console.error("Error loading profile data:", e);
    }
  };

  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    try {
      await updateUserProfile(updatedProfile);
      setUserProfile(updatedProfile);
      setShowProfileEdit(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch {
      Alert.alert("Error", "Failed to update profile");
    }
  };

  const saveSettings = async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logOut();
          } catch (e: any) {
            Alert.alert("Error", e.message);
          }
        },
      },
    ]);
  };

  const handleSyncNow = async () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to sync your data.");
      return;
    }
    setIsSyncing(true);
    try {
      const result = await syncNow();
      if (result.success) Alert.alert("Success", "Data synced successfully!");
      else Alert.alert("Sync Failed", result.error || "Could not sync data");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = () => {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to restore your data.");
      return;
    }
    Alert.alert("Restore from Cloud", "This will replace your local data with cloud data. Continue?", [
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
            } else Alert.alert("Restore Failed", result.error);
          } finally {
            setIsSyncing(false);
          }
        },
      },
    ]);
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return "Never synced";
    const date = new Date(timestamp);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const subscriptionLabel = (type: string) =>
    ({ premium_monthly: "Premium Monthly", premium_yearly: "Premium Yearly", premium_lifetime: "Premium Lifetime" } as Record<string, string>)[type] || "Free Plan";

  const themeStyles = createStyles(theme);

  return (
    <ScreenBackground>
      <View style={themeStyles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={themeStyles.title}>Profile</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={themeStyles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={themeStyles.block}>
          {user ? (
            <>
              <View style={themeStyles.profileHeader}>
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={themeStyles.avatar} />
                ) : (
                  <View style={themeStyles.avatarPlaceholder}>
                    <Ionicons name="person" size={36} color={theme.colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: spacing.lg }}>
                  <Text style={themeStyles.userName}>{user.displayName || "User"}</Text>
                  <Text style={themeStyles.userEmail}>{user.email}</Text>
                  <View style={themeStyles.statusRow}>
                    <View style={[themeStyles.statusDot, { backgroundColor: isOnline ? accents.emerald : accents.amber }]} />
                    <Text style={themeStyles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
                    <Text style={themeStyles.statusText}> · {formatLastSync(lastSyncTime)}</Text>
                  </View>
                </View>
              </View>
              <View style={themeStyles.profileActions}>
                <Pressable style={[themeStyles.syncBtn, (!isOnline || isSyncing) && { opacity: 0.5 }]} onPress={handleSyncNow} disabled={!isOnline || isSyncing}>
                  {isSyncing ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
                      <Text style={themeStyles.syncBtnText}>Sync</Text>
                    </>
                  )}
                </Pressable>
                <Pressable style={themeStyles.signOutBtn} onPress={handleSignOut}>
                  <Ionicons name="log-out-outline" size={18} color={accents.rose} />
                  <Text style={themeStyles.signOutText}>Sign Out</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: spacing.md }}>
              <View style={themeStyles.avatarPlaceholder}>
                <Ionicons name="cloud-outline" size={36} color={theme.colors.primary} />
              </View>
              <Text style={[themeStyles.userName, { marginTop: spacing.md }]}>Sign in for cloud backup</Text>
              <Text style={themeStyles.userEmail}>Keep your medications synced across devices</Text>
              <GlassButton label="Sign In" icon="log-in-outline" variant="glass" onPress={() => router.push("/auth")} disabled={isLoading} style={{ marginTop: spacing.lg }} />
            </View>
          )}
        </GlassCard>

        {userRole !== "doctor" && (
          <>
            <SectionLabel>SUBSCRIPTION</SectionLabel>
            <GlassCard style={themeStyles.block} padding={0}>
              <View style={themeStyles.subHeader}>
                <View style={[themeStyles.planBadge, { backgroundColor: withAlpha(isPremiumUser ? accents.amber : accents.emerald, 0.14) }]}>
                  <Ionicons name={isPremiumUser ? "star" : "leaf"} size={14} color={isPremiumUser ? accents.amber : accents.emerald} />
                  <Text style={[themeStyles.planText, { color: isPremiumUser ? accents.amber : accents.emerald }]}>{subscriptionLabel(subscriptionType)}</Text>
                </View>
                <Text style={themeStyles.subDetail}>{isPremiumUser ? "Unlimited medications & features" : `${medicationCount}/5 medications used`}</Text>
              </View>
              {!isPremiumUser && (
                <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
                  <GlassButton label="Upgrade to Premium" icon="star" color={accents.amber} onPress={() => router.push("/premium")} />
                </View>
              )}
              <MenuItem icon="people-outline" iconColor={accents.emerald} title="Family Profiles" subtitle="Manage family member medications" onPress={() => router.push("/settings/family")} premium={!isPremiumUser} />
              <MenuItem icon="card-outline" iconColor={accents.violet} title="Manage Subscription" subtitle="View plans and billing" onPress={() => router.push("/premium")} />
              <MenuItem
                icon="refresh-outline"
                iconColor={accents.sky}
                title="Restore Purchases"
                subtitle="Restore previous purchases"
                onPress={() =>
                  Alert.alert("Restore Purchases", "This will check for any existing Stripe subscription linked to your account.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Restore",
                      onPress: async () => {
                        try {
                          const { syncSubscriptionFromServer } = require("../../../utils/stripe");
                          await syncSubscriptionFromServer();
                          const sub = await getSubscription();
                          Alert.alert(sub.type !== "free" ? "Success" : "No Subscription", sub.type !== "free" ? "Your subscription has been restored!" : "No previous subscription found for this account.");
                        } catch (e: any) {
                          Alert.alert("Error", e.message || "Could not restore purchases.");
                        }
                      },
                    },
                  ])
                }
              />
            </GlassCard>
          </>
        )}

        <SectionLabel>PERSONAL INFORMATION</SectionLabel>
        <GlassCard style={themeStyles.block} padding={0}>
          <MenuItem icon="person-outline" iconColor={accents.violet} title="My Profile" subtitle={userProfile.name || "Add your personal details"} onPress={() => setShowProfileEdit(true)} />
          {userRole !== "doctor" && <MenuItem icon="people-outline" iconColor={accents.rose} title="Family Profiles" subtitle="Manage family member profiles" onPress={() => router.push("/settings/family")} />}
          {userProfile.phone && <MenuItem icon="call-outline" iconColor={accents.sky} title="Phone" subtitle={userProfile.phone} />}
          {userProfile.age && <MenuItem icon="calendar-outline" iconColor={accents.teal} title="Age" subtitle={`${userProfile.age} years`} />}
          {userProfile.bloodGroup && <MenuItem icon="water-outline" iconColor={accents.rose} title="Blood Group" subtitle={userProfile.bloodGroup} />}
        </GlassCard>

        {userRole !== "doctor" && (
          <>
            <SectionLabel>MEDICATIONS</SectionLabel>
            <GlassCard style={themeStyles.block} padding={0}>
              <MenuItem icon="download-outline" iconColor={accents.rose} title="Import / Export" subtitle="Backup medications to file" onPress={() => Alert.alert("Export", "Export feature coming soon!")} />
              <MenuItem icon="notifications-outline" iconColor={accents.violet} title="Refill Reminders" subtitle="Manage refill alerts" onPress={() => router.push("/refills")} />
            </GlassCard>

            <SectionLabel>HISTORY & ANALYTICS</SectionLabel>
            <GlassCard style={themeStyles.block} padding={0}>
              <MenuItem icon="analytics-outline" iconColor={accents.teal} title="Analytics Dashboard" subtitle="Adherence stats & trends" premium={!isPremiumUser} disabled={!isPremiumUser} onPress={() => router.push(isPremiumUser ? "/analytics" : "/premium")} />
              <MenuItem icon="document-text-outline" iconColor={accents.amber} title="Export Reports" subtitle="HTML, CSV & JSON reports" premium={!isPremiumUser} disabled={!isPremiumUser} onPress={() => router.push(isPremiumUser ? "/analytics" : "/premium")} />
            </GlassCard>
          </>
        )}

        <SectionLabel>APP SETTINGS</SectionLabel>
        <GlassCard style={themeStyles.block} padding={0}>
          <MenuItem
            icon="notifications-outline"
            iconColor={accents.rose}
            title="Notifications"
            subtitle={settings.notificationsEnabled ? "Enabled" : "Disabled"}
            rightElement={<Switch value={settings.notificationsEnabled} onValueChange={(v) => saveSettings({ ...settings, notificationsEnabled: v })} trackColor={{ false: theme.colors.border, true: accents.emerald }} thumbColor="#fff" />}
          />
          <MenuItem
            icon="finger-print-outline"
            iconColor={accents.violet}
            title="Biometric Lock"
            subtitle="Require authentication to open"
            rightElement={<Switch value={settings.biometricEnabled} onValueChange={(v) => saveSettings({ ...settings, biometricEnabled: v })} trackColor={{ false: theme.colors.border, true: accents.emerald }} thumbColor="#fff" />}
          />
          <MenuItem
            icon="moon-outline"
            iconColor={accents.indigo}
            title="Quiet Hours"
            subtitle={settings.quietHoursEnabled ? `${settings.quietHoursStart} - ${settings.quietHoursEnd}` : "Disabled"}
            premium={!isPremiumUser}
            onPress={() => !isPremiumUser && router.push("/premium")}
            rightElement={
              isPremiumUser ? (
                <Switch value={settings.quietHoursEnabled} onValueChange={(v) => saveSettings({ ...settings, quietHoursEnabled: v })} trackColor={{ false: theme.colors.border, true: accents.emerald }} thumbColor="#fff" />
              ) : (
                <Ionicons name="lock-closed" size={18} color={theme.colors.textTertiary} />
              )
            }
          />
          <MenuItem
            icon="color-palette-outline"
            iconColor={accents.rose}
            title="Theme"
            subtitle={theme.mode.charAt(0).toUpperCase() + theme.mode.slice(1)}
            onPress={() =>
              Alert.alert("Select Theme", "Choose your preferred theme", [
                { text: "Light", onPress: async () => (setThemeMode("light"), saveSettings({ ...settings, theme: "light" })) },
                { text: "Dark", onPress: async () => (setThemeMode("dark"), saveSettings({ ...settings, theme: "dark" })) },
                { text: "Auto", onPress: async () => (setThemeMode("auto"), saveSettings({ ...settings, theme: "system" })) },
                { text: "Cancel", style: "cancel" },
              ])
            }
          />
        </GlassCard>

        <SectionLabel>ABOUT</SectionLabel>
        <GlassCard style={themeStyles.block} padding={0}>
          <MenuItem icon="help-circle-outline" iconColor={theme.colors.textSecondary} title="Help & Support" subtitle="FAQs and contact support" onPress={() => Linking.openURL("https://mediremind.flowentech.com/help-support")} />
          <MenuItem icon="document-outline" iconColor={theme.colors.textSecondary} title="Privacy Policy" onPress={() => Linking.openURL("https://mediremind.flowentech.com/privacy-policy")} />
          <MenuItem icon="shield-checkmark-outline" iconColor={theme.colors.textSecondary} title="Terms of Service" onPress={() => Linking.openURL("https://mediremind.flowentech.com/terms-of-service")} />
          <MenuItem icon="information-circle-outline" iconColor={theme.colors.textSecondary} title="About MediRemind" subtitle="Version 1.0.0" onPress={() => Linking.openURL("https://mediremind.flowentech.com/about")} />
        </GlassCard>

        <SectionLabel danger>DANGER ZONE</SectionLabel>
        <GlassCard style={themeStyles.block} padding={0}>
          <MenuItem
            icon="trash-outline"
            iconColor={accents.rose}
            title="Clear All Data"
            subtitle="Delete all medications and history"
            onPress={() =>
              Alert.alert("Clear All Data", "This will permanently delete all your medications and history. This cannot be undone.", [
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
                    } catch {
                      Alert.alert("Error", "Failed to clear data.");
                    }
                  },
                },
              ])
            }
          />
        </GlassCard>

        <Text style={themeStyles.footer}>Made with ❤️ by Flowentech</Text>
      </ScrollView>

      <Modal animationType="slide" visible={showProfileEdit} presentationStyle="pageSheet" onRequestClose={() => setShowProfileEdit(false)}>
        <ProfileEditModal profile={userProfile} onSave={handleSaveProfile} onClose={() => setShowProfileEdit(false)} />
      </Modal>
    </ScreenBackground>
  );
}

interface ProfileEditModalProps {
  profile: UserProfile;
  onSave: (profile: UserProfile) => void;
  onClose: () => void;
}

function ProfileEditModal({ profile, onSave, onClose }: ProfileEditModalProps) {
  const { theme } = useTheme();
  const [formData, setFormData] = useState<UserProfile>(profile);
  const set = (field: keyof UserProfile, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));
  const m = createStyles(theme);

  const field = (label: string, key: keyof UserProfile, rest: Partial<React.ComponentProps<typeof GlassField>> = {}) => (
    <View style={{ marginBottom: spacing.lg }} key={key as string}>
      <Text style={m.fieldLabel}>{label}</Text>
      <GlassField value={(formData[key] as string) || ""} onChangeText={(v) => set(key, v)} placeholderTextColor={theme.colors.textTertiary} {...rest} />
    </View>
  );

  return (
    <ScreenBackground>
      <View style={m.modalHeader}>
        <GlassIconButton icon="close" onPress={onClose} />
        <Text style={m.title}>Edit Profile</Text>
        <Pressable onPress={() => onSave(formData)} hitSlop={8}>
          <Text style={m.saveLink}>Save</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={m.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <SectionLabel>BASIC INFORMATION</SectionLabel>
        <GlassCard style={m.block}>
          {field("Full Name *", "name", { placeholder: "Enter your full name" })}
          {field("Age", "age", { placeholder: "Enter your age", keyboardType: "number-pad" })}
          {field("Gender", "gender", { placeholder: "Male, Female, Other" })}
          {field("Date of Birth", "dateOfBirth", { placeholder: "YYYY-MM-DD" })}
          {field("Phone Number *", "phone", { placeholder: "+1 234 567 8900", keyboardType: "phone-pad" })}
          {field("Email", "email", { placeholder: "your@email.com", keyboardType: "email-address", autoCapitalize: "none" })}
          {field("Address", "address", { placeholder: "Enter your address", multiline: true })}
        </GlassCard>

        <SectionLabel>HEALTH INFORMATION</SectionLabel>
        <GlassCard style={m.block}>
          {field("Blood Group", "bloodGroup", { placeholder: "e.g., A+, B-, O+" })}
          {field("Allergies", "allergies", { placeholder: "List any known allergies", multiline: true })}
          {field("Chronic Conditions", "chronicConditions", { placeholder: "Diabetes, Hypertension, etc.", multiline: true })}
          {field("Emergency Contact", "emergencyContact", { placeholder: "Contact person name" })}
          {field("Emergency Phone", "emergencyPhone", { placeholder: "Emergency contact phone", keyboardType: "phone-pad" })}
        </GlassCard>

        <View style={m.note}>
          <Ionicons name="information-circle" size={16} color={theme.colors.textSecondary} />
          <Text style={m.noteText}>This information will be auto-filled in your prescriptions</Text>
        </View>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  rowTitle: { ...typography.body, fontSize: 16 },
  rowSub: { ...typography.caption, marginTop: 2 },
  proBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: withAlpha(accents.amber, 0.16), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginLeft: spacing.sm },
  proText: { fontSize: 9, fontWeight: "700", color: accents.amber },
  sectionLabel: { ...typography.caption, fontWeight: "700", letterSpacing: 0.6, marginBottom: spacing.sm, marginLeft: spacing.xs, marginTop: spacing.sm },
});

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    title: { ...typography.h1, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: 120 },
    block: { marginBottom: spacing.lg },
    profileHeader: { flexDirection: "row", alignItems: "center" },
    avatar: { width: 64, height: 64, borderRadius: 32 },
    avatarPlaceholder: { width: 64, height: 64, borderRadius: 32, backgroundColor: withAlpha(theme.colors.primary, 0.12), alignItems: "center", justifyContent: "center" },
    userName: { ...typography.h1, color: theme.colors.text },
    userEmail: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2, textAlign: "center" },
    statusRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { ...typography.caption, color: theme.colors.textSecondary },
    profileActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
    syncBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: accents.emerald, paddingVertical: 12, borderRadius: R.pill },
    syncBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    signOutBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: withAlpha(accents.rose, 0.12), paddingVertical: 12, borderRadius: R.pill },
    signOutText: { color: accents.rose, fontWeight: "700", fontSize: 14 },
    subHeader: { padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    planBadge: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", gap: 6, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: R.pill, marginBottom: spacing.sm },
    planText: { fontSize: 14, fontWeight: "700" },
    subDetail: { ...typography.caption, color: theme.colors.textSecondary },
    footer: { textAlign: "center", ...typography.caption, color: theme.colors.textTertiary, paddingVertical: spacing.xxl },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    saveLink: { ...typography.h2, color: theme.colors.primary },
    fieldLabel: { ...typography.label, color: theme.colors.text, marginBottom: spacing.sm },
    note: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.lg, borderRadius: R.md, backgroundColor: withAlpha(theme.colors.primary, 0.08) },
    noteText: { ...typography.caption, color: theme.colors.textSecondary, flex: 1 },
  });
