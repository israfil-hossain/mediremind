import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import {
  getPrescriptionById,
  deletePrescription,
  updatePrescription,
  Prescription,
  PrescriptionMedication,
} from "../../../utils/storage";

export default function PrescriptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleUpdate = async (updatedPrescription: Prescription) => {
    try {
      await updatePrescription(updatedPrescription);
      setPrescription(updatedPrescription);
      setIsEditing(false);
      Alert.alert("Success", "Prescription updated successfully!");
    } catch (error) {
      Alert.alert("Error", "Failed to update prescription");
    }
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
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.prescriptionCard}>
          {/* Watermark */}
          <View style={styles.watermarkContainer}>
            <View style={styles.watermarkContent}>
              <Ionicons name="medical" size={60} color="#7C4DFF33" />
              <Text style={styles.watermarkText}>MedRemind</Text>
            </View>
          </View>

          {/* Prescription Header - Rx Symbol */}
          <View style={styles.prescriptionHeader}>
            <View style={styles.rxSymbolContainer}>
              <Text style={styles.rxSymbol}>Rx</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.prescriptionTitle}>MEDICAL PRESCRIPTION</Text>
              {prescription.hospitalName && (
                <Text style={styles.hospitalName}>{prescription.hospitalName}</Text>
              )}
            </View>
          </View>

          {/* Prescription Date */}
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Date:</Text>
            <Text style={styles.dateValue}>{formatDate(prescription.prescriptionDate)}</Text>
            {prescription.nextVisitDate && (
              <>
                <Text style={styles.dateLabel}> | Next Visit:</Text>
                <Text style={styles.dateValue}>{formatDate(prescription.nextVisitDate)}</Text>
              </>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Patient Information Section with Vitals */}
          <View style={styles.section}>
            <View style={styles.sectionRow}>
              <Ionicons name="person" size={18} color="#5E35B1" style={styles.sectionIcon} />
              <Text style={styles.sectionLabel}>Patient Information</Text>
            </View>

            {prescription.patientName && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{prescription.patientName}</Text>
              </View>
            )}

            {/* Vitals Grid */}
            {(prescription.patientAge || prescription.patientGender || prescription.patientWeight ||
              prescription.patientBP || prescription.patientPulse || prescription.patientTemperature) && (
              <View style={styles.vitalsGrid}>
                {prescription.patientAge && (
                  <View style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>Age</Text>
                    <Text style={styles.vitalValue}>{prescription.patientAge} yrs</Text>
                  </View>
                )}
                {prescription.patientGender && (
                  <View style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>Gender</Text>
                    <Text style={styles.vitalValue}>{prescription.patientGender}</Text>
                  </View>
                )}
                {prescription.patientWeight && (
                  <View style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>Weight</Text>
                    <Text style={styles.vitalValue}>{prescription.patientWeight} kg</Text>
                  </View>
                )}
                {prescription.patientBP && (
                  <View style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>BP</Text>
                    <Text style={styles.vitalValue}>{prescription.patientBP}</Text>
                  </View>
                )}
                {prescription.patientPulse && (
                  <View style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>Pulse</Text>
                    <Text style={styles.vitalValue}>{prescription.patientPulse}</Text>
                  </View>
                )}
                {prescription.patientTemperature && (
                  <View style={styles.vitalItem}>
                    <Text style={styles.vitalLabel}>Temp</Text>
                    <Text style={styles.vitalValue}>{prescription.patientTemperature}°F</Text>
                  </View>
                )}
              </View>
            )}

            {prescription.chiefComplaint && (
              <>
                <View style={styles.sectionRow}>
                  <Text style={styles.subLabel}>Chief Complaint:</Text>
                </View>
                <Text style={styles.contentText}>{prescription.chiefComplaint}</Text>
              </>
            )}

            {prescription.patientPhone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Phone:</Text>
                <Text style={styles.infoValue}>{prescription.patientPhone}</Text>
              </View>
            )}
            {prescription.patientAddress && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{prescription.patientAddress}</Text>
              </View>
            )}
            {prescription.patientDiagnosis && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Known Conditions:</Text>
                <Text style={styles.infoValue}>{prescription.patientDiagnosis}</Text>
              </View>
            )}
          </View>

          {/* Medications - Table Format */}
          {prescription.medications && prescription.medications.length > 0 && (
            <View style={styles.section}>
              <View style={styles.medicationsHeader}>
                <Text style={styles.rxSymbolSmall}>℞</Text>
                <Text style={styles.medicationsTitle}>Prescribed Medications</Text>
              </View>

              {/* Medication Table Header */}
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>#</Text>
                <Text style={styles.tableHeaderCellMed}>Medicine</Text>
                <Text style={styles.tableHeaderCell}>Dosage</Text>
                <Text style={styles.tableHeaderCell}>Freq</Text>
                <Text style={styles.tableHeaderCell}>Duration</Text>
              </View>

              {/* Medication Rows */}
              <View style={styles.tableBody}>
                {prescription.medications.map((med, index) => (
                  <View key={index} style={styles.tableRow}>
                    <View style={styles.tableCell}>
                      <Text style={styles.tableCellNumber}>{index + 1}</Text>
                    </View>
                    <View style={styles.tableCellMed}>
                      <Text style={styles.tableCellTextMain}>{med.name}</Text>
                      {med.instructions && (
                        <Text style={styles.tableCellSubtext}>{med.instructions}</Text>
                      )}
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.tableCellText}>{med.dosage || "-"}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.tableCellText}>{med.frequency || "-"}</Text>
                    </View>
                    <View style={styles.tableCell}>
                      <Text style={styles.tableCellText}>{med.duration || "-"}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Diagnosis & Notes */}
          <View style={styles.section}>
            {prescription.diagnosis && (
              <>
                <View style={styles.sectionRow}>
                  <Ionicons name="search" size={18} color="#5E35B1" style={styles.sectionIcon} />
                  <Text style={styles.sectionLabel}>Diagnosis</Text>
                </View>
                <Text style={styles.diagnosisText}>{prescription.diagnosis}</Text>
              </>
            )}

            {prescription.notes && (
              <>
                <View style={styles.notesHeader}>
                  <Ionicons name="document-text-outline" size={20} color="#5E35B1" />
                  <Text style={styles.notesTitle}>Additional Notes</Text>
                </View>
                <View style={styles.notesBox}>
                  <Text style={styles.notesContent}>{prescription.notes}</Text>
                </View>
              </>
            )}
          </View>

          {/* Prescription Image */}
          {prescription.imageUri && (
            <View style={styles.section}>
              <Text style={styles.imageSectionTitle}>Prescription Image</Text>
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: prescription.imageUri }}
                  style={styles.prescriptionImage}
                  contentFit="contain"
                />
              </View>
            </View>
          )}

          {/* Doctor Information Section */}
          {(prescription.doctorName || prescription.doctorPhone || prescription.doctorEmail) && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Ionicons name="medkit" size={18} color="#5E35B1" style={styles.sectionIcon} />
                <Text style={styles.sectionLabel}>Doctor Information</Text>
              </View>

              {prescription.doctorName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Doctor:</Text>
                  <Text style={styles.infoValue}>
                    {prescription.doctorName}
                    {prescription.doctorSpecialty && ` (${prescription.doctorSpecialty})`}
                  </Text>
                </View>
              )}
              {prescription.doctorPhone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{prescription.doctorPhone}</Text>
                </View>
              )}
              {prescription.doctorEmail && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Email:</Text>
                  <Text style={styles.infoValue}>{prescription.doctorEmail}</Text>
                </View>
              )}
              {prescription.doctorAddress && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{prescription.doctorAddress}</Text>
                </View>
              )}
              {prescription.doctorWebsite && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Website:</Text>
                  <Text style={styles.infoValue}>{prescription.doctorWebsite}</Text>
                </View>
              )}
            </View>
          )}

          {/* Hospital Information Section */}
          {(prescription.hospitalName || prescription.hospitalAddress || prescription.hospitalPhone) && (
            <View style={styles.section}>
              <View style={styles.sectionRow}>
                <Ionicons name="business" size={18} color="#5E35B1" style={styles.sectionIcon} />
                <Text style={styles.sectionLabel}>Hospital/Clinic Info</Text>
              </View>

              {prescription.hospitalName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Name:</Text>
                  <Text style={styles.infoValue}>{prescription.hospitalName}</Text>
                </View>
              )}
              {prescription.hospitalAddress && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Address:</Text>
                  <Text style={styles.infoValue}>{prescription.hospitalAddress}</Text>
                </View>
              )}
              {prescription.hospitalPhone && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Phone:</Text>
                  <Text style={styles.infoValue}>{prescription.hospitalPhone}</Text>
                </View>
              )}
            </View>
          )}

          {/* Footer with Signature */}
          <View style={styles.footer}>
            <View style={styles.footerLine} />

            {/* Doctor Signature Area */}
            {(prescription.doctorName || prescription.hospitalName) && (
              <View style={styles.signatureSection}>
                {prescription.doctorName && (
                  <View style={styles.signatureArea}>
                    <View style={styles.signatureLine} />
                    <Text style={styles.signatureLabel}>Doctor's Signature</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.footerInfo}>
              <Text style={styles.footerText}>Generated by MedRemind App</Text>
              <Text style={styles.footerDate}>
                Created: {formatDate(prescription.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        animationType="slide"
        visible={isEditing}
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditing(false)}
      >
        {prescription && (
          <PrescriptionEditModal
            prescription={prescription}
            onSave={handleUpdate}
            onClose={() => setIsEditing(false)}
          />
        )}
      </Modal>
    </View>
  );
}

// Prescription Edit Modal Component
interface PrescriptionEditModalProps {
  prescription: Prescription;
  onSave: (prescription: Prescription) => void;
  onClose: () => void;
}

function PrescriptionEditModal({ prescription, onSave, onClose }: PrescriptionEditModalProps) {
  const [formData, setFormData] = useState<Prescription>(prescription);

  const handleChange = (field: keyof Prescription, value: any) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleMedicationChange = (index: number, field: keyof PrescriptionMedication, value: string) => {
    const updatedMeds = [...(formData.medications || [])];
    updatedMeds[index] = { ...updatedMeds[index], [field]: value };
    setFormData({ ...formData, medications: updatedMeds });
  };

  const addMedication = () => {
    const newMed: PrescriptionMedication = { name: "New Medication" };
    setFormData({
      ...formData,
      medications: [...(formData.medications || []), newMed],
    });
  };

  const removeMedication = (index: number) => {
    const updatedMeds = formData.medications?.filter((_, i) => i !== index);
    setFormData({ ...formData, medications: updatedMeds });
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <View style={modalStyles.container}>
      <View style={modalStyles.header}>
        <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={modalStyles.title}>Edit Prescription</Text>
        <TouchableOpacity onPress={handleSave} style={modalStyles.saveButton}>
          <Ionicons name="checkmark" size={24} color="#7C4DFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={modalStyles.content}>
        <View style={modalStyles.section}>
          <Text style={modalStyles.sectionTitle}>Basic Information</Text>
          <TextInput
            style={modalStyles.input}
            value={formData.title}
            onChangeText={(value) => handleChange("title", value)}
            placeholder="Prescription Title"
          />
          <TextInput
            style={modalStyles.input}
            value={formData.prescriptionDate}
            onChangeText={(value) => handleChange("prescriptionDate", value)}
            placeholder="Prescription Date (YYYY-MM-DD)"
          />
          <TextInput
            style={modalStyles.input}
            value={formData.nextVisitDate || ""}
            onChangeText={(value) => handleChange("nextVisitDate", value)}
            placeholder="Next Visit Date (YYYY-MM-DD)"
          />
        </View>

        <View style={modalStyles.section}>
          <Text style={modalStyles.sectionTitle}>Medical Information</Text>
          <TextInput
            style={[modalStyles.input, modalStyles.textArea]}
            value={formData.symptoms || ""}
            onChangeText={(value) => handleChange("symptoms", value)}
            placeholder="Symptoms"
            multiline
          />
          <TextInput
            style={modalStyles.input}
            value={formData.diagnosis || ""}
            onChangeText={(value) => handleChange("diagnosis", value)}
            placeholder="Diagnosis"
          />
          <TextInput
            style={[modalStyles.input, modalStyles.textArea]}
            value={formData.notes || ""}
            onChangeText={(value) => handleChange("notes", value)}
            placeholder="Notes"
            multiline
          />
        </View>

        <View style={modalStyles.section}>
          <Text style={modalStyles.sectionTitle}>Medications</Text>
          {formData.medications?.map((med, index) => (
            <View key={index} style={modalStyles.medicationEditCard}>
              <TextInput
                style={modalStyles.input}
                value={med.name}
                onChangeText={(value) => handleMedicationChange(index, "name", value)}
                placeholder="Medication Name"
              />
              <TextInput
                style={modalStyles.input}
                value={med.dosage || ""}
                onChangeText={(value) => handleMedicationChange(index, "dosage", value)}
                placeholder="Dosage (e.g., 10mg)"
              />
              <TextInput
                style={modalStyles.input}
                value={med.frequency || ""}
                onChangeText={(value) => handleMedicationChange(index, "frequency", value)}
                placeholder="Frequency (e.g., Twice daily)"
              />
              <TextInput
                style={modalStyles.input}
                value={med.duration || ""}
                onChangeText={(value) => handleMedicationChange(index, "duration", value)}
                placeholder="Duration (e.g., 7 days)"
              />
              <TextInput
                style={modalStyles.input}
                value={med.instructions || ""}
                onChangeText={(value) => handleMedicationChange(index, "instructions", value)}
                placeholder="Instructions"
              />
              <TouchableOpacity
                style={modalStyles.removeButton}
                onPress={() => removeMedication(index)}
              >
                <Ionicons name="trash" size={20} color="#FF5252" />
                <Text style={modalStyles.removeButtonText}>Remove Medication</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={modalStyles.addButton} onPress={addMedication}>
            <Ionicons name="add-circle" size={24} color="#7C4DFF" />
            <Text style={modalStyles.addButtonText}>Add Medication</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const modalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  saveButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5E35B1",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  medicationEditCard: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  removeButtonText: {
    color: "#FF5252",
    fontWeight: "600",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#7C4DFF",
    borderStyle: "dashed",
    gap: 8,
  },
  addButtonText: {
    color: "#7C4DFF",
    fontWeight: "600",
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f0f0",
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
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
  },
  content: {
    flex: 1,
    backgroundColor: "#f0f0f0",
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
  prescriptionCard: {
    margin: 16,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    position: "relative",
  },
  watermarkContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 0,
  },
  watermarkContent: {
    alignItems: "center",
    opacity: 0.3,
    transform: [{ rotate: "-30deg" }],
  },
  watermarkText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#7C4DFF",
    marginTop: 8,
  },
  prescriptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#5E35B1",
    position: "relative",
    zIndex: 1,
    backgroundColor: "white",
  },
  rxSymbolContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#5E35B1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rxSymbol: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
  },
  rxSymbolSmall: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#5E35B1",
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  prescriptionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    letterSpacing: 1,
  },
  hospitalName: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  dateRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "white",
    flexWrap: "wrap",
    position: "relative",
    zIndex: 1,
  },
  dateLabel: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
    marginRight: 4,
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 13,
    color: "#333",
    marginRight: 16,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 16,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    position: "relative",
    zIndex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  vitalsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  vitalItem: {
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
    padding: 10,
    minWidth: 100,
    flex: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  vitalLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
    fontWeight: "600",
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionIcon: {
    marginRight: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5E35B1",
  },
  complaintText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
    marginTop: 4,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#5E35B1",
    marginTop: 12,
    marginBottom: 4,
  },
  contentText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    marginTop: 4,
  },
  symptomsText: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    marginTop: 4,
  },
  diagnosisText: {
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
    marginTop: 4,
  },
  infoSectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
    width: 80,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: "#333",
    flex: 1,
  },
  medicationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  medicationsTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#5E35B1",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    flex: 0.8,
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  tableHeaderCellMed: {
    flex: 2,
    fontSize: 12,
    fontWeight: "bold",
    color: "white",
    textAlign: "left",
    paddingLeft: 8,
  },
  tableBody: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tableCell: {
    flex: 0.8,
    alignItems: "center",
    justifyContent: "center",
  },
  tableCellMed: {
    flex: 2,
    justifyContent: "center",
    paddingLeft: 8,
  },
  tableCellNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#5E35B1",
    textAlign: "center",
  },
  tableCellTextMain: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  tableCellSubtext: {
    fontSize: 11,
    color: "#999",
    fontStyle: "italic",
  },
  tableCellText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  medicationItem: {
    flexDirection: "row",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  medicationNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#5E35B1",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  medicationNumberText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  medicationDetails: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  medicationInfo: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  imageSectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  imageContainer: {
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  prescriptionImage: {
    width: "100%",
    height: 400,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  notesTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  notesBox: {
    backgroundColor: "#FFFBF0",
    borderLeftWidth: 4,
    borderLeftColor: "#FFA000",
    padding: 12,
    borderRadius: 4,
  },
  notesContent: {
    fontSize: 14,
    color: "#555",
    lineHeight: 22,
  },
  footer: {
    padding: 16,
    position: "relative",
    zIndex: 1,
    backgroundColor: "white",
  },
  signatureSection: {
    marginBottom: 16,
  },
  signatureArea: {
    alignItems: "center",
  },
  signatureLine: {
    width: 200,
    height: 1,
    backgroundColor: "#333",
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 12,
    color: "#666",
  },
  footerLine: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginBottom: 12,
  },
  footerInfo: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  footerDate: {
    fontSize: 11,
    color: "#BBB",
  },
});
