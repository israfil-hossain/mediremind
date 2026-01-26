import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import {
  getPrescriptions,
  deletePrescription,
  Prescription,
} from "../../../utils/storage";

export default function PrescriptionsScreen() {
  const router = useRouter();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadPrescriptions = useCallback(async () => {
    try {
      const data = await getPrescriptions();
      setPrescriptions(data);
    } catch (error) {
      console.error("Error loading prescriptions:", error);
      Alert.alert("Error", "Failed to load prescriptions");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPrescriptions();
    }, [loadPrescriptions])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPrescriptions();
    setRefreshing(false);
  }, [loadPrescriptions]);

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      "Delete Prescription",
      `Are you sure you want to delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePrescription(id);
              await loadPrescriptions();
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
      month: "short",
      day: "numeric",
    });
  };

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
          <Text style={styles.headerTitle}>Prescription History</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push("/(tabs)/prescriptions/add")}
          >
            <Ionicons name="add" size={28} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {prescriptions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No Prescriptions</Text>
            <Text style={styles.emptyStateText}>
              Add your first prescription to keep track of your medical records
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push("/(tabs)/prescriptions/add")}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color="white"
                style={styles.buttonIcon}
              />
              <Text style={styles.emptyStateButtonText}>
                Add Prescription
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.prescriptionsList}>
            {prescriptions.map((prescription) => (
              <TouchableOpacity
                key={prescription.id}
                style={styles.prescriptionCard}
                onPress={() =>
                  router.push(`/(tabs)/prescriptions/${prescription.id}`)
                }
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View style={styles.iconContainer}>
                        <Ionicons
                          name="document-text"
                          size={24}
                          color="#7C4DFF"
                        />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardTitle}>
                          {prescription.title}
                        </Text>
                        <Text style={styles.cardDate}>
                          {formatDate(prescription.prescriptionDate)}
                        </Text>
                        {prescription.doctorName && (
                          <Text style={styles.cardDoctor}>
                            Dr. {prescription.doctorName}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() =>
                        handleDelete(prescription.id, prescription.title)
                      }
                    >
                      <Ionicons name="trash-outline" size={20} color="#FF5252" />
                    </TouchableOpacity>
                  </View>

                  {prescription.imageUri && (
                    <View style={styles.imageContainer}>
                      <Image
                        source={{ uri: prescription.imageUri }}
                        style={styles.prescriptionImage}
                        contentFit="cover"
                      />
                    </View>
                  )}

                  {prescription.medicationNames &&
                    prescription.medicationNames.length > 0 && (
                      <View style={styles.medicationsContainer}>
                        <Text style={styles.medicationsLabel}>
                          Medications:
                        </Text>
                        <View style={styles.medicationTags}>
                          {prescription.medicationNames
                            .slice(0, 3)
                            .map((med, index) => (
                              <View key={index} style={styles.medicationTag}>
                                <Text style={styles.medicationTagText}>
                                  {med}
                                </Text>
                              </View>
                            ))}
                          {prescription.medicationNames.length > 3 && (
                            <View style={styles.medicationTag}>
                              <Text style={styles.medicationTagText}>
                                +{prescription.medicationNames.length - 3} more
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}

                  {prescription.notes && (
                    <Text style={styles.cardNotes} numberOfLines={2}>
                      {prescription.notes}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  addButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  content: {
    flex: 1,
  },
  prescriptionsList: {
    padding: 20,
  },
  prescriptionCard: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3E5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  cardDoctor: {
    fontSize: 14,
    color: "#7C4DFF",
    fontWeight: "500",
  },
  deleteButton: {
    padding: 8,
  },
  imageContainer: {
    marginVertical: 12,
    borderRadius: 12,
    overflow: "hidden",
  },
  prescriptionImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
  },
  medicationsContainer: {
    marginTop: 12,
  },
  medicationsLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  medicationTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  medicationTag: {
    backgroundColor: "#E8EAF6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  medicationTagText: {
    fontSize: 12,
    color: "#5E35B1",
    fontWeight: "500",
  },
  cardNotes: {
    fontSize: 14,
    color: "#666",
    marginTop: 12,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    marginTop: 60,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyStateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C4DFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonIcon: {
    marginRight: 8,
  },
  emptyStateButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
