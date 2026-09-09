import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassButton, GlassCard, GlassIconButton, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";

export default function SettingsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { user, isLoading, isOnline, lastSyncTime, signIn, logOut, syncNow, restoreFromCloud } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSignIn = async () => {
    try {
      await signIn();
      Alert.alert("Success", "Signed in successfully! Your data will now sync to the cloud.");
    } catch (e: any) {
      Alert.alert("Sign In Failed", e.message || "Could not sign in with Google");
    }
  };

  const handleSignOut = () =>
    Alert.alert("Sign Out", "Are you sure you want to sign out? Your data will remain on this device but won't sync to the cloud.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await logOut();
          } catch (e: any) {
            Alert.alert("Error", e.message || "Could not sign out");
          }
        },
      },
    ]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const result = await syncNow();
      Alert.alert(result.success ? "Success" : "Sync Failed", result.success ? "Data synced to cloud successfully!" : result.error || "Could not sync data");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = () =>
    Alert.alert("Restore from Cloud", "This will replace your local data with data from the cloud. Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Restore",
        style: "destructive",
        onPress: async () => {
          setIsRestoring(true);
          try {
            const result = await restoreFromCloud();
            Alert.alert(result.success ? "Success" : "Restore Failed", result.success ? "Data restored from cloud successfully!" : result.error || "Could not restore data");
          } finally {
            setIsRestoring(false);
          }
        },
      },
    ]);

  const infoItems = [
    { icon: "wifi-outline" as const, title: "Online", desc: "Data syncs automatically to Firebase", color: accents.emerald },
    { icon: "cloud-offline-outline" as const, title: "Offline", desc: "Data saved locally, syncs when back online", color: accents.amber },
    { icon: "shield-checkmark-outline" as const, title: "Secure", desc: "Your data is encrypted and private", color: accents.sky },
  ];

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>ACCOUNT & BACKUP</Text>
        <GlassCard style={styles.block}>
          {user ? (
            <>
              <View style={styles.userInfo}>
                {user.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={28} color={theme.colors.primary} />
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.userName}>{user.displayName || "User"}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: withAlpha(isOnline ? accents.emerald : accents.amber, 0.14) }]}>
                  <View style={[styles.statusDot, { backgroundColor: isOnline ? accents.emerald : accents.amber }]} />
                  <Text style={styles.statusText}>{isOnline ? "Online" : "Offline"}</Text>
                </View>
              </View>

              <View style={styles.syncInfo}>
                <Ionicons name="time-outline" size={15} color={theme.colors.textSecondary} />
                <Text style={styles.syncText}>Last sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : "Never"}</Text>
              </View>

              <View style={styles.buttonGroup}>
                <Pressable style={[styles.actionBtn, { backgroundColor: accents.emerald }, (!isOnline || isSyncing) && { opacity: 0.5 }]} onPress={handleSyncNow} disabled={!isOnline || isSyncing}>
                  {isSyncing ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="cloud-upload-outline" size={18} color="#fff" /><Text style={styles.actionText}>Sync Now</Text></>}
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: accents.sky }, (!isOnline || isRestoring) && { opacity: 0.5 }]} onPress={handleRestoreFromCloud} disabled={!isOnline || isRestoring}>
                  {isRestoring ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="cloud-download-outline" size={18} color="#fff" /><Text style={styles.actionText}>Restore</Text></>}
                </Pressable>
              </View>

              <Pressable style={styles.signOutBtn} onPress={handleSignOut} disabled={isLoading}>
                <Ionicons name="log-out-outline" size={18} color={accents.rose} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </Pressable>
            </>
          ) : (
            <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="cloud-outline" size={30} color={theme.colors.primary} />
              </View>
              <Text style={styles.signInTitle}>Cloud Backup</Text>
              <Text style={styles.signInDesc}>Sign in with Google to backup your medications and history to the cloud. Your data syncs automatically when online.</Text>
              <GlassButton label="Sign in with Google" icon="logo-google" variant="glass" onPress={handleSignIn} disabled={isLoading} style={{ marginTop: spacing.lg }} />
            </View>
          )}
        </GlassCard>

        <Text style={styles.sectionTitle}>HOW SYNC WORKS</Text>
        <GlassCard style={styles.block} padding={0}>
          {infoItems.map((item, i) => (
            <View key={item.title} style={[styles.infoItem, i < infoItems.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border }]}>
              <View style={[styles.infoIcon, { backgroundColor: withAlpha(item.color, 0.14) }]}>
                <Ionicons name={item.icon} size={20} color={item.color} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.infoTitle}>{item.title}</Text>
                <Text style={styles.infoDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
    title: { ...typography.h1, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    sectionTitle: { ...typography.caption, fontWeight: "700", letterSpacing: 0.6, color: theme.colors.textTertiary, marginBottom: spacing.sm, marginLeft: spacing.xs },
    block: { marginBottom: spacing.xl },
    userInfo: { flexDirection: "row", alignItems: "center", marginBottom: spacing.lg },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: withAlpha(theme.colors.primary, 0.12), alignItems: "center", justifyContent: "center" },
    userName: { ...typography.h1, color: theme.colors.text },
    userEmail: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 12, fontWeight: "600", color: theme.colors.textSecondary },
    syncInfo: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, marginBottom: spacing.lg },
    syncText: { ...typography.caption, color: theme.colors.textSecondary },
    buttonGroup: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 12, borderRadius: R.pill },
    actionText: { color: "#fff", fontSize: 14, fontWeight: "700" },
    signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 12, borderRadius: R.pill, backgroundColor: withAlpha(accents.rose, 0.12) },
    signOutText: { color: accents.rose, fontSize: 14, fontWeight: "700" },
    signInTitle: { ...typography.h1, color: theme.colors.text, marginTop: spacing.md },
    signInDesc: { ...typography.caption, color: theme.colors.textSecondary, textAlign: "center", lineHeight: 19, marginTop: spacing.xs },
    infoItem: { flexDirection: "row", alignItems: "center", padding: spacing.lg },
    infoIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    infoTitle: { ...typography.h2, color: theme.colors.text },
    infoDesc: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
  });
