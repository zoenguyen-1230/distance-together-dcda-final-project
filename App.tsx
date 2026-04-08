import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/providers/AuthProvider";
import { AppDataProvider } from "./src/providers/AppDataProvider";
import { ProfileProvider } from "./src/providers/ProfileProvider";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { palette } from "./src/theme/palette";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <AppDataProvider>
              <StatusBar style="dark" />
              <RootNavigator />
            </AppDataProvider>
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
