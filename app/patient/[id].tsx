import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard, GlassIconButton, GlassSurface, ScreenBackground } from "../../components/ui/Glass";
import { radius as R, accents, spacing, typography, withAlpha } from "../../constants/design";
import { useTheme } from "../../contexts/ThemeContext";
import { SharedPrescription, getUserPrescriptions } from "../../utils/prescriptionManager";
import { UserProfile, getUserProfile } from "../../utils/userManagement";

const statusColor = (status: string) => (status === "approved" ? accents.emerald : status === "rejected" ? accents.rose : accents.amber);

export default function PatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [patient, setPatient] = useState<UserProfile | null>(null);
  const [prescriptions, setPrescriptions] = useState<SharedPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      Promise.all([getUserProfile(id), getUserPrescriptions(id, "patient")])
        .then(([profile, rx]) => {
          setPatient(profile);
          setPrescriptions(rx);
        })
        .catch((e) => console.error("Error loading patient data:", e))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ScreenBackground>
    );
  }

  if (!patient) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Patient not found</Text>
        </View>
      </ScreenBackground>
    );
  }

  const pp = patient.patientProfile;
  const details: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [];
  if (pp?.dateOfBirth) details.push({ icon: "calendar-outline", label: "DOB", value: pp.dateOfBirth });
  if (pp?.gender) details.push({ icon: "male-female-outline", label: "Gender", value: pp.gender.charAt(0).toUpperCase() + pp.gender.slice(1) });
  if (pp?.bloodGroup) details.push({ icon: "water-outline", label: "Blood", value: pp.bloodGroup });

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>Patient Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.profileCard} padding={spacing.xl}>
          <GlassSurface radius={R.pill} style={styles.avatar}>
            <Text style={styles.avatarText}>{(patient.name || "P")[0].toUpperCase()}</Text>
          </GlassSurface>
          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.muted}>{patient.email}</Text>
          <Text style={styles.muted}>{patient.phone}</Text>
          {details.length > 0 && (
            <View style={styles.detailsGrid}>
              {details.map((d) => (
                <View key={d.label} style={styles.detailItem}>
                  <Ionicons name={d.icon} size={16} color={accents.teal} />
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <Text style={styles.detailValue}>{d.value}</Text>
                </View>
              ))}
            </View>
          )}
        </GlassCard>

        {pp?.address && (
          <GlassCard style={styles.infoCard} padding={spacing.lg}>
            <Ionicons name="location-outline" size={20} color={accents.teal} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{pp.address}</Text>
            </View>
          </GlassCard>
        )}

        {pp?.emergencyContact && (
          <GlassCard style={styles.infoCard} padding={spacing.lg}>
            <Ionicons name="call-outline" size={20} color={accents.rose} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={styles.infoLabel}>Emergency Contact</Text>
              <Text style={styles.infoValue}>{pp.emergencyContact}</Text>
              {pp.emergencyPhone && <Text style={styles.infoValue}>{pp.emergencyPhone}</Text>}
            </View>
          </GlassCard>
        )}

        <Text style={styles.sectionTitle}>Prescriptions</Text>
        {prescriptions.length === 0 ? (
          <GlassCard style={{ alignItems: "center" }} padding={spacing.xxl}>
            <Text style={styles.muted}>No prescriptions yet</Text>
          </GlassCard>
        ) : (
          prescriptions.map((rx) => (
            <GlassCard key={rx.id} style={styles.block} padding={spacing.lg}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.rxTitle}>{rx.title}</Text>
                <Text style={[styles.rxStatus, { color: statusColor(rx.status) }]}>{rx.status.charAt(0).toUpperCase() + rx.status.slice(1)}</Text>
              </View>
              {rx.diagnosis && <Text style={styles.rxDiagnosis}>{rx.diagnosis}</Text>}
              {rx.medications.map((med, i) => (
                <Text key={i} style={styles.medText}>
                  • {med.name} {med.dosage && `- ${med.dosage}`} {med.frequency && `(${med.frequency})`}
                </Text>
              ))}
            </GlassCard>
          ))
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
    emptyTitle: { ...typography.h2, color: theme.colors.text },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    title: { ...typography.h1, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    block: { marginBottom: spacing.md },
    profileCard: { alignItems: "center", marginBottom: spacing.lg },
    avatar: { width: 80, height: 80, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
    avatarText: { fontSize: 32, fontWeight: "800", color: accents.teal },
    name: { ...typography.title, color: theme.colors.text, marginBottom: spacing.xs },
    muted: { ...typography.caption, color: theme.colors.textSecondary },
    detailsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.md, marginTop: spacing.md },
    detailItem: { alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: withAlpha(theme.colors.text, 0.06), borderRadius: R.md, minWidth: 80 },
    detailLabel: { ...typography.caption, color: theme.colors.textTertiary, marginTop: 4 },
    detailValue: { ...typography.label, color: theme.colors.text, marginTop: 2 },
    infoCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
    infoLabel: { ...typography.label, color: theme.colors.textSecondary, marginBottom: 2 },
    infoValue: { ...typography.body, color: theme.colors.text },
    sectionTitle: { ...typography.h1, color: theme.colors.text, marginTop: spacing.sm, marginBottom: spacing.md },
    rxTitle: { flex: 1, ...typography.h2, color: theme.colors.text },
    rxStatus: { fontSize: 12, fontWeight: "700", marginLeft: spacing.sm },
    rxDiagnosis: { ...typography.caption, color: theme.colors.textSecondary, fontStyle: "italic", marginTop: spacing.xs, marginBottom: spacing.sm },
    medText: { ...typography.caption, color: theme.colors.textSecondary, marginBottom: 2 },
  });
