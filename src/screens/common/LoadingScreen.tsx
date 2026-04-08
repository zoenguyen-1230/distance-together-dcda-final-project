import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>Same Time</Text>
      <Text style={styles.title}>Setting up your next same-time moment...</Text>
      <ActivityIndicator size="large" color={palette.berry} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: palette.background,
    padding: 24,
    gap: 16,
  },
  eyebrow: {
    color: palette.berry,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: typography.sansFamilyMedium,
  },
  title: {
    color: palette.text,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "800",
    textAlign: "center",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.5,
  },
});
