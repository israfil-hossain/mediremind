import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { RevenueCatAuthProvider } from "../providers/RevenueCatAuthProvider";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";

function RootLayoutContent() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar style={theme.isDark ? "light" : "dark"} />
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
            name="auth"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
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
            name="refills/index"
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
            name="settings/index"
            options={{
              headerShown: false,
              headerBackTitle: "",
              title: "",
            }}
          />
        </Stack>
    </>
  );
}

export default function Layout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RevenueCatAuthProvider>
          <RootLayoutContent />
        </RevenueCatAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
