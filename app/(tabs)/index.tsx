import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import AdBanner from "../../components/AdBanner";
import DoctorDashboard from "../../components/DoctorDashboard";
import PremiumModal from "../../components/PremiumModal";
import { GlassCard, GlassIconButton, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { getCurrentUser } from "../../utils/firebase";
import { registerForPushNotificationsAsync, scheduleMedicationReminder } from "../../utils/notifications";
import { DoseHistory, getMedications, getTodaysDoses, Medication, recordDose } from "../../utils/storage";
import { getMedicationLimit, isPremium } from "../../utils/subscription";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const QUICK_ACTIONS = [
  { icon: "add" as const, label: "Add", route: "/medications/add" as const, color: accents.emerald },
  { icon: "document-text-outline" as const, label: "Prescriptions", route: "/(tabs)/prescriptions" as const, color: accents.violet },
  { icon: "calendar-outline" as const, label: "Calendar", route: "/(tabs)/calendar" as const, color: accents.sky },
  { icon: "time-outline" as const, label: "History", route: "/history/view" as const, color: accents.rose },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function ProgressRing({ progress, completed, total }: { progress: number; completed: number; total: number }) {
  const { theme } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const size = 172;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    Animated.timing(anim, { toValue: progress, duration: 1200, useNativeDriver: true }).start();
  }, [progress]);

  const offset = anim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={withAlpha(theme.colors.text, 0.08)} strokeWidth={strokeWidth} fill="none" />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={accents.emerald}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      </View>
      <Text style={{ fontSize: 40, fontWeight: "800", color: theme.colors.text }}>{Math.round(progress * 100)}%</Text>
      <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 }}>
        {completed} of {total} doses
      </Text>
    </View>
  );
}

function PatientHomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [todaysMedications, setTodaysMedications] = useState<Medication[]>([]);
  const [completedDoses, setCompletedDoses] = useState(0);
  const [doseHistory, setDoseHistory] = useState<DoseHistory[]>([]);
  const [medicationLimit, setMedicationLimit] = useState(5);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        if (!user) router.replace("/auth");
      })
      .catch(() => router.replace("/auth"))
      .finally(() => setIsCheckingAuth(false));
  }, []);

  const loadMedications = useCallback(async () => {
    try {
      const [allMedications, todaysDoses, premium, limit] = await Promise.all([
        getMedications(),
        getTodaysDoses(),
        isPremium(),
        getMedicationLimit(),
      ]);
      setMedicationLimit(limit);
      setDoseHistory(todaysDoses);
      setMedications(allMedications);
      setShowUpgradePrompt(allMedications.length >= 3 && !premium && limit !== Infinity);

      const today = new Date();
      const todayMeds = allMedications.filter((med) => {
        const startDate = new Date(med.startDate);
        const durationDays = parseInt(med.duration.split(" ")[0]);
        return (
          durationDays === -1 ||
          (today >= startDate && today <= new Date(startDate.getTime() + durationDays * 86400000))
        );
      });
      setTodaysMedications(todayMeds);
      setCompletedDoses(todaysDoses.filter((dose) => dose.taken).length);
    } catch {}
  }, []);

  const setupNotifications = async () => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (!token) return;
      const meds = await getMedications();
      for (const medication of meds) {
        if (medication.reminderEnabled) await scheduleMedicationReminder(medication);
      }
    } catch {}
  };

  useEffect(() => {
    loadMedications();
    setupNotifications();
    const subscription = AppState.addEventListener("change", (next) => {
      if (next === "active") loadMedications();
    });
    return () => subscription.remove();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMedications();
    }, [])
  );

  const handleTakeDose = async (medication: Medication) => {
    try {
      await recordDose(medication.id, true, new Date().toISOString());
      await loadMedications();
    } catch {
      Alert.alert("Error", "Failed to record dose. Please try again.");
    }
  };

  const isDoseTaken = (medicationId: string) => doseHistory.some((d) => d.medicationId === medicationId && d.taken);

  const totalDoses = todaysMedications.length * 2;
  const progress = totalDoses > 0 ? completedDoses / totalDoses : 0;
  const styles = createStyles(theme);

  if (isCheckingAuth) {
    return (
      <ScreenBackground>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()}</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <GlassIconButton icon="notifications-outline" onPress={() => setShowNotifications(true)} />
            <GlassIconButton icon="person-outline" onPress={() => router.push("/(tabs)/profile?edit=true")} style={{ marginLeft: spacing.sm }} />
          </View>
        </View>

        <GlassCard style={styles.progressCard} padding={spacing.xxl}>
          <Text style={styles.progressTitle}>Today's progress</Text>
          <ProgressRing progress={progress} completed={completedDoses} total={totalDoses} />
        </GlassCard>

        <View style={styles.actionsRow}>
          {QUICK_ACTIONS.map((action) => (
            <Link href={action.route} key={action.label} asChild>
              <Pressable style={styles.actionItem}>
                <GlassCard padding={spacing.md} radius={R.lg} style={styles.actionCard}>
                  <View style={[styles.actionIcon, { backgroundColor: withAlpha(action.color, 0.16) }]}>
                    <Ionicons name={action.icon} size={22} color={action.color} />
                  </View>
                  <Text style={styles.actionLabel} numberOfLines={1}>
                    {action.label}
                  </Text>
                </GlassCard>
              </Pressable>
            </Link>
          ))}
        </View>

        {showUpgradePrompt && (
          <GlassCard style={styles.upgradeCard}>
            <View style={styles.upgradeRow}>
              <View style={[styles.actionIcon, { backgroundColor: withAlpha(accents.amber, 0.16) }]}>
                <Ionicons name="star" size={20} color={accents.amber} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.upgradeTitle}>Unlock unlimited medications</Text>
                <Text style={styles.upgradeText}>
                  You've added {medications.length}. Go Premium for unlimited meds and more.
                </Text>
              </View>
              <Pressable onPress={() => setShowUpgradePrompt(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>
            <Pressable style={styles.upgradeBtn} onPress={() => router.push("/premium")}>
              <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
            </Pressable>
          </GlassCard>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's schedule</Text>
          <Link href="/(tabs)/calendar" asChild>
            <Pressable>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </Link>
        </View>

        {todaysMedications.length === 0 ? (
          <GlassCard style={styles.empty} padding={spacing.xxl}>
            <Ionicons name="leaf-outline" size={44} color={theme.colors.textTertiary} />
            <Text style={styles.emptyText}>No medications scheduled for today</Text>
            <Link href="/medications/add" asChild>
              <Pressable style={styles.emptyBtn}>
                <Text style={styles.emptyBtnText}>Add medication</Text>
              </Pressable>
            </Link>
          </GlassCard>
        ) : (
          todaysMedications.map((medication) => {
            const taken = isDoseTaken(medication.id);
            return (
              <GlassCard key={medication.id} style={styles.doseCard} padding={spacing.lg}>
                <View style={styles.doseRow}>
                  <View style={[styles.doseIcon, { backgroundColor: withAlpha(medication.color, 0.16) }]}>
                    <Ionicons name="medical" size={22} color={medication.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{medication.name}</Text>
                    <View style={styles.doseMeta}>
                      <Text style={styles.doseDosage}>{medication.dosage}</Text>
                      <View style={styles.dot} />
                      <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                      <Text style={styles.doseTime}>{medication.times[0]}</Text>
                    </View>
                  </View>
                  {taken ? (
                    <View style={styles.takenBadge}>
                      <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                      <Text style={styles.takenText}>Taken</Text>
                    </View>
                  ) : (
                    <Pressable style={[styles.takeBtn, { backgroundColor: medication.color }]} onPress={() => handleTakeDose(medication)}>
                      <Text style={styles.takeText}>Take</Text>
                    </Pressable>
                  )}
                </View>
              </GlassCard>
            );
          })
        )}

        <AdBanner />
      </ScrollView>

      <PremiumModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Today's Medications"
        subtitle={`${todaysMedications.length} medication${todaysMedications.length !== 1 ? "s" : ""} scheduled`}
        headerIcon="notifications"
        size="medium"
        scrollable
      >
        <View style={{ gap: spacing.md }}>
          {todaysMedications.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="checkmark-circle-outline" size={56} color={theme.colors.success} />
              <Text style={styles.emptyText}>All clear — nothing scheduled</Text>
            </View>
          ) : (
            todaysMedications.map((medication) => (
              <View key={medication.id} style={styles.notifItem}>
                <View style={[styles.doseIcon, { backgroundColor: withAlpha(medication.color, 0.16) }]}>
                  <Ionicons name="medical" size={20} color={medication.color} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.medName}>{medication.name}</Text>
                  <Text style={styles.doseDosage}>
                    {medication.dosage} · {medication.times[0]}
                  </Text>
                </View>
                <Ionicons
                  name={isDoseTaken(medication.id) ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={isDoseTaken(medication.id) ? theme.colors.success : theme.colors.warning}
                />
              </View>
            ))
          )}
        </View>
      </PremiumModal>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    loading: { flex: 1, justifyContent: "center", alignItems: "center" },
    scroll: { paddingHorizontal: spacing.xl, paddingTop: 64, paddingBottom: 120 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl },
    greeting: { ...typography.title, color: theme.colors.text },
    date: { ...typography.body, color: theme.colors.textSecondary, marginTop: 2 },
    headerActions: { flexDirection: "row" },
    progressCard: { alignItems: "center", marginBottom: spacing.lg },
    progressTitle: { ...typography.label, color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.lg },
    actionsRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xl },
    actionItem: { flex: 1 },
    actionCard: { alignItems: "center", gap: spacing.sm },
    actionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    actionLabel: { ...typography.caption, color: theme.colors.text },
    upgradeCard: { marginBottom: spacing.xl },
    upgradeRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
    upgradeTitle: { ...typography.h2, color: theme.colors.text },
    upgradeText: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2, lineHeight: 18 },
    upgradeBtn: { backgroundColor: accents.amber, paddingVertical: 12, borderRadius: R.pill, alignItems: "center" },
    upgradeBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
    sectionTitle: { ...typography.h1, color: theme.colors.text },
    seeAll: { color: theme.colors.primary, fontWeight: "600" },
    empty: { alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
    emptyText: { ...typography.body, color: theme.colors.textSecondary, textAlign: "center" },
    emptyBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: R.pill },
    emptyBtnText: { color: "#fff", fontWeight: "700" },
    doseCard: { marginBottom: spacing.md },
    doseRow: { flexDirection: "row", alignItems: "center" },
    doseIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
    medName: { ...typography.h2, color: theme.colors.text },
    doseMeta: { flexDirection: "row", alignItems: "center", marginTop: 3, gap: 6 },
    doseDosage: { ...typography.caption, color: theme.colors.textSecondary },
    dot: { width: 3, height: 3, borderRadius: 3, backgroundColor: theme.colors.textTertiary },
    doseTime: { ...typography.caption, color: theme.colors.textSecondary },
    takenBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.pill, backgroundColor: withAlpha(theme.colors.success, 0.14) },
    takenText: { color: theme.colors.success, fontWeight: "600", fontSize: 13 },
    takeBtn: { paddingHorizontal: spacing.xl, paddingVertical: 10, borderRadius: R.pill },
    takeText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    notifItem: { flexDirection: "row", alignItems: "center" },
  });

export default function HomeScreen() {
  const { userRole } = useAuth();
  if (userRole === "doctor") return <DoctorDashboard />;
  return <PatientHomeScreen />;
}
