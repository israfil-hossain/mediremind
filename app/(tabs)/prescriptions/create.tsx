import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { GlassButton, GlassCard, GlassField, GlassIconButton, ScreenBackground } from "../../../components/ui/Glass";
import { accents, radius as R, spacing, typography, withAlpha } from "../../../constants/design";
import { useAuth } from "../../../contexts/AuthContext";
import { useTheme } from "../../../contexts/ThemeContext";
import { ConnectedUserProfile, PrescriptionMedication, createPrescription, getConnectedDoctors, getConnectedPatients } from "../../../utils/prescriptionManager";

export default function CreatePrescriptionScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const { user, userProfile, userRole, refreshUser } = useAuth();

  const [title, setTitle] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [notes, setNotes] = useState("");
  const [instructions, setInstructions] = useState("");
  const [medications, setMedications] = useState<PrescriptionMedication[]>([]);
  const [medName, setMedName] = useState("");
  const [medDosage, setMedDosage] = useState("");
  const [medFrequency, setMedFrequency] = useState("");
  const [medDuration, setMedDuration] = useState("");
  const [medInstructions, setMedInstructions] = useState("");
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUserProfile[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<ConnectedUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user && userRole) loadConnectedUsers();
  }, [user, userRole]);

  useFocusEffect(
    useCallback(() => {
      if (user && !userRole) refreshUser();
    }, [user, userRole, refreshUser])
  );

  const loadConnectedUsers = async () => {
    if (!user || !userRole) return;
    try {
      setIsLoading(true);
      setConnectedUsers(userRole === "doctor" ? await getConnectedPatients(user.uid) : await getConnectedDoctors(user.uid));
    } catch (e) {
      console.error("Error loading connected users:", e);
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
    setMedications([...medications, { name: medName.trim(), dosage: medDosage.trim() || undefined, frequency: medFrequency.trim() || undefined, duration: medDuration.trim() || undefined, instructions: medInstructions.trim() || undefined }]);
    setMedName("");
    setMedDosage("");
    setMedFrequency("");
    setMedDuration("");
    setMedInstructions("");
  };

  const validateForm = (): boolean => {
    if (!title.trim()) return Alert.alert("Error", "Please enter a prescription title"), false;
    if (medications.length === 0) return Alert.alert("Error", "Please add at least one medication"), false;
    if (userRole === "doctor" && !selectedPatient) return Alert.alert("Error", "Please select a patient"), false;
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !user || !userProfile) return;
    try {
      setIsSaving(true);
      const sharedWith: string[] = [];
      let patientId: string, patientName: string, doctorId: string | undefined;
      if (userRole === "doctor") {
        if (!selectedPatient) return;
        patientId = selectedPatient.id;
        patientName = selectedPatient.name;
        doctorId = user.uid;
        sharedWith.push(patientId);
      } else {
        patientId = user.uid;
        patientName = userProfile.name;
        sharedWith.push(...connectedUsers.map((d) => d.id));
      }
      if (!userRole) {
        Alert.alert("Error", "User role not loaded. Please try again.");
        return;
      }
      await createPrescription({
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
      });
      Alert.alert("Success", "Prescription created successfully", [{ text: "OK", onPress: () => router.back() }]);
    } catch (e: any) {
      console.error("Error creating prescription:", e);
      Alert.alert("Error", e.message || "Failed to create prescription");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={accents.violet} />
          <Text style={styles.muted}>Loading…</Text>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <View style={styles.header}>
        <GlassIconButton icon="arrow-back" onPress={() => router.back()} />
        <Text style={styles.title}>Create Prescription</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {userRole === "doctor" && (
            <>
              <Text style={styles.sectionTitle}>Select Patient *</Text>
              {connectedUsers.length === 0 ? (
                <Text style={styles.emptyText}>No connected patients</Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.lg }}>
                  {connectedUsers.map((patient) => {
                    const active = selectedPatient?.id === patient.id;
                    return (
                      <Pressable key={patient.id} onPress={() => setSelectedPatient(patient)} style={[styles.patientChip, active ? { backgroundColor: accents.violet, borderColor: accents.violet } : { borderColor: theme.colors.border }]}>
                        <Text style={[styles.patientChipText, active && { color: "#fff" }]}>{patient.name}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </>
          )}

          <Text style={styles.sectionTitle}>Basic Information</Text>
          <GlassCard padding={spacing.lg} style={styles.block}>
            <Text style={styles.label}>Title *</Text>
            <GlassField placeholder="e.g., Follow-up prescription" value={title} onChangeText={setTitle} editable={!isSaving} containerStyle={{ marginBottom: spacing.md }} />
            <Text style={styles.label}>Diagnosis</Text>
            <GlassField placeholder="Enter diagnosis" value={diagnosis} onChangeText={setDiagnosis} multiline style={{ height: 70 }} editable={!isSaving} />
          </GlassCard>

          <Text style={styles.sectionTitle}>Medications *</Text>
          {medications.map((med, i) => (
            <GlassCard key={i} style={styles.medCard} padding={spacing.lg}>
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{med.name}</Text>
                {med.dosage && <Text style={styles.medDetail}>Dosage: {med.dosage}</Text>}
                {med.frequency && <Text style={styles.medDetail}>Frequency: {med.frequency}</Text>}
                {med.duration && <Text style={styles.medDetail}>Duration: {med.duration}</Text>}
                {med.instructions && <Text style={styles.medDetail}>Instructions: {med.instructions}</Text>}
              </View>
              <Pressable onPress={() => setMedications(medications.filter((_, idx) => idx !== i))} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={accents.rose} />
              </Pressable>
            </GlassCard>
          ))}

          <GlassCard padding={spacing.lg} style={styles.block}>
            <Text style={styles.addMedTitle}>Add Medication</Text>
            <GlassField placeholder="Medication name *" value={medName} onChangeText={setMedName} editable={!isSaving} containerStyle={{ marginBottom: spacing.md }} />
            <View style={styles.row}>
              <GlassField placeholder="Dosage" value={medDosage} onChangeText={setMedDosage} editable={!isSaving} containerStyle={{ flex: 1, marginBottom: spacing.md }} />
              <GlassField placeholder="Frequency" value={medFrequency} onChangeText={setMedFrequency} editable={!isSaving} containerStyle={{ flex: 1, marginBottom: spacing.md }} />
            </View>
            <GlassField placeholder="Duration (e.g., 7 days)" value={medDuration} onChangeText={setMedDuration} editable={!isSaving} containerStyle={{ marginBottom: spacing.md }} />
            <GlassField placeholder="Instructions (e.g., Take after meals)" value={medInstructions} onChangeText={setMedInstructions} multiline style={{ height: 60 }} editable={!isSaving} containerStyle={{ marginBottom: spacing.md }} />
            <Pressable style={styles.addMedBtn} onPress={addMedication} disabled={isSaving}>
              <Ionicons name="add-circle-outline" size={20} color={accents.violet} />
              <Text style={styles.addMedBtnText}>Add Medication</Text>
            </Pressable>
          </GlassCard>

          <Text style={styles.sectionTitle}>Additional Information</Text>
          <GlassCard padding={spacing.lg} style={styles.block}>
            <Text style={styles.label}>Instructions</Text>
            <GlassField placeholder="General instructions for the patient" value={instructions} onChangeText={setInstructions} multiline style={{ height: 70 }} editable={!isSaving} containerStyle={{ marginBottom: spacing.md }} />
            <Text style={styles.label}>Notes</Text>
            <GlassField placeholder="Additional notes" value={notes} onChangeText={setNotes} multiline style={{ height: 70 }} editable={!isSaving} />
          </GlassCard>

          <GlassButton label="Create Prescription" icon="checkmark-circle" color={accents.violet} onPress={handleSave} loading={isSaving} style={{ marginTop: spacing.sm }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    center: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.xl, paddingTop: 60, paddingBottom: spacing.md },
    title: { ...typography.h1, color: theme.colors.text },
    muted: { ...typography.caption, color: theme.colors.textSecondary },
    scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
    sectionTitle: { ...typography.h1, color: theme.colors.text, marginBottom: spacing.md, marginTop: spacing.xs },
    block: { marginBottom: spacing.lg },
    label: { ...typography.label, color: theme.colors.textSecondary, marginBottom: spacing.sm },
    row: { flexDirection: "row", gap: spacing.md },
    patientChip: { paddingHorizontal: spacing.xl, paddingVertical: 12, borderRadius: R.pill, marginRight: spacing.md, borderWidth: StyleSheet.hairlineWidth },
    patientChipText: { ...typography.label, color: theme.colors.textSecondary },
    emptyText: { ...typography.caption, color: theme.colors.textTertiary, fontStyle: "italic", marginBottom: spacing.lg },
    medCard: { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.md },
    medName: { ...typography.h2, color: theme.colors.text, marginBottom: spacing.xs },
    medDetail: { ...typography.caption, color: theme.colors.textSecondary, marginBottom: 3 },
    addMedTitle: { ...typography.h2, color: theme.colors.text, marginBottom: spacing.md },
    addMedBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 12, borderRadius: R.md, borderWidth: 2, borderColor: accents.violet, borderStyle: "dashed" },
    addMedBtnText: { ...typography.label, color: accents.violet },
  });
