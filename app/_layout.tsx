import { Stack } from "expo-router";
import { StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { StripeAuthProvider } from "../providers/StripeProvider";

function RootLayoutContent() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar backgroundColor={theme.colors.background} barStyle={theme.isDark ? "light-content" : "dark-content"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
          animation: "slide_from_right",
          header: () => null,
          navigationBarHidden: true,
        }}
      >
          <Stack.Screen
            name="index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="auth/index"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="medications/add"
            options={{
              headerShown: false,
              headerBackTitle: "",
              title: "",
            }}
          />
          <Stack.Screen
            name="refills"
            options={{
              headerShown: false,
              headerBackTitle: "",
              title: "",
            }}
          />
          <Stack.Screen
            name="premium"
            options={{
              headerShown: false,
              headerBackTitle: "",
              title: "",
            }}
          />
          <Stack.Screen
            name="settings"
            options={{
              headerShown: false,
              headerBackTitle: "",
              title: "",
            }}
          />
        </Stack>
    </View>
  );
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <StripeAuthProvider>
            <RootLayoutContent />
          </StripeAuthProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
