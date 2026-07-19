import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../contexts/ThemeContext";
import { UserProfile, getUserProfile } from "../../utils/userManagement";
import { getUserPrescriptions, SharedPrescription } from "../../utils/prescriptionManager";

export default function PatientDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [patient, setPatient] = useState<UserProfile | null>(null);
  const [prescriptions, setPrescriptions] = useState<SharedPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPatientData();
    }
  }, [id]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const [profile, patientPrescriptions] = await Promise.all([
        getUserProfile(id),
        getUserPrescriptions(id, "patient"),
      ]);
      setPatient(profile);
      setPrescriptions(patientPrescriptions);
    } catch (error) {
      console.error("Error loading patient data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#0D9488" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={styles.emptyTitle}>Patient not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#0D9488", "#134E4A"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Patient Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Patient Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(patient.name || "P")[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{patient.name}</Text>
          <Text style={styles.email}>{patient.email}</Text>
          <Text style={styles.phone}>{patient.phone}</Text>

          {patient.patientProfile && (
            <View style={styles.detailsGrid}>
              {patient.patientProfile.dateOfBirth && (
                <View style={styles.detailItem}>
                  <Ionicons name="calendar-outline" size={16} color="#0D9488" />
                  <Text style={styles.detailLabel}>DOB</Text>
                  <Text style={styles.detailValue}>{patient.patientProfile.dateOfBirth}</Text>
                </View>
              )}
              {patient.patientProfile.gender && (
                <View style={styles.detailItem}>
                  <Ionicons name="male-female-outline" size={16} color="#0D9488" />
                  <Text style={styles.detailLabel}>Gender</Text>
                  <Text style={styles.detailValue}>
                    {patient.patientProfile.gender.charAt(0).toUpperCase() +
                      patient.patientProfile.gender.slice(1)}
                  </Text>
                </View>
              )}
              {patient.patientProfile.bloodGroup && (
                <View style={styles.detailItem}>
                  <Ionicons name="water-outline" size={16} color="#0D9488" />
                  <Text style={styles.detailLabel}>Blood</Text>
                  <Text style={styles.detailValue}>{patient.patientProfile.bloodGroup}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Address */}
        {patient.patientProfile?.address && (
          <View style={styles.infoCard}>
            <Ionicons name="location-outline" size={20} color="#0D9488" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{patient.patientProfile.address}</Text>
            </View>
          </View>
        )}

        {/* Emergency Contact */}
        {patient.patientProfile?.emergencyContact && (
          <View style={styles.infoCard}>
            <Ionicons name="call-outline" size={20} color="#EF4444" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Emergency Contact</Text>
              <Text style={styles.infoValue}>{patient.patientProfile.emergencyContact}</Text>
              {patient.patientProfile.emergencyPhone && (
                <Text style={styles.infoValue}>{patient.patientProfile.emergencyPhone}</Text>
              )}
            </View>
          </View>
        )}

        {/* Prescriptions */}
        <Text style={styles.sectionTitle}>Prescriptions</Text>
        {prescriptions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No prescriptions yet</Text>
          </View>
        ) : (
          prescriptions.map((prescription) => (
            <View key={prescription.id} style={styles.prescriptionCard}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.prescriptionTitle}>{prescription.title}</Text>
                <Text style={[styles.prescriptionStatus, { color: prescription.status === "approved" ? "#22C55E" : prescription.status === "rejected" ? "#EF4444" : "#F59E0B" }]}>
                  {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                </Text>
              </View>
              {prescription.diagnosis && (
                <Text style={styles.prescriptionDiagnosis}>{prescription.diagnosis}</Text>
              )}
              {prescription.medications.map((med, idx) => (
                <Text key={idx} style={styles.medicationText}>
                  • {med.name} {med.dosage && `- ${med.dosage}`} {med.frequency && `(${med.frequency})`}
                </Text>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
    profileCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 20,
      padding: 20,
      alignItems: "center",
      marginBottom: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: "#F0FDFA",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 12,
    },
    avatarText: {
      fontSize: 32,
      fontWeight: "bold",
      color: "#0D9488",
    },
    name: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 4,
    },
    email: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    phone: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 12,
    },
    detailsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 12,
      marginTop: 8,
    },
    detailItem: {
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      minWidth: 80,
    },
    detailLabel: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      marginTop: 4,
    },
    detailValue: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 2,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    infoContent: {
      flex: 1,
      marginLeft: 12,
    },
    infoLabel: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    infoValue: {
      fontSize: 14,
      color: theme.colors.text,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      marginTop: 8,
      marginBottom: 12,
    },
    emptyCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 12,
    },
    prescriptionCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    prescriptionTitle: {
      fontSize: 16,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 4,
      flex: 1,
    },
    prescriptionStatus: {
      fontSize: 12,
      fontWeight: "600",
      marginLeft: 8,
    },
    prescriptionDiagnosis: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      marginBottom: 8,
    },
    medicationText: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginLeft: 4,
      marginBottom: 2,
    },
  });
