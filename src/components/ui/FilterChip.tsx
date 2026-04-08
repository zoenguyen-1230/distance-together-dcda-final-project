import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";

export function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFF8F0",
  },
  chipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  label: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "600",
    fontFamily: typography.sansFamilyMedium,
    letterSpacing: 0.2,
  },
  labelActive: {
    color: "#FFFFFF",
  },
});
