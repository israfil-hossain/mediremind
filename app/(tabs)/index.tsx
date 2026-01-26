import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Alert,
  AppState,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import PremiumModal from "../../components/PremiumModal";
import {
  getMedications,
  Medication,
  getTodaysDoses,
  recordDose,
  DoseHistory,
} from "../../utils/storage";
import { useFocusEffect } from "@react-navigation/native";
import {
  registerForPushNotificationsAsync,
  scheduleMedicationReminder,
} from "../../utils/notifications";
import { getMedicationLimit, isPremium } from "../../utils/subscription";
import { getCurrentUser } from "../../utils/firebase";
import { useTheme } from "../../contexts/ThemeContext";

const { width } = Dimensions.get("window");

// Create animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const QUICK_ACTIONS = [
  {
    icon: "add-circle-outline" as const,
    label: "Add\nMedication",
    route: "/medications/add" as const,
    color: "#2E7D32",
    gradient: ["#4CAF50", "#2E7D32"] as [string, string],
  },
  {
    icon: "document-text-outline" as const,
    label: "Prescription\nHistory",
    route: "/(tabs)/prescriptions" as const,
    color: "#5E35B1",
    gradient: ["#7C4DFF", "#5E35B1"] as [string, string],
  },
  {
    icon: "calendar-outline" as const,
    label: "Calendar\nView",
    route: "/(tabs)/calendar" as const,
    color: "#1976D2",
    gradient: ["#2196F3", "#1976D2"] as [string, string],
  },
  {
    icon: "time-outline" as const,
    label: "History\nLog",
    route: "/(tabs)/history" as const,
    color: "#C2185B",
    gradient: ["#E91E63", "#C2185B"] as [string, string],
  },
];

interface CircularProgressProps {
  progress: number;
  totalDoses: number;
  completedDoses: number;
  styles: any;
}

