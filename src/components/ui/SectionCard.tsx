import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";

export function SectionCard({
  title,
  subtitle,
  children,
  variant = "default",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  variant?: "default" | "memory" | "travel";
}) {
  return (
    <View
      style={[
        styles.card,
        variant === "memory" ? styles.memoryCard : null,
        variant === "travel" ? styles.travelCard : null,
      ]}
    >
      <View
        style={[
          styles.cornerAccent,
          variant === "memory" ? styles.memoryAccent : null,
          variant === "travel" ? styles.travelAccent : null,
        ]}
      >
        {variant === "travel" ? (
          <>
            <View style={styles.travelAccentDot} />
            <View style={styles.travelAccentLine} />
            <View style={styles.travelAccentDot} />
            <View style={styles.travelAccentLineShort} />
          </>
        ) : (
          <>
            <View style={styles.memoryAccentDotLarge} />
            <View style={styles.memoryAccentLine} />
            <View style={styles.memoryAccentDotSmall} />
          </>
        )}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.card,
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.line,
    overflow: "hidden",
  },
  memoryCard: {
    backgroundColor: "#FFFDFC",
    borderColor: "#F0DDE2",
  },
  travelCard: {
    backgroundColor: "#FFFCF9",
    borderColor: "#EEDFD2",
  },
  cornerAccent: {
    position: "absolute",
    top: 16,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    opacity: 0.75,
  },
  memoryAccent: {
    gap: 5,
  },
  travelAccent: {
    gap: 4,
  },
  memoryAccentDotLarge: {
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: palette.berry,
  },
  memoryAccentLine: {
    width: 18,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#E6BBC9",
  },
  memoryAccentDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E6BBC9",
  },
  travelAccentDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: palette.berry,
  },
  travelAccentLine: {
    width: 14,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#E9D2C4",
  },
  travelAccentLineShort: {
    width: 10,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#E9D2C4",
  },
  title: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 4,
    fontFamily: typography.sansFamily,
  },
  body: {
    marginTop: 14,
    gap: 14,
  },
});
