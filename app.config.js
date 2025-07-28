// app.config.js
export default {
  expo: {
    name: "grabcoffee",
    slug: "narra-tenant",
    platforms: ["ios", "android"],
    version: "1.0.0",
    scheme: "grabcoffee",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    ios: {
      bundleIdentifier: "com.coffee.grab",
      icon: "./assets/icon.png",
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription: "This app uses your location to show your distance and route to the pickup location.",
        NSPhotoLibraryUsageDescription: "This app needs access to your photo library to select profile pictures.",
        NSCameraUsageDescription: "This app needs access to your camera to take profile pictures.",
        LSApplicationQueriesSchemes: ["grabcoffee"],
        CFBundleURLTypes: [
          {
            CFBundleURLName: "grabcoffee",
            CFBundleURLSchemes: ["grabcoffee"]
          }
        ]
      },
    },
    android: {
      package: "com.coffee.grab",
      icon: "./assets/icon.png",
      adaptiveIcon: {
        foregroundImage: "./assets/icon.png",
        backgroundColor: "#ffffff"
      },
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            {
              scheme: "grabcoffee"
            }
          ],
          category: ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: "https://gvsqxdvmqlnyfikmrjdf.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2c3F4ZHZtcWxueWZpa21yamRmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkzMDA5MjAsImV4cCI6MjA2NDg3NjkyMH0.2_mcRgEEh_0_r9oLZEC8RsWLjq3fCvT0tnQNSONmd0Q",
      eas: {
        projectId: "51a37267-5b24-4cc7-b899-2d9b9125d34c",
      },
    },
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission: "The app accesses your photos to let you share them with your friends.",
          cameraPermission: "The app accesses your camera to let you take photos.",
        },
      ],
    ],
  },
};