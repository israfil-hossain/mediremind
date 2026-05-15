import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import {
  getDoseHistory,
  getMedications,
  DoseHistory,
  Medication,
  clearAllData,
} from "../../../utils/storage";
import { getHistoryLimitDays, isPremium } from "../../../utils/subscription";
import {
  getFamilyProfiles,
  getActiveProfileId,
  setActiveProfile,
  FamilyProfile,
} from "../../../utils/familyProfiles";
import { useTheme } from "../../../contexts/ThemeContext";
import { useAuth } from "../../../contexts/AuthContext";
import MyPatientsScreen from "../../../components/MyPatientsScreen";
import AdBanner from "../../../components/AdBanner";

type EnrichedDoseHistory = DoseHistory & { medication?: Medication };

function PatientHistoryScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [history, setHistory] = useState<EnrichedDoseHistory[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<
    "all" | "taken" | "missed"
  >("all");
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [historyLimitDays, setHistoryLimitDays] = useState(30);
  const [familyProfiles, setFamilyProfiles] = useState<FamilyProfile[]>([]);
  const [activeProfileId, setActiveProfileIdState] = useState<string | null>(null);

  // Check premium status on mount
  useEffect(() => {
    checkPremium();
  }, []);

  const checkPremium = async () => {
    const premium = await isPremium();
    setIsPremiumUser(premium);
  };

  const loadFamilyProfiles = async () => {
    const profiles = await getFamilyProfiles();
    setFamilyProfiles(profiles);
    const activeId = await getActiveProfileId();
    setActiveProfileIdState(activeId);
  };

  const loadHistory = useCallback(async () => {
    try {
      const [doseHistory, medications, premium, limitDays] = await Promise.all([
        getDoseHistory(),
        getMedications(),
        isPremium(),
        getHistoryLimitDays(),
      ]);

      setIsPremiumUser(premium);
      setHistoryLimitDays(limitDays);

      // Load family profiles if premium
      if (premium) {
        await loadFamilyProfiles();
      }

      // Combine history with medication details
      const enrichedHistory = doseHistory.map((dose) => ({
        ...dose,
        medication: medications.find((med) => med.id === dose.medicationId),
      }));

      setHistory(enrichedHistory);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const groupHistoryByDate = () => {
    const grouped = history.reduce((acc, dose) => {
      const date = new Date(dose.timestamp).toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(dose);
      return acc;
    }, {} as Record<string, EnrichedDoseHistory[]>);

    return Object.entries(grouped).sort(
      (a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  };

  const filteredHistory = history.filter((dose) => {
    if (selectedFilter === "all") return true;
    if (selectedFilter === "taken") return dose.taken;
    if (selectedFilter === "missed") return !dose.taken;
    return true;
  });

  const groupedHistory = groupHistoryByDate();

  const handleClearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to clear all medication data? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllData();
              await loadHistory();
              Alert.alert("Success", "All data has been cleared successfully");
            } catch (error) {
              console.error("Error clearing data:", error);
              Alert.alert("Error", "Failed to clear data. Please try again.");
            }
          },
        },
      ]
    );
  };

  // If premium user, show Family Care Dashboard
  if (isPremiumUser) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.primaryDark]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />

        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Family Care</Text>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Family Profiles Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Family Members</Text>
                <TouchableOpacity onPress={() => router.push("/settings/family")}>
                  <Text style={styles.manageButton}>Manage</Text>
                </TouchableOpacity>
              </View>

              {familyProfiles.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={64} color={theme.colors.borderLight} />
                  <Text style={styles.emptyStateText}>
                    No family profiles yet
                  </Text>
                  <TouchableOpacity
                    style={styles.addProfileButton}
                    onPress={() => router.push("/settings/family")}
                  >
                    <Text style={styles.addProfileButtonText}>
                      Add Family Member
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.profilesGrid}>
                  {familyProfiles.map((profile) => {
                    const isActive = profile.id === activeProfileId;
                    return (
                      <TouchableOpacity
                        key={profile.id}
                        style={[
                          styles.profileCard,
                          isActive && styles.activeProfileCard,
                        ]}
                        onPress={async () => {
                          await setActiveProfile(profile.id);
                          setActiveProfileIdState(profile.id);
                        }}
                      >
                        <View
                          style={[
                            styles.profileAvatar,
                            { backgroundColor: isActive ? theme.colors.primary : theme.colors.borderLight },
                          ]}
                        >
                          <Ionicons
                            name="person"
                            size={24}
                            color={isActive ? "white" : theme.colors.textSecondary}
                          />
                        </View>
                        <Text style={styles.profileName}>{profile.name}</Text>
                        <Text style={styles.profileRelationship}>
                          {profile.relationship}
                        </Text>
                        {isActive && (
                          <View style={styles.activeIndicator}>
                            <Ionicons name="checkmark-circle" size={16} color={theme.colors.success} />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Quick Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <Ionicons name="medical" size={28} color={theme.colors.primary} />
                  <Text style={styles.statValue}>{history.filter(h => h.taken).length}</Text>
                  <Text style={styles.statLabel}>Doses Taken</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="time" size={28} color={theme.colors.warning} />
                  <Text style={styles.statValue}>{history.filter(h => !h.taken).length}</Text>
                  <Text style={styles.statLabel}>Missed</Text>
                </View>
                <View style={styles.statCard}>
                  <Ionicons name="people" size={28} color={theme.colors.success} />
                  <Text style={styles.statValue}>{familyProfiles.length}</Text>
                  <Text style={styles.statLabel}>Members</Text>
                </View>
              </View>
            </View>

            {/* Email Notification Info */}
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="mail-outline" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoTitle}>Automated Care Alerts</Text>
                  <Text style={styles.infoDescription}>
                    Family members with email addresses receive automatic notifications when medications are missed by more than 30 minutes, ensuring timely intervention and medication adherence.
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/settings/family")}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="people-outline" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>Manage Family Profiles</Text>
                  <Text style={styles.actionSubtitle}>
                    Add, edit, or remove family members
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textTertiary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => router.push("/history/view")}
              >
                <View style={styles.actionIcon}>
                  <Ionicons name="time-outline" size={24} color={theme.colors.primary} />
                </View>
                <View style={styles.actionContent}>
                  <Text style={styles.actionTitle}>View Full History</Text>
                  <Text style={styles.actionSubtitle}>
                    See all medication history
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color={theme.colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // Regular History for free users
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1a8e2d", "#146922"]}
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#1a8e2d" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>History Log</Text>
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "all" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("all")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === "all" && styles.filterTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "taken" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("taken")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === "taken" && styles.filterTextActive,
                ]}
              >
                Taken
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                selectedFilter === "missed" && styles.filterButtonActive,
              ]}
              onPress={() => setSelectedFilter("missed")}
            >
              <Text
                style={[
                  styles.filterText,
                  selectedFilter === "missed" && styles.filterTextActive,
                ]}
              >
                Missed
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {!isPremiumUser && historyLimitDays !== Infinity && (
          <View style={styles.upgradeBanner}>
            <View style={styles.upgradeBannerContent}>
              <Ionicons name="time-outline" size={24} color="#1a8e2d" />
              <View style={styles.upgradeBannerText}>
                <Text style={styles.upgradeBannerTitle}>
                  View Full History
                </Text>
                <Text style={styles.upgradeBannerDescription}>
                  Free version shows last {historyLimitDays} days. Upgrade to Premium for unlimited history.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => router.push("/premium")}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView
          style={styles.historyContainer}
          showsVerticalScrollIndicator={false}
        >
          {groupedHistory.map(([date, doses]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>
                {new Date(date).toLocaleDateString("default", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
              {doses.map((dose) => (
                <View key={dose.id} style={styles.historyCard}>
                  <View
                    style={[
                      styles.medicationColor,
                      { backgroundColor: dose.medication?.color || "#ccc" },
                    ]}
                  />
                  <View style={styles.medicationInfo}>
                    <Text style={styles.medicationName}>
                      {dose.medication?.name || "Unknown Medication"}
                    </Text>
                    <Text style={styles.medicationDosage}>
                      {dose.medication?.dosage}
                    </Text>
                    <Text style={styles.timeText}>
                      {new Date(dose.timestamp).toLocaleTimeString("default", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <View style={styles.statusContainer}>
                    {dose.taken ? (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: "#E8F5E9" },
                        ]}
                      >
                        <Ionicons
                          name="checkmark-circle"
                          size={16}
                          color="#4CAF50"
                        />
                        <Text style={[styles.statusText, { color: "#4CAF50" }]}>
                          Taken
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: "#FFEBEE" },
                        ]}
                      >
                        <Ionicons
                          name="close-circle"
                          size={16}
                          color="#F44336"
                        />
                        <Text style={[styles.statusText, { color: "#F44336" }]}>
                          Missed
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}

          <View style={styles.clearDataContainer}>
            <TouchableOpacity
              style={styles.clearDataButton}
              onPress={handleClearAllData}
            >
              <Ionicons name="trash-outline" size={20} color="#FF5252" />
              <Text style={styles.clearDataText}>Clear All Data</Text>
            </TouchableOpacity>
          </View>

          {/* Banner Ad for Free Users */}
          <AdBanner />
        </ScrollView>
      </View>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 140 : 120,
  },
  content: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "white",
    marginLeft: 15,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: theme.colors.background,
    paddingTop: 10,
  },
  filtersScroll: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    marginRight: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterButtonActive: {
    backgroundColor: "#1a8e2d",
    borderColor: "#1a8e2d",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  filterTextActive: {
    color: "white",
  },
  historyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: theme.colors.background,
  },
  dateGroup: {
    marginBottom: 25,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medicationColor: {
    width: 12,
    height: 40,
    borderRadius: 6,
    marginRight: 16,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  timeText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  statusContainer: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: "600",
  },
  clearDataContainer: {
    padding: 20,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 40,
  },
  clearDataButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFEBEE",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },
  clearDataText: {
    color: "#FF5252",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  upgradeBanner: {
    backgroundColor: "#E8F5E9",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  upgradeBannerContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  upgradeBannerText: {
    flex: 1,
    marginLeft: 12,
  },
  upgradeBannerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  upgradeBannerDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: "#1a8e2d",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  upgradeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  // Family Care Dashboard Styles
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.text,
  },
  manageButton: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a8e2d",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 12,
    marginBottom: 20,
  },
  addProfileButton: {
    backgroundColor: "#1a8e2d",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  addProfileButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  profilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  profileCard: {
    width: "31%",
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: "relative",
  },
  activeProfileCard: {
    borderColor: "#1a8e2d",
    borderWidth: 2,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  profileName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
    marginBottom: 2,
  },
  profileRelationship: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  activeIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
});

// Main component that shows different screens based on role
export default function HistoryScreen() {
  const { userRole } = useAuth();

  if (userRole === "doctor") {
    return <MyPatientsScreen />;
  }

  return <PatientHistoryScreen />;
}
