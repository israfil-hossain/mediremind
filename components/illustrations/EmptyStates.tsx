import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { useRouter } from "expo-router";

export function EmptyAppointments() {
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="calendar-outline" size={64} color={theme.colors.border} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>No Appointments Yet</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Schedule appointments with your doctor
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push("/appointments")}
      >
        <Text style={styles.buttonText}>Book Appointment</Text>
      </TouchableOpacity>
    </View>
  );
}

export function EmptyConnections() {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="people-outline" size={64} color={theme.colors.border} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>No Connections Yet</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Connect with your doctor to start receiving care
      </Text>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push("/(tabs)/history")}
      >
        <Text style={styles.buttonText}>Add Patient</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
