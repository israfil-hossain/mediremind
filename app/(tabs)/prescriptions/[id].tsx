import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { GlassCard, GlassIconButton, ScreenBackground } from "../../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../../constants/design";
import { useTheme } from "../../../contexts/ThemeContext";
import { formatPrescriptionForWhatsApp, getPrescriptionById, SharedPrescription } from "../../../utils/prescriptionManager";

export default function PrescriptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [prescription, setPrescription] = useState<SharedPrescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) loadPrescription();
  }, [id]);

  const loadPrescription = async () => {
    try {
      setIsLoading(true);
      const data = await getPrescriptionById(id);
      if (data) setPrescription(data);
      else {
        Alert.alert("Error", "Prescription not found");
        router.back();
      }
    } catch (e) {
      console.error("Error loading prescription:", e);
      Alert.alert("Error", "Failed to load prescription");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!prescription) return;
    try {
      await Share.share({ message: formatPrescriptionForWhatsApp(prescription), title: "Share Prescription" });
    } catch (e) {
      console.error("Error sharing:", e);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!prescription) return;
    try {
      const url = `whatsapp://send?text=${encodeURIComponent(formatPrescriptionForWhatsApp(prescription))}`;
      if (await Linking.canOpenURL(url)) await Linking.openURL(url);
      else
        Alert.alert("WhatsApp Not Found", "WhatsApp is not installed. Share via other methods?", [
          { text: "Cancel", style: "cancel" },
          { text: "Share", onPress: handleShare },
        ]);
    } catch (e) {
      console.error("Error sharing to WhatsApp:", e);
      Alert.alert("Error", "Failed to share to WhatsApp");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return "N/A";
    }
  };

  if (isLoading) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accents.violet} />
          <Text style={styles.muted}>Loading prescription…</Text>
        </View>
      </ScreenBackground>
    );
  }

  if (!prescription) return null;

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>Prescription</Text>
        <GlassIconButton icon="share-outline" onPress={handleShare} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.block} padding={spacing.xl}>
          <Text style={styles.rxTitle}>{prescription.title}</Text>
          <Text style={styles.muted}>Created: {formatDate(prescription.createdAt)}</Text>

          {prescription.createdByRole === "doctor" && prescription.doctorName && (
            <View style={styles.infoSection}>
              <View style={styles.infoHead}>
                <Ionicons name="medical" size={20} color={accents.emerald} />
                <Text style={styles.infoTitle}>Doctor Information</Text>
              </View>
              <Text style={styles.infoText}>Dr. {prescription.doctorName}</Text>
              {prescription.doctorSpecialty && <Text style={styles.muted}>{prescription.doctorSpecialty}</Text>}
              {prescription.clinicName && <Text style={styles.muted}>{prescription.clinicName}</Text>}
              {prescription.doctorPhone && <Text style={styles.muted}>📞 {prescription.doctorPhone}</Text>}
            </View>
          )}

          <View style={styles.infoSection}>
            <View style={styles.infoHead}>
              <Ionicons name="person" size={20} color={accents.sky} />
              <Text style={styles.infoTitle}>Patient Information</Text>
            </View>
            <Text style={styles.infoText}>{prescription.patientName}</Text>
            {prescription.patientAge && <Text style={styles.muted}>Age: {prescription.patientAge}</Text>}
            {prescription.patientGender && <Text style={styles.muted}>Gender: {prescription.patientGender}</Text>}
          </View>
        </GlassCard>

        {prescription.diagnosis && (
          <GlassCard style={styles.block} padding={spacing.xl}>
            <View style={styles.sectionHead}>
              <Ionicons name="clipboard" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.sectionTitle}>Diagnosis</Text>
            </View>
            <Text style={styles.bodyText}>{prescription.diagnosis}</Text>
          </GlassCard>
        )}

        <GlassCard style={styles.block} padding={spacing.xl}>
          <View style={styles.sectionHead}>
            <Ionicons name="medical" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.sectionTitle}>Medications</Text>
          </View>
          {prescription.medications.map((med, i) => (
            <View key={i} style={styles.medCard}>
              <View style={styles.medNumber}>
                <Text style={styles.medNumberText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{med.name}</Text>
                {med.dosage && <Text style={styles.medInfo}>💊 Dosage: {med.dosage}</Text>}
                {med.frequency && <Text style={styles.medInfo}>⏰ Frequency: {med.frequency}</Text>}
                {med.duration && <Text style={styles.medInfo}>📅 Duration: {med.duration}</Text>}
                {med.instructions && <Text style={styles.medInstructions}>📝 {med.instructions}</Text>}
              </View>
            </View>
          ))}
        </GlassCard>

        {prescription.instructions && (
          <GlassCard style={styles.block} padding={spacing.xl}>
            <View style={styles.sectionHead}>
              <Ionicons name="information-circle" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.sectionTitle}>Instructions</Text>
            </View>
            <Text style={styles.bodyText}>{prescription.instructions}</Text>
          </GlassCard>
        )}

        {prescription.notes && (
          <GlassCard style={styles.block} padding={spacing.xl}>
            <View style={styles.sectionHead}>
              <Ionicons name="document-text" size={18} color={theme.colors.textSecondary} />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.bodyText}>{prescription.notes}</Text>
          </GlassCard>
        )}

        <Pressable style={styles.whatsappBtn} onPress={handleWhatsAppShare}>
          <Ionicons name="logo-whatsapp" size={22} color="#fff" />
          <Text style={styles.whatsappText}>Share on WhatsApp</Text>
        </Pressable>
        <Pressable style={styles.shareAltBtn} onPress={handleShare}>
          <Ionicons name="share-social" size={22} color={accents.violet} />
          <Text style={styles.shareAltText}>Share via…</Text>
        </Pressable>
      </ScrollView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    title: { ...typography.h1, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    block: { marginBottom: spacing.lg },
    rxTitle: { ...typography.title, color: theme.colors.text, marginBottom: spacing.xs },
    muted: { ...typography.caption, color: theme.colors.textSecondary },
    infoSection: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
    infoHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
    infoTitle: { ...typography.h2, color: theme.colors.text },
    infoText: { ...typography.body, color: theme.colors.text, marginBottom: 4 },
    sectionHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
    sectionTitle: { ...typography.h2, color: theme.colors.text },
    bodyText: { ...typography.body, color: theme.colors.textSecondary, lineHeight: 22 },
    medCard: { flexDirection: "row", padding: spacing.lg, backgroundColor: withAlpha(accents.violet, 0.08), borderRadius: R.md, marginBottom: spacing.md, borderLeftWidth: 4, borderLeftColor: accents.violet },
    medNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: accents.violet, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
    medNumberText: { color: "#fff", fontSize: 15, fontWeight: "800" },
    medName: { ...typography.h2, color: theme.colors.text, marginBottom: spacing.sm },
    medInfo: { ...typography.caption, color: theme.colors.textSecondary, marginBottom: 4 },
    medInstructions: { ...typography.caption, color: theme.colors.textSecondary, fontStyle: "italic", marginTop: 4 },
    whatsappBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: "#25D366", paddingVertical: 15, borderRadius: R.pill, marginTop: spacing.sm },
    whatsappText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    shareAltBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 15, borderRadius: R.pill, borderWidth: 2, borderColor: accents.violet, marginTop: spacing.md },
    shareAltText: { color: accents.violet, fontSize: 16, fontWeight: "700" },
  });
