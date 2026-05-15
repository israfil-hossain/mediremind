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

export default function DoctorDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [doctor, setDoctor] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadDoctor();
    }
  }, [id]);

  const loadDoctor = async () => {
    try {
      setLoading(true);
      const profile = await getUserProfile(id);
      setDoctor(profile);
    } catch (error) {
      console.error("Error loading doctor:", error);
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

  if (!doctor) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={styles.emptyTitle}>Doctor not found</Text>
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
          <Text style={styles.headerTitle}>Doctor Details</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Doctor Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(doctor.name || "D")[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>Dr. {doctor.name}</Text>
          {doctor.doctorProfile?.specialty && (
            <View style={styles.specialtyBadge}>
              <Ionicons name="medical" size={12} color="white" />
              <Text style={styles.specialtyText}>{doctor.doctorProfile.specialty}</Text>
            </View>
          )}
          <Text style={styles.email}>{doctor.email}</Text>
          <Text style={styles.phone}>{doctor.phone}</Text>
        </View>

        {/* Professional Info */}
        {doctor.doctorProfile && (
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Professional Information</Text>

            {doctor.doctorProfile.licenseNumber && (
              <View style={styles.infoCard}>
                <Ionicons name="card-outline" size={20} color="#0D9488" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>License Number</Text>
                  <Text style={styles.infoValue}>{doctor.doctorProfile.licenseNumber}</Text>
                </View>
              </View>
            )}

            {doctor.doctorProfile.qualifications && doctor.doctorProfile.qualifications.length > 0 && (
              <View style={styles.infoCard}>
                <Ionicons name="school-outline" size={20} color="#0D9488" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Qualifications</Text>
                  {doctor.doctorProfile.qualifications.map((qual, idx) => (
                    <Text key={idx} style={styles.infoValue}>• {qual}</Text>
                  ))}
                </View>
              </View>
            )}

            {doctor.doctorProfile.yearsOfExperience !== undefined && (
              <View style={styles.infoCard}>
                <Ionicons name="time-outline" size={20} color="#0D9488" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Experience</Text>
                  <Text style={styles.infoValue}>{doctor.doctorProfile.yearsOfExperience} years</Text>
                </View>
              </View>
            )}

            {doctor.doctorProfile.clinicName && (
              <View style={styles.infoCard}>
                <Ionicons name="business-outline" size={20} color="#0D9488" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Clinic</Text>
                  <Text style={styles.infoValue}>{doctor.doctorProfile.clinicName}</Text>
                  {doctor.doctorProfile.clinicAddress && (
                    <Text style={styles.infoValue}>{doctor.doctorProfile.clinicAddress}</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Verification Status */}
        <View style={styles.verificationCard}>
          <Ionicons
            name={doctor.doctorProfile?.isVerified ? "shield-checkmark" : "shield-outline"}
            size={24}
            color={doctor.doctorProfile?.isVerified ? "#0D9488" : theme.colors.textTertiary}
          />
          <Text style={styles.verificationText}>
            {doctor.doctorProfile?.isVerified
              ? "Verified Doctor"
              : `Verification: ${doctor.doctorProfile?.verificationStatus || "pending"}`}
          </Text>
        </View>
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
      marginBottom: 8,
    },
    specialtyBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#0D9488",
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: 8,
      gap: 6,
    },
    specialtyText: {
      fontSize: 13,
      color: "white",
      fontWeight: "600",
    },
    email: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: 2,
    },
    phone: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    infoSection: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700",
      color: theme.colors.text,
      marginBottom: 12,
    },
    infoCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      marginBottom: 10,
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
    verificationCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.card,
      borderRadius: 16,
      padding: 16,
      gap: 12,
    },
    verificationText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: 12,
    },
  });
