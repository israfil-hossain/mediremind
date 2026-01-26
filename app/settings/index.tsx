import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../contexts/AuthContext";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    user,
    isLoading,
    isOnline,
    lastSyncTime,
    signIn,
    logOut,
    syncNow,
    restoreFromCloud,
  } = useAuth();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSignIn = async () => {
    try {
      await signIn();
      Alert.alert("Success", "Signed in successfully! Your data will now sync to the cloud.");
    } catch (error: any) {
      Alert.alert(
        "Sign In Failed",
        error.message || "Could not sign in with Google"
      );
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out? Your data will remain on this device but won't sync to the cloud.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await logOut();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Could not sign out");
            }
          },
        },
      ]
    );
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      const result = await syncNow();
      if (result.success) {
        Alert.alert("Success", "Data synced to cloud successfully!");
      } else {
        Alert.alert("Sync Failed", result.error || "Could not sync data");
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestoreFromCloud = async () => {
    Alert.alert(
      "Restore from Cloud",
      "This will replace your local data with data from the cloud. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            setIsRestoring(true);
            try {
              const result = await restoreFromCloud();
              if (result.success) {
                Alert.alert(
                  "Success",
                  "Data restored from cloud successfully!"
                );
              } else {
                Alert.alert(
                  "Restore Failed",
                  result.error || "Could not restore data"
                );
              }
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  };

  const formatLastSync = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          {/* Account Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account & Backup</Text>

            <View style={styles.card}>
              {user ? (
                <>
                  {/* Signed In State */}
                  <View style={styles.userInfo}>
                    {user.photoURL ? (
                      <Image
                        source={{ uri: user.photoURL }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={32} color="#4CAF50" />
                      </View>
                    )}
                    <View style={styles.userDetails}>
                      <Text style={styles.userName}>
                        {user.displayName || "User"}
                      </Text>
                      <Text style={styles.userEmail}>{user.email}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        isOnline ? styles.online : styles.offline,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          isOnline ? styles.onlineDot : styles.offlineDot,
                        ]}
                      />
                      <Text style={styles.statusText}>
                        {isOnline ? "Online" : "Offline"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.syncInfo}>
                    <Ionicons name="time-outline" size={16} color="#666" />
                    <Text style={styles.syncText}>
                      Last sync: {formatLastSync(lastSyncTime)}
                    </Text>
                  </View>

                  <View style={styles.buttonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.syncButton,
                        (!isOnline || isSyncing) && styles.disabledButton,
                      ]}
                      onPress={handleSyncNow}
                      disabled={!isOnline || isSyncing}
                    >
                      {isSyncing ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="cloud-upload-outline"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.actionButtonText}>Sync Now</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        styles.restoreButton,
                        (!isOnline || isRestoring) && styles.disabledButton,
                      ]}
                      onPress={handleRestoreFromCloud}
                      disabled={!isOnline || isRestoring}
                    >
                      {isRestoring ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="cloud-download-outline"
                            size={20}
                            color="#fff"
                          />
                          <Text style={styles.actionButtonText}>Restore</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={styles.signOutButton}
                    onPress={handleSignOut}
                    disabled={isLoading}
                  >
                    <Ionicons name="log-out-outline" size={20} color="#E53935" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Signed Out State */}
                  <View style={styles.signInPrompt}>
                    <Ionicons name="cloud-outline" size={48} color="#4CAF50" />
                    <Text style={styles.signInTitle}>Cloud Backup</Text>
                    <Text style={styles.signInDescription}>
                      Sign in with Google to backup your medications and history
                      to the cloud. Your data will sync automatically when
                      online.
                    </Text>

                    <TouchableOpacity
                      style={styles.googleButton}
                      onPress={handleSignIn}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#333" size="small" />
                      ) : (
                        <>
                          <Image
                            source={{
                              uri: "https://www.google.com/favicon.ico",
                            }}
                            style={styles.googleIcon}
                          />
                          <Text style={styles.googleButtonText}>
                            Sign in with Google
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How Sync Works</Text>
            <View style={styles.card}>
              <View style={styles.infoItem}>
                <Ionicons name="wifi-outline" size={24} color="#4CAF50" />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Online</Text>
                  <Text style={styles.infoDescription}>
                    Data syncs automatically to Firebase
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={24}
                  color="#FF9800"
                />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Offline</Text>
                  <Text style={styles.infoDescription}>
                    Data saved locally, syncs when back online
                  </Text>
                </View>
              </View>

              <View style={styles.infoItem}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#2196F3" />
                <View style={styles.infoText}>
                  <Text style={styles.infoTitle}>Secure</Text>
                  <Text style={styles.infoDescription}>
                    Your data is encrypted and private
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#f5f5f5",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  userDetails: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  online: {
    backgroundColor: "#E8F5E9",
  },
  offline: {
    backgroundColor: "#FFF3E0",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  onlineDot: {
    backgroundColor: "#4CAF50",
  },
  offlineDot: {
    backgroundColor: "#FF9800",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
  },
  syncInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },
  syncText: {
    fontSize: 13,
    color: "#666",
    marginLeft: 8,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  syncButton: {
    backgroundColor: "#4CAF50",
  },
  restoreButton: {
    backgroundColor: "#2196F3",
  },
  disabledButton: {
    opacity: 0.5,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FFEBEE",
    gap: 8,
  },
  signOutText: {
    color: "#E53935",
    fontSize: 14,
    fontWeight: "600",
  },
  signInPrompt: {
    alignItems: "center",
    paddingVertical: 24,
  },
  signInTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  signInDescription: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoText: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  infoDescription: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
});
