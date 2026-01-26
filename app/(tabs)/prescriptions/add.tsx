import { useState } from "react";
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
import { addPrescription, Prescription } from "../../../utils/storage";

export default function AddPrescriptionScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [prescriptionDate, setPrescriptionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [medicationInput, setMedicationInput] = useState("");
  const [medications, setMedications] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

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
    const trimmed = medicationInput.trim();
    if (trimmed && !medications.includes(trimmed)) {
      setMedications([...medications, trimmed]);
      setMedicationInput("");
    }
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
        doctorName: doctorName.trim() || undefined,
        prescriptionDate,
        notes: notes.trim() || undefined,
        imageUri,
        medicationNames: medications.length > 0 ? medications : undefined,
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

          {/* Doctor Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doctor Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Dr. Smith"
              value={doctorName}
              onChangeText={setDoctorName}
              placeholderTextColor="#999"
            />
          </View>

          {/* Date Input */}
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

          {/* Medications */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medications</Text>
            <View style={styles.medicationInputContainer}>
              <TextInput
                style={[styles.input, styles.medicationInput]}
                placeholder="Enter medication name"
                value={medicationInput}
                onChangeText={setMedicationInput}
                placeholderTextColor="#999"
                onSubmitEditing={addMedication}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addMedicationButton}
                onPress={addMedication}
              >
                <Ionicons name="add" size={24} color="white" />
              </TouchableOpacity>
            </View>
            {medications.length > 0 && (
              <View style={styles.medicationsList}>
                {medications.map((med, index) => (
                  <View key={index} style={styles.medicationChip}>
                    <Text style={styles.medicationChipText}>{med}</Text>
                    <TouchableOpacity
                      onPress={() => removeMedication(index)}
                      style={styles.removeMedicationButton}
                    >
                      <Ionicons name="close" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Notes */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Add any additional notes..."
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
  medicationInputContainer: {
    flexDirection: "row",
    gap: 8,
  },
  medicationInput: {
    flex: 1,
  },
  addMedicationButton: {
    backgroundColor: "#7C4DFF",
    borderRadius: 12,
    width: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  medicationsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  medicationChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8EAF6",
    paddingVertical: 8,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: 20,
    gap: 6,
  },
  medicationChipText: {
    fontSize: 14,
    color: "#5E35B1",
    fontWeight: "500",
  },
  removeMedicationButton: {
    padding: 2,
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
