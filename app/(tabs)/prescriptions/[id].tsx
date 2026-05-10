import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  getPrescriptionById,
  SharedPrescription,
  formatPrescriptionForWhatsApp,
} from "../../../utils/prescriptionManager";

export default function PrescriptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prescription, setPrescription] = useState<SharedPrescription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPrescription();
    }
  }, [id]);

  const loadPrescription = async () => {
    try {
      setIsLoading(true);
      const data = await getPrescriptionById(id);
      if (data) {
        setPrescription(data);
      } else {
        Alert.alert("Error", "Prescription not found");
        router.back();
      }
    } catch (error) {
      console.error("Error loading prescription:", error);
      Alert.alert("Error", "Failed to load prescription");
      router.back();
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    if (!prescription) return;

    try {
      const message = formatPrescriptionForWhatsApp(prescription);
      await Share.share({
        message,
        title: "Share Prescription",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!prescription) return;

    try {
      const message = formatPrescriptionForWhatsApp(prescription);
      const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "WhatsApp Not Found",
          "WhatsApp is not installed on this device. Would you like to share via other methods?",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Share", onPress: handleShare },
          ]
        );
      }
    } catch (error) {
      console.error("Error sharing to WhatsApp:", error);
      Alert.alert("Error", "Failed to share to WhatsApp");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      return "N/A";
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C4DFF" />
        <Text style={styles.loadingText}>Loading prescription...</Text>
      </View>
    );
  }

  if (!prescription) {
    return null;
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#7C4DFF", "#5E35B1"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescription Details</Text>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header Info */}
        <View style={styles.card}>
          <Text style={styles.prescriptionTitle}>{prescription.title}</Text>
          <Text style={styles.dateText}>
            Created: {formatDate(prescription.createdAt)}
          </Text>

          {/* Doctor Info */}
          {prescription.createdByRole === "doctor" && prescription.doctorName && (
            <View style={styles.infoSection}>
              <View style={styles.infoHeader}>
                <Ionicons name="medical" size={24} color="#4CAF50" />
                <Text style={styles.infoTitle}>Doctor Information</Text>
              </View>
              <Text style={styles.infoText}>Dr. {prescription.doctorName}</Text>
              {prescription.doctorSpecialty && (
                <Text style={styles.infoSubtext}>{prescription.doctorSpecialty}</Text>
              )}
              {prescription.clinicName && (
                <Text style={styles.infoSubtext}>{prescription.clinicName}</Text>
              )}
              {prescription.doctorPhone && (
                <Text style={styles.infoSubtext}>📞 {prescription.doctorPhone}</Text>
              )}
            </View>
          )}

          {/* Patient Info */}
          <View style={styles.infoSection}>
            <View style={styles.infoHeader}>
              <Ionicons name="person" size={24} color="#2196F3" />
              <Text style={styles.infoTitle}>Patient Information</Text>
            </View>
            <Text style={styles.infoText}>{prescription.patientName}</Text>
            {prescription.patientAge && (
              <Text style={styles.infoSubtext}>Age: {prescription.patientAge}</Text>
            )}
            {prescription.patientGender && (
              <Text style={styles.infoSubtext}>
                Gender: {prescription.patientGender}
              </Text>
            )}
          </View>
        </View>

        {/* Diagnosis */}
        {prescription.diagnosis && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="clipboard" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Diagnosis</Text>
            </View>
            <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
          </View>
        )}

        {/* Medications */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={20} color="#666" />
            <Text style={styles.sectionTitle}>Medications</Text>
          </View>

          {prescription.medications.map((med, index) => (
            <View key={index} style={styles.medicationCard}>
              <View style={styles.medicationNumber}>
                <Text style={styles.medicationNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.medicationDetails}>
                <Text style={styles.medicationName}>{med.name}</Text>
                {med.dosage && (
                  <Text style={styles.medicationInfo}>💊 Dosage: {med.dosage}</Text>
                )}
                {med.frequency && (
                  <Text style={styles.medicationInfo}>⏰ Frequency: {med.frequency}</Text>
                )}
                {med.duration && (
                  <Text style={styles.medicationInfo}>📅 Duration: {med.duration}</Text>
                )}
                {med.instructions && (
                  <Text style={styles.medicationInstructions}>
                    📝 {med.instructions}
                  </Text>
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Instructions */}
        {prescription.instructions && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Instructions</Text>
            </View>
            <Text style={styles.instructionsText}>{prescription.instructions}</Text>
          </View>
        )}

        {/* Notes */}
        {prescription.notes && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#666" />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{prescription.notes}</Text>
          </View>
        )}

        {/* Share Buttons */}
        <View style={styles.shareSection}>
          <TouchableOpacity style={styles.whatsappButton} onPress={handleWhatsAppShare}>
            <Ionicons name="logo-whatsapp" size={24} color="white" />
            <Text style={styles.whatsappButtonText}>Share on WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareAltButton} onPress={handleShare}>
            <Ionicons name="share-social" size={24} color="#7C4DFF" />
            <Text style={styles.shareAltButtonText}>Share via...</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
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
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  prescriptionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  infoSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
    marginLeft: 8,
  },
  infoText: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  diagnosisText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },
  medicationCard: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#7C4DFF",
  },
  medicationNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#7C4DFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  medicationNumberText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  medicationDetails: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  medicationInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  medicationInstructions: {
    fontSize: 14,
    color: "#555",
    fontStyle: "italic",
    marginTop: 4,
  },
  instructionsText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },
  notesText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },
  shareSection: {
    marginTop: 20,
    gap: 12,
  },
  whatsappButton: {
    backgroundColor: "#25D366",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
  },
  whatsappButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 12,
  },
  shareAltButton: {
    backgroundColor: "white",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#7C4DFF",
  },
  shareAltButtonText: {
    color: "#7C4DFF",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 12,
  },
});