function CircularProgress({
  progress,
  totalDoses,
  completedDoses,
  styles,
}: CircularProgressProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const size = width * 0.55;
  const strokeWidth = 15;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1500,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTextContainer}>
        <Text style={styles.progressPercentage}>
          {Math.round(progress * 100)}%
        </Text>
        <Text style={styles.progressDetails}>
          {completedDoses} of {totalDoses} doses
        </Text>
      </View>
      <Svg width={size} height={size} style={styles.progressRing}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="white"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
    </View>
  );
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [medicationLimit, setMedicationLimit] = useState(5);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.replace("/auth");
          return;
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.replace("/auth");
      } finally {
        setIsCheckingAuth(false);
      }
    };
    checkAuth();
  }, []);

  const loadMedications = useCallback(async () => {
    try {
      const [allMedications, todaysDoses, premium, limit] = await Promise.all([
        getMedications(),
        getTodaysDoses(),
        isPremium(),
        getMedicationLimit(),
      ]);

      setIsPremiumUser(premium);
      setMedicationLimit(limit);
      setDoseHistory(todaysDoses);
      setMedications(allMedications);

      // Show upgrade prompt if user has 3+ medications and is not premium
      if (allMedications.length >= 3 && !premium && limit !== Infinity) {
        setShowUpgradePrompt(true);
      } else {
        setShowUpgradePrompt(false);
      }

      // Filter medications for today
      const today = new Date();
      const todayMeds = allMedications.filter((med) => {
        const startDate = new Date(med.startDate);
        const durationDays = parseInt(med.duration.split(" ")[0]);

        // For ongoing medications or if within duration
        if (
          durationDays === -1 ||
          (today >= startDate &&
            today <=
              new Date(
                startDate.getTime() + durationDays * 24 * 60 * 60 * 1000
              ))
        ) {
          return true;
        }
        return false;
      });

      setTodaysMedications(todayMeds);

      // Calculate completed doses
      const completed = todaysDoses.filter((dose) => dose.taken).length;
      setCompletedDoses(completed);
    } catch (error) {
      console.error("Error loading medications:", error);
    }
  }, []);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) {
        console.log("Failed to get push notification token");
        return;
      }

      // Schedule reminders for all medications
      const medications = await getMedications();
      for (const medication of medications) {
        if (medication.reminderEnabled) {
          await scheduleMedicationReminder(medication);
        }
      }
    } catch (error) {
      console.error("Error setting up notifications:", error);
    }
  };

  // Use useEffect for initial load
  useEffect(() => {
    loadMedications();
    setupNotifications();

    // Handle app state changes for notifications
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        loadMedications();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Use useFocusEffect for subsequent updates
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = () => {
        // Cleanup if needed
      };

      loadMedications();
      return () => unsubscribe();
    }, [loadMedications])
  );

  const handleTakeDose = async (medication: Medication) => {
    try {
      await recordDose(medication.id, true, new Date().toISOString());
      await loadMedications(); // Reload data after recording dose
    } catch (error) {
      console.error("Error recording dose:", error);
      Alert.alert("Error", "Failed to record dose. Please try again.");
    }
  };

  const isDoseTaken = (medicationId: string) => {
    return doseHistory.some(
      (dose) => dose.medicationId === medicationId && dose.taken
    );
  };

  const progress =
    todaysMedications.length > 0
      ? completedDoses / (todaysMedications.length * 2)
      : 0;

  const styles = createStyles(theme);

  // Show loading while checking authentication
  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[theme.colors.primary, theme.colors.primaryDark]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={styles.flex1}>
              <Text style={styles.greeting}>Daily Progress</Text>
            </View>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => setShowNotifications(true)}
            >
              <Ionicons name="notifications-outline" size={24} color="white" />
              {todaysMedications.length > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>
                    {todaysMedications.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notificationButton}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Ionicons name="person-circle-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
          <CircularProgress
            progress={progress}
            totalDoses={todaysMedications.length * 2}
            completedDoses={completedDoses}
            styles={styles}
          />
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Link href={action.route} key={action.label} asChild>
                <TouchableOpacity style={styles.actionButton}>
                  <LinearGradient
                    colors={action.gradient}
                    style={styles.actionGradient}
                  >
                    <View style={styles.actionContent}>
                      <View style={styles.actionIcon}>
                        <Ionicons name={action.icon} size={28} color="white" />
                      </View>
                      <Text style={styles.actionLabel}>{action.label}</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
        </View>

        {showUpgradePrompt && (
          <View style={styles.upgradePrompt}>
            <View style={styles.upgradePromptContent}>
              <Ionicons name="star" size={24} color={theme.colors.warning} />
              <View style={styles.upgradePromptText}>
                <Text style={styles.upgradePromptTitle}>
                  Unlock Unlimited Medications
                </Text>
                <Text style={styles.upgradePromptDescription}>
                  You've added {medications.length} medications. Upgrade to Premium for unlimited medications and advanced features.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.upgradePromptClose}
                onPress={() => setShowUpgradePrompt(false)}
              >
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.upgradePromptButton}
              onPress={() => router.push("/premium")}
            >
              <Text style={styles.upgradePromptButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <Link href="/(tabs)/calendar" asChild>
              <TouchableOpacity>
                <Text style={styles.seeAllButton}>See All</Text>
              </TouchableOpacity>
            </Link>
          </View>
          {todaysMedications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="medical-outline" size={48} color={theme.colors.borderLight} />
              <Text style={styles.emptyStateText}>
                No medications scheduled for today
              </Text>
              <Link href="/medications/add" asChild>
                <TouchableOpacity style={styles.addMedicationButton}>
                  <Text style={styles.addMedicationButtonText}>
                    Add Medication
                  </Text>
                </TouchableOpacity>
              </Link>
            </View>
          ) : (
            todaysMedications.map((medication) => {
              const taken = isDoseTaken(medication.id);
              return (
                <View key={medication.id} style={styles.doseCard}>
                  <View
                    style={[
                      styles.doseBadge,
                      { backgroundColor: `${medication.color}15` },
                    ]}
                  >
                    <Ionicons
                      name="medical"
                      size={24}
                      color={medication.color}
                    />
                  </View>
                  <View style={styles.doseInfo}>
                    <View>
                      <Text style={styles.medicineName}>{medication.name}</Text>
                      <Text style={styles.dosageInfo}>{medication.dosage}</Text>
                    </View>
                    <View style={styles.doseTime}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.timeText}>{medication.times[0]}</Text>
                    </View>
                  </View>
                  {taken ? (
                    <View style={[styles.takenBadge]}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.colors.success}
                      />
                      <Text style={styles.takenText}>Taken</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.takeDoseButton,
                        { backgroundColor: medication.color },
                      ]}
                      onPress={() => handleTakeDose(medication)}
                    >
                      <Text style={styles.takeDoseText}>Take</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </View>

      <PremiumModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Today's Medications"
        subtitle={`${todaysMedications.length} medication${todaysMedications.length !== 1 ? 's' : ''} scheduled`}
        headerIcon="notifications"
        size="medium"
        scrollable={true}
      >
        <View style={styles.notificationsList}>
          {todaysMedications.length === 0 ? (
            <View style={styles.emptyNotifications}>
              <Ionicons name="checkmark-circle-outline" size={64} color={theme.colors.success} />
              <Text style={styles.emptyNotificationsTitle}>All Clear!</Text>
              <Text style={styles.emptyNotificationsText}>
                No medications scheduled for today
              </Text>
            </View>
          ) : (
            todaysMedications.map((medication) => (
              <View key={medication.id} style={styles.notificationItem}>
                <View style={[styles.notificationIcon, { backgroundColor: `${medication.color}15` }]}>
                  <Ionicons name="medical" size={24} color={medication.color} />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>
                    {medication.name}
                  </Text>
                  <Text style={styles.notificationMessage}>
                    {medication.dosage}
                  </Text>
                  <View style={styles.notificationTimeContainer}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.textTertiary} />
                    <Text style={styles.notificationTime}>
                      {medication.times[0]}
                    </Text>
                  </View>
                </View>
                <View style={styles.notificationBadgeContainer}>
                  {isDoseTaken(medication.id) ? (
                    <View style={styles.takenBadgeSmall}>
                      <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Ionicons name="ellipse" size={12} color={theme.colors.warning} />
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </PremiumModal>
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 25,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
  quickActionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 15,
  },
  actionButton: {
    width: (width - 52) / 2,
    height: 110,
    borderRadius: 16,
    overflow: "hidden",
  },
  actionGradient: {
    flex: 1,
    padding: 15,
  },
  actionContent: {
    flex: 1,
    justifyContent: "space-between",
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
    marginTop: 8,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 5,
  },
  seeAllButton: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  doseCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  doseBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  doseInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  medicineName: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  dosageInfo: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  doseTime: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    marginLeft: 5,
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  takeDoseButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 15,
    marginLeft: 10,
  },
  takeDoseText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  progressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  progressTextContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  progressPercentage: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
  },
  progressLabel: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
  },
  progressRing: {
    transform: [{ rotate: "-90deg" }],
  },
  flex1: {
    flex: 1,
  },
  notificationButton: {
    position: "relative",
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    marginLeft: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: theme.colors.primaryDark,
    paddingHorizontal: 4,
  },
  notificationCount: {
    color: "white",
    fontSize: 11,
    fontWeight: "bold",
  },
  progressDetails: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
  },
  notificationsList: {
    gap: 12,
  },
  emptyNotifications: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyNotificationsTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyNotificationsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 6,
  },
  notificationTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  notificationTime: {
    fontSize: 13,
    color: theme.colors.textTertiary,
  },
  notificationBadgeContainer: {
    marginLeft: 8,
  },
  takenBadgeSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.isDark ? "rgba(76, 175, 80, 0.2)" : "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  pendingBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.isDark ? "rgba(255, 152, 0, 0.2)" : "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 30,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 10,
    marginBottom: 20,
  },
  addMedicationButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addMedicationButtonText: {
    color: "white",
    fontWeight: "600",
  },
  takenBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.isDark ? "rgba(76, 175, 80, 0.2)" : "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginLeft: 10,
  },
  takenText: {
    color: theme.colors.success,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 4,
  },
  upgradePrompt: {
    backgroundColor: theme.isDark ? "rgba(255, 152, 0, 0.15)" : "#FFF3E0",
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.isDark ? "rgba(255, 152, 0, 0.3)" : "#FFE0B2",
  },
  upgradePromptContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  upgradePromptText: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  upgradePromptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4,
  },
  upgradePromptDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  upgradePromptClose: {
    padding: 4,
  },
  upgradePromptButton: {
    backgroundColor: theme.colors.warning,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  upgradePromptButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
});
