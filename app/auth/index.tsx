import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
import { getCurrentUser } from "../../utils/firebase";
import { ActivityIndicator } from "react-native";

const { width } = Dimensions.get("window");

export default function AuthScreen() {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    try {
      setIsInitializing(true);
      const user = await getCurrentUser();
      if (user) {
        router.replace("/(tabs)");
      }
    } catch (error) {
      // Error checking user
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) {
    return (
      <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#4CAF50", "#2E7D32"]} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="medical" size={80} color="white" />
        </View>

        <Text style={styles.title}>MediRemind</Text>
        <Text style={styles.subtitle}>Your Health Companion</Text>

        <Text style={styles.label}>I am a...</Text>

        <TouchableOpacity
          style={styles.roleButton}
          onPress={() => router.push("/auth/signup/doctor")}
          activeOpacity={0.8}
        >
          <Ionicons name="medkit" size={50} color="#fff" />
          <Text style={styles.roleText}>DOCTOR</Text>
          <Text style={styles.roleSubtext}>For healthcare professionals</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.roleButton}
          onPress={() => router.push("/auth/signup/patient")}
          activeOpacity={0.8}
        >
          <Ionicons name="person" size={50} color="#fff" />
          <Text style={styles.roleText}>PATIENT</Text>
          <Text style={styles.roleSubtext}>For personal health management</Text>
        </TouchableOpacity>

        <View style={styles.footerContainer}>
          <TouchableOpacity onPress={() => router.push("/auth/login")}>
            <Text style={styles.footerText}>Already have an account? <Text style={styles.footerLink}>Sign In</Text></Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "white",
    marginBottom: 10,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
    marginBottom: 50,
    textAlign: "center",
  },
  label: {
    fontSize: 22,
    fontWeight: "600",
    color: "white",
    marginBottom: 30,
    textAlign: "center",
  },
  roleButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    paddingVertical: 30,
    paddingHorizontal: 40,
    width: width - 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  roleText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    marginTop: 15,
  },
  roleSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 5,
    textAlign: "center",
  },
  footerContainer: {
    marginTop: 30,
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    textAlign: "center",
  },
  footerLink: {
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    marginTop: 16,
  },
});
