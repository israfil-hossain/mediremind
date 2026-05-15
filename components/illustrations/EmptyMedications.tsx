import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";

export function EmptyMedications() {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="medkit-outline" size={64} color={theme.colors.border} />
      </View>
      <Text style={[styles.title, { color: theme.colors.text }]}>No Medications Yet</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        Add your medications to start receiving reminders
      </Text>
      <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>
        Tap the + button to add your first medication
      </Text>
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
    backgroundColor: theme.colors.surface,
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
    marginBottom: 8,
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 20,
  },
});
