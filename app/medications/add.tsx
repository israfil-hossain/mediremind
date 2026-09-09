import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, GlassSurface, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
import { useTheme } from "../../contexts/ThemeContext";
import { scheduleMedicationReminder, scheduleRefillReminder } from "../../utils/notifications";
import { addMedication, getMedications } from "../../utils/storage";
import { canAddMedication, canUseRefillAlerts, getMedicationLimit } from "../../utils/subscription";

const FREQUENCIES = [
  { id: "1", label: "Once daily", icon: "sunny-outline" as const, times: ["09:00"] },
  { id: "2", label: "Twice daily", icon: "sync-outline" as const, times: ["09:00", "21:00"] },
  { id: "3", label: "Three times daily", icon: "time-outline" as const, times: ["09:00", "15:00", "21:00"] },
  { id: "4", label: "Four times daily", icon: "repeat-outline" as const, times: ["09:00", "13:00", "17:00", "21:00"] },
  { id: "5", label: "As needed", icon: "calendar-outline" as const, times: [] },
];

const DURATIONS = [
  { id: "1", label: "7 days", value: 7 },
  { id: "2", label: "14 days", value: 14 },
  { id: "3", label: "30 days", value: 30 },
  { id: "4", label: "90 days", value: 90 },
  { id: "5", label: "Ongoing", value: -1 },
];

const MED_COLORS = ["#10B981", "#0EA5E9", "#F59E0B", "#F43F5E", "#8B5CF6"];

