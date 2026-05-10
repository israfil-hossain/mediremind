module.exports = {
  expo: {
    name: "MediRemind",
    displayName: "MediRemind - Medicine Reminder",
    slug: "mediremind",
    version: "1.0.0",
    orientation: "portrait",
    description: "Never miss your medication again! MediRemind helps you manage prescriptions, set reminders, track your medication history, and stay connected with your healthcare provider. Perfect for managing daily medications, vitamins, and supplements.",
    extra: {
      eas: {
        projectId: "910976ca-6231-4fd6-aa21-7c9c7e9758b2"
      }
    },
    icon: "./assets/images/icon.png",
    scheme: "mediremind",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.flowentech.mediremind",
      googleServicesFile: "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      package: "com.flowentech.mediremind",
      googleServicesFile: "./google-services.json",
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
      "expo-build-properties",
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme: "com.googleusercontent.apps.582942360667-ns8qt1p3pp0sshmujc09o1mve0rfjet5",
        },
      ],
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: process.env.EXPO_PUBLIC_ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713",
          iosAppId: process.env.EXPO_PUBLIC_ADMOB_IOS_APP_ID || "ca-app-pub-3940256099942544~1458002511",
          maxAdContentRating: "G", // General audience
          tagForChildDirectedTreatment: false,
          tagForUnderAgeOfConsent: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  },
};
