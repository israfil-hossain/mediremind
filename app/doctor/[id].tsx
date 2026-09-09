import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassCard, GlassIconButton, GlassSurface, ScreenBackground } from "../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../constants/design";
import { useTheme } from "../../contexts/ThemeContext";
import { UserProfile, getUserProfile } from "../../utils/userManagement";

export default function DoctorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [doctor, setDoctor] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      getUserProfile(id)
        .then(setDoctor)
        .catch((e) => console.error("Error loading doctor:", e))
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

  if (!doctor) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={44} color={theme.colors.textSecondary} />
          <Text style={styles.emptyTitle}>Doctor not found</Text>
        </View>
      </ScreenBackground>
    );
  }

  const dp = doctor.doctorProfile;
  const info: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | string[] }[] = [];
  if (dp?.licenseNumber) info.push({ icon: "card-outline", label: "License Number", value: dp.licenseNumber });
  if (dp?.qualifications?.length) info.push({ icon: "school-outline", label: "Qualifications", value: dp.qualifications });
  if (dp?.yearsOfExperience !== undefined) info.push({ icon: "time-outline", label: "Experience", value: `${dp.yearsOfExperience} years` });
  if (dp?.clinicName) info.push({ icon: "business-outline", label: "Clinic", value: [dp.clinicName, dp.clinicAddress].filter(Boolean) as string[] });

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>Doctor Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.profileCard} padding={spacing.xl}>
          <GlassSurface radius={R.pill} style={styles.avatar}>
            <Text style={styles.avatarText}>{(doctor.name || "D")[0].toUpperCase()}</Text>
          </GlassSurface>
          <Text style={styles.name}>Dr. {doctor.name}</Text>
          {dp?.specialty && (
            <View style={styles.specialtyBadge}>
              <Ionicons name="medical" size={12} color="#fff" />
              <Text style={styles.specialtyText}>{dp.specialty}</Text>
            </View>
          )}
          <Text style={styles.muted}>{doctor.email}</Text>
          <Text style={styles.muted}>{doctor.phone}</Text>
        </GlassCard>

        {info.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Professional Information</Text>
            {info.map((item) => (
              <GlassCard key={item.label} style={styles.infoCard} padding={spacing.lg}>
                <View style={styles.infoIcon}>
                  <Ionicons name={item.icon} size={20} color={accents.teal} />
                </View>
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={styles.infoLabel}>{item.label}</Text>
                  {Array.isArray(item.value) ? item.value.map((v, i) => <Text key={i} style={styles.infoValue}>{item.label === "Qualifications" ? `• ${v}` : v}</Text>) : <Text style={styles.infoValue}>{item.value}</Text>}
                </View>
              </GlassCard>
            ))}
          </>
        )}

        <GlassCard style={styles.verification} padding={spacing.lg}>
          <Ionicons name={dp?.isVerified ? "shield-checkmark" : "shield-outline"} size={22} color={dp?.isVerified ? accents.teal : theme.colors.textTertiary} />
          <Text style={styles.verificationText}>{dp?.isVerified ? "Verified Doctor" : `Verification: ${dp?.verificationStatus || "pending"}`}</Text>
        </GlassCard>
      </ScrollView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
    emptyTitle: { ...typography.h2, color: theme.colors.text },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
    title: { ...typography.h1, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    profileCard: { alignItems: "center", marginBottom: spacing.lg },
    avatar: { width: 80, height: 80, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
    avatarText: { fontSize: 32, fontWeight: "800", color: accents.teal },
    name: { ...typography.title, color: theme.colors.text, marginBottom: spacing.sm },
    specialtyBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: accents.teal, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: R.pill, marginBottom: spacing.sm },
    specialtyText: { fontSize: 13, color: "#fff", fontWeight: "600" },
    muted: { ...typography.caption, color: theme.colors.textSecondary },
    sectionTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.md },
    infoCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
    infoIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: withAlpha(accents.teal, 0.14), alignItems: "center", justifyContent: "center" },
    infoLabel: { ...typography.label, color: theme.colors.textSecondary, marginBottom: 2 },
    infoValue: { ...typography.body, color: theme.colors.text },
    verification: { flexDirection: "row", alignItems: "center", gap: spacing.md },
    verificationText: { ...typography.h2, color: theme.colors.text },
  });
