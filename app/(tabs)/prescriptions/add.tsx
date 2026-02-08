import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import {
  addPrescription,
  Prescription,
  PrescriptionMedication,
  getUserProfile,
  UserProfile,
} from "../../../utils/storage";

export default function AddPrescriptionScreen() {
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [doctorPhone, setDoctorPhone] = useState("");
  const [doctorEmail, setDoctorEmail] = useState("");
  const [doctorAddress, setDoctorAddress] = useState("");
  const [doctorWebsite, setDoctorWebsite] = useState("");

  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [hospitalPhone, setHospitalPhone] = useState("");

  // Patient info (auto-filled from profile)
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [patientWeight, setPatientWeight] = useState("");
  const [patientBP, setPatientBP] = useState("");
  const [patientPulse, setPatientPulse] = useState("");
  const [patientTemperature, setPatientTemperature] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientDiagnosis, setPatientDiagnosis] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");

  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();

  // Medications with dosage
  const [medications, setMedications] = useState<PrescriptionMedication[]>([]);

  // Temporary medication input state
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medDuration, setMedDuration] = useState("");
  const [medInstructions, setMedInstructions] = useState("");

  const [saving, setSaving] = useState(false);

  // Auto-fill patient info from profile
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile();
      setPatientName(profile.name || "");
      setPatientAge(profile.age || "");
      setPatientGender(profile.gender || "");
      setPatientAddress(profile.address || "");
      setPatientPhone(profile.phone || "");
      setPatientDiagnosis(profile.chronicConditions || "");
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload prescription images."
        );
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please grant camera permissions to take prescription photos."
        );
        return;
      }

      // Take photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      "Add Prescription Image",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: takePhoto,
        },
        {
          text: "Choose from Library",
          onPress: pickImage,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const addMedication = () => {
    if (!medName.trim()) {
      Alert.alert("Validation Error", "Please enter medication name");
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

    // Reset form
    setMedName("");
    setMedDosage("");
    setMedFrequency("");
    setMedDuration("");
    setMedInstructions("");
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Validation Error", "Please enter a prescription title");
      return;
    }

    if (!prescriptionDate) {
      Alert.alert("Validation Error", "Please select a prescription date");
      return;
    }

    try {
      setSaving(true);

      const prescription: Prescription = {
        id: Math.random().toString(36).slice(2, 11),
        title: title.trim(),
        prescriptionDate,

        // Patient Information
        patientName: patientName.trim() || undefined,
        patientAge: patientAge.trim() || undefined,
        patientGender: patientGender.trim() || undefined,
        patientWeight: patientWeight.trim() || undefined,
        patientBP: patientBP.trim() || undefined,
        patientPulse: patientPulse.trim() || undefined,
        patientTemperature: patientTemperature.trim() || undefined,
        patientAddress: patientAddress.trim() || undefined,
        patientPhone: patientPhone.trim() || undefined,
        patientDiagnosis: patientDiagnosis.trim() || undefined,
        chiefComplaint: chiefComplaint.trim() || undefined,

        // Doctor Information
        doctorName: doctorName.trim() || undefined,
        doctorSpecialty: doctorSpecialty.trim() || undefined,
        doctorPhone: doctorPhone.trim() || undefined,
        doctorEmail: doctorEmail.trim() || undefined,
        doctorAddress: doctorAddress.trim() || undefined,
        doctorWebsite: doctorWebsite.trim() || undefined,

        // Hospital Information
        hospitalName: hospitalName.trim() || undefined,
        hospitalAddress: hospitalAddress.trim() || undefined,
        hospitalPhone: hospitalPhone.trim() || undefined,

        // Medical Information
        symptoms: symptoms.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        notes: notes.trim() || undefined,

        // Medications with details
        medications: medications.length > 0 ? medications : undefined,

        // Additional
        imageUri,
        nextVisitDate: nextVisitDate.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await addPrescription(prescription);
      Alert.alert("Success", "Prescription added successfully", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error("Error saving prescription:", error);
      Alert.alert("Error", "Failed to save prescription. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <LinearGradient colors={["#7C4DFF", "#5E35B1"]} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Prescription</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          {/* Section Header - Basic Info */}
          <View style={styles.sectionHeader}>
            <Ionicons name="medical-outline" size={20} color="#7C4DFF" />
            <Text style={styles.sectionHeaderText}>Basic Information</Text>
          </View>

          {/* Title Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Prescription Title <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Annual Checkup, Flu Prescription"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />
          </View>

          {/* Prescription Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Prescription Date <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={prescriptionDate}
              onChangeText={setPrescriptionDate}
              placeholderTextColor="#999"
            />
          </View>

          {/* Next Visit Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Next Visit Date (Follow-up)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={nextVisitDate}
              onChangeText={setNextVisitDate}
              placeholderTextColor="#999"
            />
          </View>

          {/* Section Header - Patient Information */}
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#7C4DFF" />
            <Text style={styles.sectionHeaderText}>Patient Information (Auto-filled)</Text>
          </View>

          {/* Patient Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Patient Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Patient name"
              value={patientName}
              onChangeText={setPatientName}
              placeholderTextColor="#999"
            />
          </View>

          {/* Vitals Row */}
          <View style={styles.vitalsRow}>
            <View style={styles.vitalsField}>
              <Text style={styles.label}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="Age"
                value={patientAge}
                onChangeText={setPatientAge}
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.vitalsField}>
              <Text style={styles.label}>Gender</Text>
              <TextInput
                style={styles.input}
                placeholder="M/F/O"
                value={patientGender}
                onChangeText={setPatientGender}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.vitalsField}>
              <Text style={styles.label}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                placeholder="kg"
                value={patientWeight}
                onChangeText={setPatientWeight}
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Vitals Row 2 */}
          <View style={styles.vitalsRow}>
            <View style={styles.vitalsField}>
              <Text style={styles.label}>BP (mmHg)</Text>
              <TextInput
                style={styles.input}
                placeholder="120/80"
                value={patientBP}
                onChangeText={setPatientBP}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.vitalsField}>
              <Text style={styles.label}>Pulse</Text>
              <TextInput
                style={styles.input}
                placeholder="bpm"
                value={patientPulse}
                onChangeText={setPatientPulse}
                placeholderTextColor="#999"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.vitalsField}>
              <Text style={styles.label}>Temp (°F)</Text>
              <TextInput
                style={styles.input}
                placeholder="98.6"
                value={patientTemperature}
                onChangeText={setPatientTemperature}
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Chief Complaint */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Chief Complaint</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Main reason for visit"
              value={chiefComplaint}
              onChangeText={setChiefComplaint}
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Patient Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Patient Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone number"
              value={patientPhone}
              onChangeText={setPatientPhone}
              placeholderTextColor="#999"
              keyboardType="phone-pad"
            />
          </View>

          {/* Patient Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Patient Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Patient address"
              value={patientAddress}
              onChangeText={setPatientAddress}
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Patient Chronic Conditions/Diagnosis */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Known Conditions/Diagnosis</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Chronic conditions, previous diagnoses"
              value={patientDiagnosis}
              onChangeText={setPatientDiagnosis}
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Section Header - Doctor Information */}
          <View style={styles.sectionHeader}>
            <Ionicons name="medkit" size={20} color="#7C4DFF" />
            <Text style={styles.sectionHeaderText}>Doctor Information</Text>
          </View>

          {/* Doctor Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doctor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Dr. John Smith"
              value={doctorName}
              onChangeText={setDoctorName}
              placeholderTextColor="#999"
            />
          </View>

          {/* Doctor Specialty Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doctor Specialty</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Cardiologist, General Physician"
              value={doctorSpecialty}
              onChangeText={setDoctorSpecialty}
              placeholderTextColor="#999"
            />
          </View>

          {/* Doctor Phone */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doctor Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Doctor's phone number"
              value={doctorPhone}
              onChangeText={setDoctorPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>

          {/* Doctor Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doctor Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Doctor's email"
              value={doctorEmail}
              onChangeText={setDoctorEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          {/* Doctor Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doctor Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Clinic address"
              value={doctorAddress}
              onChangeText={setDoctorAddress}
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Doctor Website */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doctor Website</Text>
            <TextInput
              style={styles.input}
              placeholder="https://doctor-website.com"
              value={doctorWebsite}
              onChangeText={setDoctorWebsite}
              keyboardType="url"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>

          {/* Section Header - Hospital Information */}
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={20} color="#7C4DFF" />
            <Text style={styles.sectionHeaderText}>Hospital/Clinic Information</Text>
          </View>

          {/* Hospital Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hospital/Clinic Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., City Hospital"
              value={hospitalName}
              onChangeText={setHospitalName}
              placeholderTextColor="#999"
            />
          </View>

          {/* Hospital Address Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hospital Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 123 Main St, City"
              value={hospitalAddress}
              onChangeText={setHospitalAddress}
              placeholderTextColor="#999"
            />
          </View>

          {/* Hospital Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Hospital Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., +1 234 567 8900"
              value={hospitalPhone}
              onChangeText={setHospitalPhone}
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>

          {/* Symptoms Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Symptoms</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your symptoms..."
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          {/* Diagnosis Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diagnosis</Text>
            <TextInput
              style={styles.input}
              placeholder="Doctor's diagnosis"
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholderTextColor="#999"
            />
          </View>

          {/* Prescription Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Prescription Date <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={prescriptionDate}
              onChangeText={setPrescriptionDate}
              placeholderTextColor="#999"
            />
          </View>

          {/* Next Visit Date Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Next Visit Date (Follow-up)</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={nextVisitDate}
              onChangeText={setNextVisitDate}
              placeholderTextColor="#999"
            />
          </View>

          {/* Section Header - Medical Information */}
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#7C4DFF" />
            <Text style={styles.sectionHeaderText}>Medical Information</Text>
          </View>

          {/* Symptoms */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Symptoms</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your symptoms..."
              value={symptoms}
              onChangeText={setSymptoms}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          {/* Diagnosis */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diagnosis</Text>
            <TextInput
              style={styles.input}
              placeholder="Doctor's diagnosis"
              value={diagnosis}
              onChangeText={setDiagnosis}
              placeholderTextColor="#999"
            />
          </View>

          {/* Image Upload */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prescription Image</Text>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: imageUri }}
                  style={styles.imagePreview}
                  contentFit="cover"
                />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => setImageUri(undefined)}
                >
                  <Ionicons name="close-circle" size={28} color="#FF5252" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={showImageOptions}
              >
                <Ionicons name="camera-outline" size={32} color="#7C4DFF" />
                <Text style={styles.uploadText}>Add Photo</Text>
                <Text style={styles.uploadSubtext}>
                  Take a photo or choose from gallery
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Section Header - Medications */}
          <View style={styles.sectionHeader}>
            <Ionicons name="pill" size={20} color="#7C4DFF" />
            <Text style={styles.sectionHeaderText}>Prescribed Medications</Text>
          </View>

          {/* Medications with detailed form */}
          <View style={styles.inputGroup}>
            <View style={styles.medicationFormContainer}>
              <TextInput
                style={[styles.input, styles.medFormField]}
                placeholder="Medication Name *"
                value={medName}
                onChangeText={setMedName}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.medFormField]}
                placeholder="Dosage (e.g., 10mg, 5ml)"
                value={medDosage}
                onChangeText={setMedDosage}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.medFormField]}
                placeholder="Frequency (e.g., Twice daily)"
                value={medFrequency}
                onChangeText={setMedFrequency}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.medFormField]}
                placeholder="Duration (e.g., 7 days, 2 weeks)"
                value={medDuration}
                onChangeText={setMedDuration}
                placeholderTextColor="#999"
              />
              <TextInput
                style={[styles.input, styles.medFormField, styles.textArea]}
                placeholder="Instructions (e.g., Take after meals)"
                value={medInstructions}
                onChangeText={setMedInstructions}
                multiline
                numberOfLines={2}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                style={styles.addMedicationButton}
                onPress={addMedication}
              >
                <Ionicons name="add-circle" size={20} color="white" />
                <Text style={styles.addMedicationButtonText}>Add Medication</Text>
              </TouchableOpacity>
            </View>

            {/* List of added medications */}
            {medications.length > 0 && (
              <View style={styles.medicationsList}>
                {medications.map((med, index) => (
                  <View key={index} style={styles.medicationCard}>
                    <View style={styles.medicationCardHeader}>
                      <View style={styles.medicationNumber}>
                        <Text style={styles.medicationNumberText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.medicationCardName}>{med.name}</Text>
                      <TouchableOpacity
                        onPress={() => removeMedication(index)}
                        style={styles.removeMedicationBtn}
                      >
                        <Ionicons name="close-circle" size={24} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                    {(med.dosage || med.frequency || med.duration || med.instructions) && (
                      <View style={styles.medicationDetails}>
                        {med.dosage && <Text style={styles.medDetailText}>💊 {med.dosage}</Text>}
                        {med.frequency && <Text style={styles.medDetailText}>⏰ {med.frequency}</Text>}
                        {med.duration && <Text style={styles.medDetailText}>📅 {med.duration}</Text>}
                        {med.instructions && <Text style={styles.medDetailText}>📝 {med.instructions}</Text>}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Section Header - Additional Notes */}
          <View style={styles.sectionHeader}>
            <Ionicons name="create" size={20} color="#7C4DFF" />
            <Text style={styles.sectionHeaderText}>Additional Notes</Text>
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Doctor's notes, instructions, or any additional information..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient
              colors={["#7C4DFF", "#5E35B1"]}
              style={styles.saveButtonGradient}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={24}
                color="white"
                style={styles.saveButtonIcon}
              />
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Prescription"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#FF5252",
  },
  input: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#333",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  vitalsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  vitalsField: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#5E35B1",
  },
  uploadButton: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E8EAF6",
    borderStyle: "dashed",
  },
  uploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7C4DFF",
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 14,
    color: "#999",
    marginTop: 4,
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 12,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 250,
    borderRadius: 12,
  },
  removeImageButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "white",
    borderRadius: 14,
  },
  medicationFormContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  medFormField: {
    backgroundColor: "white",
    marginBottom: 12,
  },
  addMedicationButton: {
    backgroundColor: "#7C4DFF",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 8,
  },
  addMedicationButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  medicationsList: {
    gap: 12,
    marginTop: 16,
  },
  medicationCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E8EAF6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medicationCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
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
    fontSize: 16,
    fontWeight: "bold",
    color: "white",
  },
  medicationCardName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  removeMedicationBtn: {
    padding: 4,
  },
  medicationDetails: {
    gap: 4,
    marginLeft: 44,
  },
  medDetailText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  saveButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  saveButtonIcon: {
    marginRight: 8,
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
  },
});