export default function AddMedicationScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    startDate: new Date(),
    times: ["09:00"] as string[],
    notes: "",
    reminderEnabled: true,
    refillReminder: false,
    currentSupply: "",
    refillAt: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [medicationCount, setMedicationCount] = useState(0);

  useEffect(() => {
    getMedications()
      .then((m) => setMedicationCount(m.length))
      .catch((e) => console.error("Error loading medication count:", e));
  }, []);

  const update = (patch: Partial<typeof form>, clearErr?: string[]) => {
    setForm((prev) => ({ ...prev, ...patch }));
    if (clearErr) setErrors((prev) => ({ ...prev, ...Object.fromEntries(clearErr.map((k) => [k, ""])) }));
  };

  const validateForm = () => {
    const e: { [key: string]: string } = {};
    if (!form.name.trim()) e.name = "Medication name is required";
    if (!form.dosage.trim()) e.dosage = "Dosage is required";
    if (!form.frequency) e.frequency = "Frequency is required";
    if (!form.duration) e.duration = "Duration is required";
    if (form.refillReminder) {
      if (!form.currentSupply) e.currentSupply = "Current supply is required";
      if (!form.refillAt) e.refillAt = "Refill threshold is required";
      if (Number(form.refillAt) >= Number(form.currentSupply)) e.refillAt = "Alert must be less than supply";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const proceedWithSave = async (data: any) => {
    await addMedication(data);
    if (data.reminderEnabled) await scheduleMedicationReminder(data);
    if (data.refillReminder && (await canUseRefillAlerts())) await scheduleRefillReminder(data);
    Alert.alert("Success", "Medication added successfully", [{ text: "OK", onPress: () => router.back() }], { cancelable: false });
  };

  const limitAlert = async () => {
    const limit = await getMedicationLimit();
    Alert.alert("Medication Limit Reached", `Free version allows up to ${limit} medications. Upgrade to Premium for unlimited.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Upgrade to Premium", onPress: () => router.push("/premium") },
    ]);
  };

  const handleSave = async () => {
    try {
      if (!validateForm()) {
        Alert.alert("Error", "Please fill in all required fields correctly");
        return;
      }
      if (isSubmitting) return;
      setIsSubmitting(true);

      const data = {
        id: Math.random().toString(36).substr(2, 9),
        ...form,
        currentSupply: form.currentSupply ? Number(form.currentSupply) : 0,
        totalSupply: form.currentSupply ? Number(form.currentSupply) : 0,
        refillAt: form.refillAt ? Number(form.refillAt) : 0,
        startDate: form.startDate.toISOString(),
        color: MED_COLORS[Math.floor(Math.random() * MED_COLORS.length)],
      };

      if (!(await canAddMedication(medicationCount))) {
        await limitAlert();
        setIsSubmitting(false);
        return;
      }

      if (data.refillReminder && !(await canUseRefillAlerts())) {
        Alert.alert("Premium Feature", "Automated refill alerts are available in Premium. You can still track refills manually.", [
          {
            text: "Continue Without Alerts",
            onPress: async () => {
              data.refillReminder = false;
              await proceedWithSave(data);
            },
          },
          { text: "Upgrade to Premium", onPress: () => router.push("/premium") },
        ]);
        setIsSubmitting(false);
        return;
      }

      await proceedWithSave(data);
    } catch (error: any) {
      console.error("Save error:", error);
      if (error.message === "MEDICATION_LIMIT_REACHED") await limitAlert();
      else Alert.alert("Error", "Failed to save medication. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRefill = async (value: boolean) => {
    if (value && !(await canUseRefillAlerts())) {
      Alert.alert("Premium Feature", "Automated refill alerts are available in Premium.", [
        { text: "Cancel", style: "cancel" },
        { text: "Upgrade to Premium", onPress: () => router.push("/premium") },
      ]);
      return;
    }
    update({ refillReminder: value }, value ? undefined : ["currentSupply", "refillAt"]);
  };

  return (
    <ScreenBackground>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={styles.header}>
          <GlassIconButton icon="chevron-back" onPress={() => router.back()} />
          <View style={{ marginLeft: spacing.md }}>
            <Text style={styles.title}>New medication</Text>
            {medicationCount > 0 && (
              <Text style={styles.count}>
                {medicationCount} medication{medicationCount !== 1 ? "s" : ""} added
              </Text>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <GlassCard padding={spacing.lg} style={styles.block}>
            <GlassField placeholder="Medication name" value={form.name} onChangeText={(t) => update({ name: t }, ["name"])} containerStyle={errors.name ? styles.errBorder : undefined} />
            {errors.name && <Text style={styles.err}>{errors.name}</Text>}
            <GlassField placeholder="Dosage (e.g., 500mg)" value={form.dosage} onChangeText={(t) => update({ dosage: t }, ["dosage"])} containerStyle={[{ marginTop: spacing.md }, errors.dosage ? styles.errBorder : null]} />
            {errors.dosage && <Text style={styles.err}>{errors.dosage}</Text>}
          </GlassCard>

          <Text style={styles.sectionTitle}>How often?</Text>
          {errors.frequency && <Text style={styles.err}>{errors.frequency}</Text>}
          <View style={styles.grid}>
            {FREQUENCIES.map((freq) => {
              const active = form.frequency === freq.label;
              return (
                <Pressable key={freq.id} style={styles.gridItem} onPress={() => update({ frequency: freq.label, times: freq.times }, ["frequency"])}>
                  <OptionCard active={active}>
                    <View style={[styles.optIcon, { backgroundColor: active ? withAlpha("#fff", 0.2) : withAlpha(accents.emerald, 0.14) }]}>
                      <Ionicons name={freq.icon} size={22} color={active ? "#fff" : accents.emerald} />
                    </View>
                    <Text style={[styles.optLabel, active && styles.optLabelActive]}>{freq.label}</Text>
                  </OptionCard>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>For how long?</Text>
          {errors.duration && <Text style={styles.err}>{errors.duration}</Text>}
          <View style={styles.grid}>
            {DURATIONS.map((dur) => {
              const active = form.duration === dur.label;
              return (
                <Pressable key={dur.id} style={styles.gridItem} onPress={() => update({ duration: dur.label }, ["duration"])}>
                  <OptionCard active={active}>
                    <Text style={[styles.durNum, active && styles.optLabelActive]}>{dur.value > 0 ? dur.value : "∞"}</Text>
                    <Text style={[styles.optLabel, active && styles.optLabelActive]}>{dur.label}</Text>
                  </OptionCard>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.row} onPress={() => setShowDatePicker(true)}>
            <View style={styles.rowIcon}>
              <Ionicons name="calendar" size={20} color={accents.emerald} />
            </View>
            <Text style={styles.rowText}>Starts {form.startDate.toLocaleDateString()}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
          </Pressable>

          {showDatePicker && (
            <DateTimePicker
              value={form.startDate}
              mode="date"
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) update({ startDate: date });
              }}
            />
          )}

          {form.frequency && form.frequency !== "As needed" && (
            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.subTitle}>Medication times</Text>
              {form.times.map((time, index) => (
                <Pressable key={index} style={styles.row} onPress={() => setShowTimePicker(true)}>
                  <View style={styles.rowIcon}>
                    <Ionicons name="time-outline" size={20} color={accents.emerald} />
                  </View>
                  <Text style={styles.rowText}>{time}</Text>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}

          {showTimePicker && (
            <DateTimePicker
              value={(() => {
                const [h, m] = form.times[0].split(":").map(Number);
                const d = new Date();
                d.setHours(h, m, 0, 0);
                return d;
              })()}
              mode="time"
              onChange={(_, date) => {
                setShowTimePicker(false);
                if (date) {
                  const newTime = date.toLocaleTimeString("default", { hour: "2-digit", minute: "2-digit", hour12: false });
                  setForm((prev) => ({ ...prev, times: prev.times.map((t, i) => (i === 0 ? newTime : t)) }));
                }
              }}
            />
          )}

          <GlassCard padding={spacing.lg} style={styles.block}>
            <View style={styles.switchRow}>
              <View style={styles.rowIcon}>
                <Ionicons name="notifications" size={20} color={accents.emerald} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={styles.switchLabel}>Reminders</Text>
                <Text style={styles.switchSub}>Get notified when it's time to take your medication</Text>
              </View>
              <Switch value={form.reminderEnabled} onValueChange={(v) => update({ reminderEnabled: v })} trackColor={{ false: theme.colors.border, true: accents.emerald }} thumbColor="#fff" />
            </View>
          </GlassCard>

          <GlassCard padding={spacing.lg} style={styles.block}>
            <View style={styles.switchRow}>
              <View style={styles.rowIcon}>
                <Ionicons name="reload" size={20} color={accents.emerald} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={styles.switchLabel}>Refill tracking</Text>
                  {!form.refillReminder && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Premium</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.switchSub}>{form.refillReminder ? "Get notified when you need to refill" : "Automated refill alerts (Premium)"}</Text>
              </View>
              <Switch value={form.refillReminder} onValueChange={toggleRefill} trackColor={{ false: theme.colors.border, true: accents.emerald }} thumbColor="#fff" />
            </View>
            {form.refillReminder && (
              <View style={styles.refillRow}>
                <View style={{ flex: 1 }}>
                  <GlassField placeholder="Current supply" value={form.currentSupply} onChangeText={(t) => update({ currentSupply: t }, ["currentSupply"])} keyboardType="numeric" containerStyle={errors.currentSupply ? styles.errBorder : undefined} />
                  {errors.currentSupply && <Text style={styles.err}>{errors.currentSupply}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <GlassField placeholder="Alert at" value={form.refillAt} onChangeText={(t) => update({ refillAt: t }, ["refillAt"])} keyboardType="numeric" containerStyle={errors.refillAt ? styles.errBorder : undefined} />
                  {errors.refillAt && <Text style={styles.err}>{errors.refillAt}</Text>}
                </View>
              </View>
            )}
          </GlassCard>

          <GlassCard padding={spacing.xs} style={styles.block}>
            <GlassField
              placeholder="Add notes or special instructions..."
              value={form.notes}
              onChangeText={(t) => update({ notes: t })}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              containerStyle={{ borderWidth: 0, backgroundColor: "transparent" }}
              style={{ height: 96 }}
            />
          </GlassCard>

          <GlassButton label={isSubmitting ? "Adding…" : "Add medication"} onPress={handleSave} loading={isSubmitting} style={{ marginTop: spacing.sm }} />
          <GlassButton label="Cancel" variant="ghost" onPress={() => router.back()} disabled={isSubmitting} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

function OptionCard({ active, children }: { active: boolean; children: React.ReactNode }) {
  const { theme } = useTheme();
  if (active) {
    return <View style={[optCardBase, { backgroundColor: accents.emerald }]}>{children}</View>;
  }
  return (
    <GlassSurface radius={R.md} style={optCardBase}>
      {children}
    </GlassSurface>
  );
}

const optCardBase = { padding: spacing.lg, alignItems: "center" as const, minHeight: 104, justifyContent: "center" as const };

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    title: { ...typography.title, color: theme.colors.text },
    count: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 2 },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    block: { marginBottom: spacing.lg },
    sectionTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.md, marginTop: spacing.xs },
    subTitle: { ...typography.h2, color: theme.colors.text, marginBottom: spacing.md },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
    gridItem: { width: "47.5%" },
    optIcon: { width: 46, height: 46, borderRadius: 16, alignItems: "center", justifyContent: "center", marginBottom: spacing.sm },
    optLabel: { ...typography.label, color: theme.colors.text, textAlign: "center" },
    optLabelActive: { color: "#fff" },
    durNum: { fontSize: 26, fontWeight: "800", color: accents.emerald, marginBottom: spacing.xs },
    row: { flexDirection: "row", alignItems: "center", backgroundColor: theme.isDark ? withAlpha("#FFFFFF", 0.06) : withAlpha("#FFFFFF", 0.7), borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, padding: spacing.lg, marginBottom: spacing.md },
    rowIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: withAlpha(accents.emerald, 0.14), alignItems: "center", justifyContent: "center" },
    rowText: { flex: 1, ...typography.body, color: theme.colors.text, marginLeft: spacing.md },
    switchRow: { flexDirection: "row", alignItems: "center" },
    switchLabel: { ...typography.h2, color: theme.colors.text },
    switchSub: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 3, lineHeight: 17 },
    refillRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
    badge: { backgroundColor: accents.amber, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: R.sm, marginLeft: spacing.sm },
    badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
    err: { color: accents.rose, fontSize: 12, marginTop: spacing.xs, marginBottom: spacing.xs, marginLeft: spacing.xs },
    errBorder: { borderColor: accents.rose },
  });
