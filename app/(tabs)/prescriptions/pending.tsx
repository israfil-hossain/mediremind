import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, ScreenBackground } from "../../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../../constants/design";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { SharedPrescription, approvePrescription, getPendingPrescriptions, rejectPrescription } from "../../../utils/prescriptionManager";

export default function PendingPrescriptionsScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<SharedPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<SharedPrescription | null>(null);

  const loadPendingPrescriptions = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setPrescriptions(await getPendingPrescriptions(user.uid));
    } catch (e) {
      console.error("Error loading pending prescriptions:", e);
      Alert.alert("Error", "Failed to load pending prescriptions");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadPendingPrescriptions();
    }, [loadPendingPrescriptions])
  );

  const handleApprove = (prescription: SharedPrescription) => {
    if (!user) return;
    Alert.alert("Approve Prescription", `Approve "${prescription.title}"?\n\nThis will automatically add medications to your reminder list.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          try {
            setProcessingId(prescription.id);
            await approvePrescription(prescription.id, user.uid);
            Alert.alert("Success", "Prescription approved! Medications added to your reminders.");
            await loadPendingPrescriptions();
          } catch (e: any) {
            Alert.alert("Error", e.message || "Failed to approve prescription");
          } finally {
            setProcessingId(null);
          }
        },
      },
    ]);
  };

  const confirmRejection = async () => {
    if (!selectedPrescription || !user) return;
    try {
      setProcessingId(selectedPrescription.id);
      await rejectPrescription(selectedPrescription.id, user.uid, rejectionReason);
      Alert.alert("Success", "Prescription rejected");
      setShowRejectionModal(false);
      setRejectionReason("");
      setSelectedPrescription(null);
      await loadPendingPrescriptions();
    } catch (e: any) {
      Alert.alert("Error", e.message || "Failed to reject prescription");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return "N/A";
    }
  };

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>Pending Prescriptions</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accents.amber} />
          <Text style={styles.muted}>Loading pending prescriptions…</Text>
        </View>
      ) : prescriptions.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-circle-outline" size={72} color={accents.emerald} />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.muted}>You don't have any pending prescriptions</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadPendingPrescriptions} tintColor={theme.colors.primary} />}>
          {prescriptions.map((rx) => (
            <GlassCard key={rx.id} style={styles.block} padding={spacing.lg}>
              <View style={styles.cardHeader}>
                <View style={styles.statusBadge}>
                  <Ionicons name="time" size={14} color={accents.amber} />
                  <Text style={styles.statusText}>Pending Approval</Text>
                </View>
                <Text style={styles.date}>{formatDate(rx.createdAt)}</Text>
              </View>

              <Text style={styles.rxTitle}>{rx.title}</Text>
              {rx.doctorName && (
                <View style={styles.doctorInfo}>
                  <Ionicons name="medkit" size={15} color={accents.sky} />
                  <Text style={styles.doctorText}>Dr. {rx.doctorName}{rx.doctorSpecialty ? ` · ${rx.doctorSpecialty}` : ""}</Text>
                </View>
              )}

              {rx.diagnosis && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Diagnosis</Text>
                  <Text style={styles.sectionContent}>{rx.diagnosis}</Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Medications</Text>
                {rx.medications.map((med, i) => (
                  <View key={i} style={{ marginBottom: spacing.sm }}>
                    <Text style={styles.medName}>• {med.name}{med.dosage && ` - ${med.dosage}`}</Text>
                    {med.frequency && <Text style={styles.medDetail}>Frequency: {med.frequency}</Text>}
                    {med.duration && <Text style={styles.medDetail}>Duration: {med.duration}</Text>}
                  </View>
                ))}
              </View>

              {(rx.instructions || rx.notes) && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Instructions</Text>
                  <Text style={styles.sectionContent}>{rx.instructions || rx.notes}</Text>
                </View>
              )}

              <View style={styles.actions}>
                <Pressable style={[styles.actionBtn, { backgroundColor: accents.rose }, processingId !== null && { opacity: 0.6 }]} onPress={() => (setSelectedPrescription(rx), setShowRejectionModal(true))} disabled={processingId !== null}>
                  {processingId === rx.id ? <ActivityIndicator color="#fff" /> : <><Ionicons name="close-circle" size={18} color="#fff" /><Text style={styles.actionText}>Reject</Text></>}
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: accents.emerald }, processingId !== null && { opacity: 0.6 }]} onPress={() => handleApprove(rx)} disabled={processingId !== null}>
                  {processingId === rx.id ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={styles.actionText}>Approve</Text></>}
                </Pressable>
              </View>
            </GlassCard>
          ))}
        </ScrollView>
      )}

      <Modal visible={showRejectionModal && !!selectedPrescription} transparent animationType="fade" onRequestClose={() => setShowRejectionModal(false)}>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard} padding={spacing.xl}>
            <Text style={styles.modalTitle}>Reject Prescription</Text>
            <Text style={styles.muted}>Please provide a reason for rejecting "{selectedPrescription?.title}"</Text>
            <GlassField placeholder="Reason for rejection (optional)" value={rejectionReason} onChangeText={setRejectionReason} multiline style={{ height: 80 }} containerStyle={{ marginTop: spacing.md }} />
            <View style={styles.modalButtons}>
              <GlassButton label="Cancel" variant="ghost" onPress={() => (setShowRejectionModal(false), setRejectionReason(""), setSelectedPrescription(null))} style={{ flex: 1 }} />
              <GlassButton label="Reject" color={accents.rose} onPress={confirmRejection} loading={processingId === selectedPrescription?.id} style={{ flex: 1 }} />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
    title: { ...typography.h1, color: theme.colors.text },
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.sm, padding: spacing.xl },
    emptyTitle: { ...typography.h1, color: theme.colors.text, marginTop: spacing.sm },
    muted: { ...typography.caption, color: theme.colors.textSecondary, textAlign: "center" },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    block: { marginBottom: spacing.lg },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: withAlpha(accents.amber, 0.14), paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: R.pill },
    statusText: { fontSize: 12, fontWeight: "700", color: accents.amber },
    date: { ...typography.caption, color: theme.colors.textTertiary },
    rxTitle: { ...typography.title, color: theme.colors.text, marginBottom: spacing.sm },
    doctorInfo: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.sm },
    doctorText: { ...typography.caption, color: accents.sky, fontWeight: "600" },
    section: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
    sectionLabel: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.xs },
    sectionContent: { ...typography.body, color: theme.colors.textSecondary, lineHeight: 20 },
    medName: { ...typography.label, color: theme.colors.text },
    medDetail: { ...typography.caption, color: theme.colors.textSecondary, marginLeft: spacing.md },
    actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
    actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 12, borderRadius: R.pill },
    actionText: { color: "#fff", fontSize: 15, fontWeight: "700" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: spacing.xl },
    modalCard: {},
    modalTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.sm },
    modalButtons: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  });
