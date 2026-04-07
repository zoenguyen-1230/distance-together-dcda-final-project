import "react-native-gesture-handler";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "./src/providers/AuthProvider";
import { ProfileProvider } from "./src/providers/ProfileProvider";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { palette } from "./src/theme/palette";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
