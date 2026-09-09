import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, ScreenBackground } from "../../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../../constants/design";
import { useTheme } from "../../../contexts/ThemeContext";
import { addPrescription, getUserProfile, Prescription, PrescriptionMedication } from "../../../utils/storage";

export default function AddPrescriptionScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = createStyles(theme);

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
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split("T")[0]);
  const [nextVisitDate, setNextVisitDate] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [medications, setMedications] = useState<PrescriptionMedication[]>([]);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medDuration, setMedDuration] = useState("");
  const [medInstructions, setMedInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getUserProfile()
      .then((profile) => {
        setPatientName(profile.name || "");
        setPatientAge(profile.age || "");
        setPatientGender(profile.gender || "");
        setPatientAddress(profile.address || "");
        setPatientPhone(profile.phone || "");
        setPatientDiagnosis(profile.chronicConditions || "");
      })
      .catch((e) => console.error("Error loading user profile:", e));
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") return Alert.alert("Permission Required", "Please grant camera roll permissions.");
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: "images", allowsEditing: true, quality: 0.8, aspect: [4, 3] });
      if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    } catch (e) {
      console.error("Error picking image:", e);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return Alert.alert("Permission Required", "Please grant camera permissions.");
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8, aspect: [4, 3] });
      if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    } catch (e) {
      console.error("Error taking photo:", e);
      Alert.alert("Error", "Failed to take photo. Please try again.");
    }
  };

  const showImageOptions = () =>
    Alert.alert("Add Prescription Image", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Library", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);

  const addMedication = () => {
    if (!medName.trim()) {
      Alert.alert("Validation Error", "Please enter medication name");
      return;
    }
    setMedications([...medications, { name: medName.trim(), dosage: medDosage.trim() || undefined, frequency: medFrequency.trim() || undefined, duration: medDuration.trim() || undefined, instructions: medInstructions.trim() || undefined }]);
    setMedName("");
    setMedDosage("");
    setMedFrequency("");
    setMedDuration("");
    setMedInstructions("");
  };

  const handleSave = async () => {
    if (!title.trim()) return Alert.alert("Validation Error", "Please enter a prescription title");
    if (!prescriptionDate) return Alert.alert("Validation Error", "Please select a prescription date");
    try {
      setSaving(true);
      const prescription: Prescription = {
        id: Math.random().toString(36).slice(2, 11),
        title: title.trim(),
        prescriptionDate,
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
        doctorName: doctorName.trim() || undefined,
        doctorSpecialty: doctorSpecialty.trim() || undefined,
        doctorPhone: doctorPhone.trim() || undefined,
        doctorEmail: doctorEmail.trim() || undefined,
        doctorAddress: doctorAddress.trim() || undefined,
        doctorWebsite: doctorWebsite.trim() || undefined,
        hospitalName: hospitalName.trim() || undefined,
        hospitalAddress: hospitalAddress.trim() || undefined,
        hospitalPhone: hospitalPhone.trim() || undefined,
        symptoms: symptoms.trim() || undefined,
        diagnosis: diagnosis.trim() || undefined,
        notes: notes.trim() || undefined,
        medications: medications.length > 0 ? medications : undefined,
        imageUri,
        nextVisitDate: nextVisitDate.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      await addPrescription(prescription);
      Alert.alert("Success", "Prescription added successfully", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e) {
      console.error("Error saving prescription:", e);
      Alert.alert("Error", "Failed to save prescription. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const Section = ({ icon, title: t }: { icon: keyof typeof Ionicons.glyphMap; title: string }) => (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={18} color={accents.violet} />
      <Text style={styles.sectionText}>{t}</Text>
    </View>
  );

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>Add Prescription</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Section icon="medical-outline" title="Basic Information" />
          <GlassCard padding={spacing.lg} style={styles.block}>
            <Text style={styles.label}>Prescription Title *</Text>
            <GlassField placeholder="e.g., Annual Checkup" value={title} onChangeText={setTitle} containerStyle={styles.f} />
            <Text style={styles.label}>Prescription Date *</Text>
            <GlassField placeholder="YYYY-MM-DD" value={prescriptionDate} onChangeText={setPrescriptionDate} containerStyle={styles.f} />
            <Text style={styles.label}>Next Visit Date (Follow-up)</Text>
            <GlassField placeholder="YYYY-MM-DD" value={nextVisitDate} onChangeText={setNextVisitDate} />
          </GlassCard>

          <Section icon="person" title="Patient Information" />
          <GlassCard padding={spacing.lg} style={styles.block}>
            <Text style={styles.label}>Patient Name</Text>
            <GlassField placeholder="Patient name" value={patientName} onChangeText={setPatientName} containerStyle={styles.f} />
            <View style={styles.row}>
              <GlassField placeholder="Age" value={patientAge} onChangeText={setPatientAge} keyboardType="number-pad" containerStyle={styles.third} />
              <GlassField placeholder="Gender" value={patientGender} onChangeText={setPatientGender} containerStyle={styles.third} />
              <GlassField placeholder="Weight kg" value={patientWeight} onChangeText={setPatientWeight} keyboardType="decimal-pad" containerStyle={styles.third} />
            </View>
            <View style={styles.row}>
              <GlassField placeholder="BP 120/80" value={patientBP} onChangeText={setPatientBP} containerStyle={styles.third} />
              <GlassField placeholder="Pulse" value={patientPulse} onChangeText={setPatientPulse} keyboardType="number-pad" containerStyle={styles.third} />
              <GlassField placeholder="Temp °F" value={patientTemperature} onChangeText={setPatientTemperature} keyboardType="decimal-pad" containerStyle={styles.third} />
            </View>
            <GlassField placeholder="Chief complaint" value={chiefComplaint} onChangeText={setChiefComplaint} multiline style={{ height: 60 }} containerStyle={styles.f} />
            <GlassField placeholder="Patient phone" value={patientPhone} onChangeText={setPatientPhone} keyboardType="phone-pad" containerStyle={styles.f} />
            <GlassField placeholder="Patient address" value={patientAddress} onChangeText={setPatientAddress} multiline style={{ height: 60 }} containerStyle={styles.f} />
            <GlassField placeholder="Known conditions / diagnosis" value={patientDiagnosis} onChangeText={setPatientDiagnosis} multiline style={{ height: 60 }} />
          </GlassCard>

          <Section icon="medkit" title="Doctor Information" />
          <GlassCard padding={spacing.lg} style={styles.block}>
            <GlassField placeholder="Doctor name" value={doctorName} onChangeText={setDoctorName} containerStyle={styles.f} />
            <GlassField placeholder="Specialty" value={doctorSpecialty} onChangeText={setDoctorSpecialty} containerStyle={styles.f} />
            <GlassField placeholder="Doctor phone" value={doctorPhone} onChangeText={setDoctorPhone} keyboardType="phone-pad" containerStyle={styles.f} />
            <GlassField placeholder="Doctor email" value={doctorEmail} onChangeText={setDoctorEmail} keyboardType="email-address" autoCapitalize="none" containerStyle={styles.f} />
            <GlassField placeholder="Clinic address" value={doctorAddress} onChangeText={setDoctorAddress} multiline style={{ height: 60 }} containerStyle={styles.f} />
            <GlassField placeholder="Website" value={doctorWebsite} onChangeText={setDoctorWebsite} keyboardType="url" autoCapitalize="none" />
          </GlassCard>

          <Section icon="business" title="Hospital / Clinic" />
          <GlassCard padding={spacing.lg} style={styles.block}>
            <GlassField placeholder="Hospital/Clinic name" value={hospitalName} onChangeText={setHospitalName} containerStyle={styles.f} />
            <GlassField placeholder="Hospital address" value={hospitalAddress} onChangeText={setHospitalAddress} containerStyle={styles.f} />
            <GlassField placeholder="Hospital phone" value={hospitalPhone} onChangeText={setHospitalPhone} keyboardType="phone-pad" />
          </GlassCard>

          <Section icon="document-text" title="Medical Information" />
          <GlassCard padding={spacing.lg} style={styles.block}>
            <GlassField placeholder="Symptoms" value={symptoms} onChangeText={setSymptoms} multiline style={{ height: 70 }} containerStyle={styles.f} />
            <GlassField placeholder="Diagnosis" value={diagnosis} onChangeText={setDiagnosis} />
          </GlassCard>

          <Section icon="camera" title="Prescription Image" />
          {imageUri ? (
            <View style={styles.imageWrap}>
              <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" />
              <Pressable style={styles.removeImage} onPress={() => setImageUri(undefined)}>
                <Ionicons name="close-circle" size={28} color={accents.rose} />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.upload} onPress={showImageOptions}>
              <Ionicons name="camera-outline" size={30} color={accents.violet} />
              <Text style={styles.uploadText}>Add Photo</Text>
              <Text style={styles.uploadSub}>Take a photo or choose from gallery</Text>
            </Pressable>
          )}

          <Section icon="medical" title="Prescribed Medications" />
          {medications.map((med, i) => (
            <GlassCard key={i} style={styles.medCard} padding={spacing.lg}>
              <View style={styles.medHead}>
                <View style={styles.medNumber}>
                  <Text style={styles.medNumberText}>{i + 1}</Text>
                </View>
                <Text style={styles.medName}>{med.name}</Text>
                <Pressable onPress={() => setMedications(medications.filter((_, idx) => idx !== i))} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={accents.rose} />
                </Pressable>
              </View>
              {(med.dosage || med.frequency || med.duration || med.instructions) && (
                <View style={{ marginLeft: 42, gap: 2 }}>
                  {med.dosage && <Text style={styles.medDetail}>💊 {med.dosage}</Text>}
                  {med.frequency && <Text style={styles.medDetail}>⏰ {med.frequency}</Text>}
                  {med.duration && <Text style={styles.medDetail}>📅 {med.duration}</Text>}
                  {med.instructions && <Text style={styles.medDetail}>📝 {med.instructions}</Text>}
                </View>
              )}
            </GlassCard>
          ))}

          <GlassCard padding={spacing.lg} style={styles.block}>
            <GlassField placeholder="Medication name *" value={medName} onChangeText={setMedName} containerStyle={styles.f} />
            <GlassField placeholder="Dosage (e.g., 10mg)" value={medDosage} onChangeText={setMedDosage} containerStyle={styles.f} />
            <GlassField placeholder="Frequency (e.g., Twice daily)" value={medFrequency} onChangeText={setMedFrequency} containerStyle={styles.f} />
            <GlassField placeholder="Duration (e.g., 7 days)" value={medDuration} onChangeText={setMedDuration} containerStyle={styles.f} />
            <GlassField placeholder="Instructions" value={medInstructions} onChangeText={setMedInstructions} multiline style={{ height: 60 }} containerStyle={styles.f} />
            <Pressable style={styles.addMedBtn} onPress={addMedication}>
              <Ionicons name="add-circle" size={20} color="#fff" />
              <Text style={styles.addMedBtnText}>Add Medication</Text>
            </Pressable>
          </GlassCard>

          <Section icon="create" title="Additional Notes" />
          <GlassCard padding={spacing.lg} style={styles.block}>
            <GlassField placeholder="Doctor's notes or additional information…" value={notes} onChangeText={setNotes} multiline style={{ height: 90 }} />
          </GlassCard>

          <GlassButton label={saving ? "Saving…" : "Save Prescription"} icon="checkmark-circle-outline" color={accents.violet} onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 10, paddingBottom: spacing.md },
    title: { ...typography.h1, color: theme.colors.text },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    block: { marginBottom: spacing.md },
    f: { marginBottom: spacing.md },
    row: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
    third: { flex: 1 },
    label: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.sm },
    sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg, marginBottom: spacing.md },
    sectionText: { ...typography.h2, color: accents.violet },
    upload: { alignItems: "center", padding: spacing.xxl, borderRadius: R.md, borderWidth: 2, borderColor: withAlpha(accents.violet, 0.4), borderStyle: "dashed", marginBottom: spacing.md },
    uploadText: { ...typography.h2, color: accents.violet, marginTop: spacing.sm },
    uploadSub: { ...typography.caption, color: theme.colors.textSecondary, marginTop: 4 },
    imageWrap: { position: "relative", borderRadius: R.md, overflow: "hidden", marginBottom: spacing.md },
    image: { width: "100%", height: 240 },
    removeImage: { position: "absolute", top: spacing.md, right: spacing.md, backgroundColor: "#fff", borderRadius: 14 },
    medCard: { marginBottom: spacing.md },
    medHead: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
    medNumber: { width: 30, height: 30, borderRadius: 15, backgroundColor: accents.violet, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
    medNumberText: { fontSize: 15, fontWeight: "800", color: "#fff" },
    medName: { flex: 1, ...typography.h2, color: theme.colors.text },
    medDetail: { ...typography.caption, color: theme.colors.textSecondary, lineHeight: 20 },
    addMedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: accents.violet, borderRadius: R.pill, paddingVertical: 12 },
    addMedBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  });
