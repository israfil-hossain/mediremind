import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import {
  getPendingPrescriptions,
  approvePrescription,
  rejectPrescription,
  SharedPrescription,
} from "../../../utils/prescriptionManager";

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
  const [selectedPrescription, setSelectedPrescription] =
    useState<SharedPrescription | null>(null);

  const loadPendingPrescriptions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const pending = await getPendingPrescriptions(user.uid);
      setPrescriptions(pending);
    } catch (error) {
      console.error("Error loading pending prescriptions:", error);
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

  const handleApprove = async (prescription: SharedPrescription) => {
    if (!user) return;

    Alert.alert(
      "Approve Prescription",
      `Are you sure you want to approve the prescription "${prescription.title}"?\n\nThis will automatically add medications to your reminder list.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          style: "default",
          onPress: async () => {
            try {
              setProcessingId(prescription.id);
              await approvePrescription(prescription.id, user.uid);
              Alert.alert(
                "Success",
                "Prescription approved! Medications have been added to your reminders."
              );
              await loadPendingPrescriptions();
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to approve prescription");
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = (prescription: SharedPrescription) => {
    setSelectedPrescription(prescription);
    setShowRejectionModal(true);
  };

  const confirmRejection = async () => {
    if (!selectedPrescription || !user) return;

    try {
      setProcessingId(selectedPrescription.id);
      await rejectPrescription(
        selectedPrescription.id,
        user.uid,
        rejectionReason
      );
      Alert.alert("Success", "Prescription rejected");
      setShowRejectionModal(false);
      setRejectionReason("");
      setSelectedPrescription(null);
      await loadPendingPrescriptions();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to reject prescription");
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";

    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch (error) {
      return "N/A";
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#FF9800", "#F57C00"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Prescriptions</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>Loading pending prescriptions...</Text>
        </View>
      ) : prescriptions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="checkmark-circle-outline" size={80} color="#4CAF50" />
          <Text style={styles.emptyTitle}>All Caught Up!</Text>
          <Text style={styles.emptyText}>
            You don't have any pending prescriptions
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadPendingPrescriptions} />
          }
        >
          {prescriptions.map((prescription) => (
            <View key={prescription.id} style={styles.prescriptionCard}>
              <View style={styles.cardHeader}>
                <View style={styles.statusBadge}>
                  <Ionicons name="time" size={16} color="#FF9800" />
                  <Text style={styles.statusText}>Pending Approval</Text>
                </View>
                <Text style={styles.date}>{formatDate(prescription.createdAt)}</Text>
              </View>

              <Text style={styles.title}>{prescription.title}</Text>

              {prescription.doctorName && (
                <View style={styles.doctorInfo}>
                  <Ionicons name="medkit" size={16} color="#2196F3" />
                  <Text style={styles.doctorText}>
                    Dr. {prescription.doctorName}
                    {prescription.doctorSpecialty
                      ? ` - ${prescription.doctorSpecialty}`
                      : ""}
                  </Text>
                </View>
              )}

              {prescription.diagnosis && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Diagnosis:</Text>
                  <Text style={styles.sectionContent}>
                    {prescription.diagnosis}
                  </Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Medications:</Text>
                {prescription.medications.map((med, index) => (
                  <View key={index} style={styles.medicationItem}>
                    <Text style={styles.medicationName}>
                      • {med.name}
                      {med.dosage && ` - ${med.dosage}`}
                    </Text>
                    {med.frequency && (
                      <Text style={styles.medicationDetail}>
                        Frequency: {med.frequency}
                      </Text>
                    )}
                    {med.duration && (
                      <Text style={styles.medicationDetail}>
                        Duration: {med.duration}
                      </Text>
                    )}
                  </View>
                ))}
              </View>

              {(prescription.instructions || prescription.notes) && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Instructions:</Text>
                  <Text style={styles.sectionContent}>
                    {prescription.instructions || prescription.notes}
                  </Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[
                    styles.rejectButton,
                    processingId === prescription.id && styles.buttonDisabled,
                  ]}
                  onPress={() => handleReject(prescription)}
                  disabled={processingId !== null}
                >
                  {processingId === prescription.id ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="close-circle" size={20} color="white" />
                      <Text style={styles.buttonText}>Reject</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.approveButton,
                    processingId === prescription.id && styles.buttonDisabled,
                  ]}
                  onPress={() => handleApprove(prescription)}
                  disabled={processingId !== null}
                >
                  {processingId === prescription.id ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="white" />
                      <Text style={styles.buttonText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Rejection Reason Modal */}
      {showRejectionModal && selectedPrescription && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reject Prescription</Text>
            <Text style={styles.modalMessage}>
              Please provide a reason for rejecting "{selectedPrescription.title}"
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="Reason for rejection (optional)"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRejectionModal(false);
                  setRejectionReason("");
                  setSelectedPrescription(null);
                }}
                disabled={processingId !== null}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmRejection}
                disabled={processingId !== null}
              >
                {processingId === selectedPrescription.id ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.modalButtonText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  prescriptionCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF9800",
    marginLeft: 4,
  },
  date: {
    fontSize: 12,
    color: theme.colors.textTertiary,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 8,
  },
  doctorInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  doctorText: {
    fontSize: 14,
    color: "#2196F3",
    marginLeft: 4,
    fontWeight: "600",
  },
  section: {
    marginTop: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  sectionContent: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  medicationItem: {
    marginLeft: 8,
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 2,
  },
  medicationDetail: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f44336",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: theme.colors.background,
  },
  confirmButton: {
    backgroundColor: "#f44336",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
