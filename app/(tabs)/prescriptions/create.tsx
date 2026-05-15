import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../../../contexts/AuthContext";
import {
  createPrescription,
  PrescriptionMedication,
  getConnectedDoctors,
  getConnectedPatients,
  ConnectedUserProfile,
} from "../../../utils/prescriptionManager";
import { useTheme } from "../../../contexts/ThemeContext";

export default function CreatePrescriptionScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { user, userProfile, userRole, refreshUser } = useAuth();

  // Form state
  const [title, setTitle] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [instructions, setInstructions] = useState("");

  // Medication state
  const [medications, setMedications] = useState<PrescriptionMedication[]>([]);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medDuration, setMedDuration] = useState("");
  const [medInstructions, setMedInstructions] = useState("");

  // Patient selection (for doctors)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUserProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<ConnectedUserProfile | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Only load connected users when userRole is available
    if (user && userRole) {
      loadConnectedUsers();
    }
  }, [user, userRole]);

  // Refresh user profile when screen is focused to ensure userRole is loaded
  useFocusEffect(
    useCallback(() => {
      const ensureUserRoleLoaded = async () => {
        if (user && !userRole) {
          // If user is logged in but role is not set, refresh the profile
          await refreshUser();
        }
      };
      ensureUserRoleLoaded();
    }, [user, userRole, refreshUser])
  );

  const loadConnectedUsers = async () => {
    if (!user || !userRole) return;

    try {
      setIsLoading(true);
      if (userRole === "doctor") {
        const patients = await getConnectedPatients(user.uid);
        setConnectedUsers(patients);
      } else {
        const doctors = await getConnectedDoctors(user.uid);
        setConnectedUsers(doctors);
      }
    } catch (error) {
      console.error("Error loading connected users:", error);
      Alert.alert("Error", "Failed to load connected users");
    } finally {
      setIsLoading(false);
    }
  };

  const addMedication = () => {
    if (!medName.trim()) {
      Alert.alert("Error", "Please enter medication name");
      return;
    }

    const newMed: PrescriptionMedication = {
      name: medName.trim(),
      dosage: medDosage.trim() || undefined,
      frequency: medFrequency.trim() || undefined,
      duration: medDuration.trim() || undefined,
      instructions: medInstructions.trim() || undefined,
    };

    setMedications([...medications, newMed]);

    // Clear inputs
    setMedName("");
    setMedDosage("");
    setMedFrequency("");
    setMedDuration("");
    setMedInstructions("");
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert("Error", "Please enter a prescription title");
      return false;
    }

    if (medications.length === 0) {
      Alert.alert("Error", "Please add at least one medication");
      return false;
    }

    if (userRole === "doctor" && !selectedPatient) {
      Alert.alert("Error", "Please select a patient");
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !user || !userProfile) return;

    try {
      setIsSaving(true);

      const sharedWith: string[] = [];

      // Determine patient and sharing
      let patientId: string;
      let patientName: string;
      let doctorId: string | undefined;

      if (userRole === "doctor") {
        if (!selectedPatient) return;
        patientId = selectedPatient.id; // Use actual UID
        patientName = selectedPatient.name;
        doctorId = user.uid;
        sharedWith.push(patientId); // Share with patient
      } else {
        patientId = user.uid;
        patientName = userProfile.name;
        // Share with all connected doctors
        sharedWith.push(...connectedUsers.map((d) => d.id));
      }

      if (!userRole) {
        Alert.alert("Error", "User role not loaded. Please try again.");
        return;
      }

      const prescriptionData = {
        createdBy: user.uid,
        createdByRole: userRole,
        patientId,
        doctorId,
        title: title.trim(),
        diagnosis: diagnosis.trim() || undefined,
        medications,
        notes: notes.trim() || undefined,
        instructions: instructions.trim() || undefined,
        patientName,
        patientAge: userProfile.patientProfile?.dateOfBirth,
        patientGender: userProfile.patientProfile?.gender,
        patientPhone: userProfile.phone,
        doctorName: userRole === "doctor" ? userProfile.name : undefined,
        doctorSpecialty: userProfile.doctorProfile?.specialty,
        doctorPhone: userRole === "doctor" ? userProfile.phone : undefined,
        doctorLicense: userProfile.doctorProfile?.licenseNumber,
        clinicName: userProfile.doctorProfile?.clinicName,
        sharedWith,
      };

      await createPrescription(prescriptionData);

      Alert.alert("Success", "Prescription created successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Error creating prescription:", error);
      Alert.alert("Error", error.message || "Failed to create prescription");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C4DFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#7C4DFF", "#5E35B1"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Prescription</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Patient Selection (for doctors only) */}
          {userRole === "doctor" && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Patient *</Text>
              {connectedUsers.length === 0 ? (
                <Text style={styles.emptyText}>No connected patients</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {connectedUsers.map((patient) => (
                    <TouchableOpacity
                      key={patient.id}
                      style={[
                        styles.patientChip,
                        selectedPatient?.id === patient.id && styles.patientChipActive,
                      ]}
                      onPress={() => setSelectedPatient(patient)}
                    >
                      <Text
                        style={[
                          styles.patientChipText,
                          selectedPatient?.id === patient.id &&
                            styles.patientChipTextActive,
                        ]}
                      >
                        {patient.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Follow-up prescription, Cold & Flu"
              value={title}
              onChangeText={setTitle}
              editable={!isSaving}
            />

            <Text style={styles.label}>Diagnosis</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter diagnosis"
              value={diagnosis}
              onChangeText={setDiagnosis}
              multiline
              numberOfLines={3}
              editable={!isSaving}
            />
          </View>

          {/* Medications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medications *</Text>

            {/* Medication List */}
            {medications.map((med, index) => (
              <View key={index} style={styles.medicationCard}>
                <View style={styles.medicationInfo}>
                  <Text style={styles.medicationName}>{med.name}</Text>
                  {med.dosage && (
                    <Text style={styles.medicationDetail}>Dosage: {med.dosage}</Text>
                  )}
                  {med.frequency && (
                    <Text style={styles.medicationDetail}>Frequency: {med.frequency}</Text>
                  )}
                  {med.duration && (
                    <Text style={styles.medicationDetail}>Duration: {med.duration}</Text>
                  )}
                  {med.instructions && (
                    <Text style={styles.medicationDetail}>
                      Instructions: {med.instructions}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => removeMedication(index)}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={20} color="#f44336" />
                </TouchableOpacity>
              </View>
            ))}

            {/* Add Medication Form */}
            <View style={styles.addMedForm}>
              <Text style={styles.addMedTitle}>Add Medication</Text>

              <TextInput
                style={styles.input}
                placeholder="Medication name *"
                value={medName}
                onChangeText={setMedName}
                editable={!isSaving}
              />

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Dosage (e.g., 500mg)"
                  value={medDosage}
                  onChangeText={setMedDosage}
                  editable={!isSaving}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Frequency (e.g., 2x daily)"
                  value={medFrequency}
                  onChangeText={setMedFrequency}
                  editable={!isSaving}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="Duration (e.g., 7 days)"
                value={medDuration}
                onChangeText={setMedDuration}
                editable={!isSaving}
              />

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Instructions (e.g., Take after meals)"
                value={medInstructions}
                onChangeText={setMedInstructions}
                multiline
                numberOfLines={2}
                editable={!isSaving}
              />

              <TouchableOpacity
                style={styles.addMedButton}
                onPress={addMedication}
                disabled={isSaving}
              >
                <Ionicons name="add-circle-outline" size={20} color="#7C4DFF" />
                <Text style={styles.addMedButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Additional Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Information</Text>

            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="General instructions for the patient"
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={3}
              editable={!isSaving}
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Additional notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              editable={!isSaving}
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text style={styles.saveButtonText}>Create Prescription</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  patientChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    marginRight: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  patientChipActive: {
    backgroundColor: "#7C4DFF",
    borderColor: "#7C4DFF",
  },
  patientChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.textSecondary,
  },
  patientChipTextActive: {
    color: "white",
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.textTertiary,
    fontStyle: "italic",
  },
  medicationCard: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: 6,
  },
  medicationDetail: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 3,
  },
  removeButton: {
    padding: 8,
  },
  addMedForm: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  addMedTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  addMedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 2,
    borderColor: "#7C4DFF",
    borderStyle: "dashed",
  },
  addMedButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7C4DFF",
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: "#7C4DFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
});
