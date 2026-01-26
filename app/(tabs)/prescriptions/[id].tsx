import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import {
  getPrescriptionById,
  deletePrescription,
  Prescription,
} from "../../../utils/storage";

export default function PrescriptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prescription, setPrescription] = useState<Prescription | null>(null);

  const loadPrescription = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPrescriptionById(id);
      setPrescription(data);
    } catch (error) {
      console.error("Error loading prescription:", error);
      Alert.alert("Error", "Failed to load prescription");
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadPrescription();
    }, [loadPrescription])
  );

  const handleDelete = () => {
    if (!prescription) return;

    Alert.alert(
      "Delete Prescription",
      `Are you sure you want to delete "${prescription.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePrescription(prescription.id);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to delete prescription");
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (!prescription) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={["#7C4DFF", "#5E35B1"]} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Prescription</Text>
            <View style={styles.placeholder} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#7C4DFF", "#5E35B1"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Prescription Details</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
          >
            <Ionicons name="trash-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.detailsContainer}>
          {/* Title Section */}
          <View style={styles.section}>
            <Text style={styles.title}>{prescription.title}</Text>
            <Text style={styles.date}>
              {formatDate(prescription.prescriptionDate)}
            </Text>
          </View>

          {/* Doctor Section */}
          {prescription.doctorName && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medical" size={20} color="#7C4DFF" />
                <Text style={styles.sectionTitle}>Doctor</Text>
              </View>
              <Text style={styles.sectionContent}>
                Dr. {prescription.doctorName}
              </Text>
            </View>
          )}

          {/* Image Section */}
          {prescription.imageUri && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="image" size={20} color="#7C4DFF" />
                <Text style={styles.sectionTitle}>Prescription Image</Text>
              </View>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: prescription.imageUri }}
                  style={styles.prescriptionImage}
                  contentFit="contain"
                />
              </View>
            </View>
          )}

          {/* Medications Section */}
          {prescription.medicationNames &&
            prescription.medicationNames.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="medical-outline" size={20} color="#7C4DFF" />
                  <Text style={styles.sectionTitle}>Medications</Text>
                </View>
                <View style={styles.medicationsList}>
                  {prescription.medicationNames.map((med, index) => (
                    <View key={index} style={styles.medicationItem}>
                      <View style={styles.medicationBullet} />
                      <Text style={styles.medicationText}>{med}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          {/* Notes Section */}
          {prescription.notes && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-text" size={20} color="#7C4DFF" />
                <Text style={styles.sectionTitle}>Notes</Text>
              </View>
              <Text style={styles.notesContent}>{prescription.notes}</Text>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.metadata}>
            <Text style={styles.metadataText}>
              Added on {formatDate(prescription.createdAt)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
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
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "white",
    flex: 1,
    textAlign: "center",
  },
  deleteButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
  },
  detailsContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  date: {
    fontSize: 16,
    color: "#7C4DFF",
    fontWeight: "500",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginLeft: 8,
  },
  sectionContent: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  prescriptionImage: {
    width: "100%",
    height: 400,
  },
  medicationsList: {
    gap: 12,
  },
  medicationItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  medicationBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#7C4DFF",
    marginRight: 12,
  },
  medicationText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  notesContent: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  metadata: {
    alignItems: "center",
    paddingVertical: 16,
  },
  metadataText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
});
