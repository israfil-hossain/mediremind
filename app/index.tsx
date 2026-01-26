import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { getCurrentUser } from "../utils/firebase";

export default function SplashScreen() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 10,
        friction: 2,
        useNativeDriver: true,
      }),
    ]).start();

    checkAuthAndNavigate();
  }, []);

  const checkAuthAndNavigate = async () => {
    try {
      setIsCheckingAuth(true);

      // Check if user is already signed in
      const user = await getCurrentUser();

      // Wait for at least 1.5 seconds to show splash
      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (user) {
        // User is signed in, go to home
        router.replace("/(tabs)");
      } else {
        // User is not signed in, show auth screen
        router.replace("/auth");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      // On error, show auth screen
      router.replace("/auth");
    } finally {
      setIsCheckingAuth(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Ionicons name="medical" size={100} color="white" />
        <Text style={styles.appName}>MedRemind</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
  },
  appName: {
    color: "white",
    fontSize: 32,
    fontWeight: "bold",
    marginTop: 20,
    letterSpacing: 1,
  },
});
