import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";

interface MultiSelectDropdownProps {
  label: string;
  selectedLabels: string[];
  options: Array<{ id: string; label: string }>;
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleOption: (id: string) => void;
  emptyHelper: string;
}

export function MultiSelectDropdown({
  label,
  selectedLabels,
  options,
  isOpen,
  onToggleOpen,
  onToggleOption,
  emptyHelper,
}: MultiSelectDropdownProps) {
  const summary =
    selectedLabels.length > 0 ? selectedLabels.join(", ") : "Select people";

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      {options.length ? (
        <>
          <TouchableOpacity style={styles.button} onPress={onToggleOpen} activeOpacity={0.9}>
            <Text
              style={[
                styles.buttonText,
                selectedLabels.length === 0 && styles.placeholderText,
              ]}
            >
              {summary}
            </Text>
            <Text style={styles.chevron}>{isOpen ? "▲" : "▼"}</Text>
          </TouchableOpacity>
          {isOpen ? (
            <View style={styles.optionList}>
              {options.map((option) => {
                const selected = selectedLabels.includes(option.label);

                return (
                  <TouchableOpacity
                    key={option.id}
                    style={styles.optionRow}
                    onPress={() => onToggleOption(option.id)}
                  >
                    <Text style={styles.optionText}>{option.label}</Text>
                    <Text style={styles.optionCheck}>{selected ? "✓" : ""}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </>
      ) : (
        <Text style={styles.helper}>{emptyHelper}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
    letterSpacing: 0.2,
  },
  button: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  buttonText: {
    color: palette.text,
    fontSize: 14,
    flex: 1,
    fontFamily: typography.sansFamily,
  },
  placeholderText: {
    color: palette.muted,
  },
  chevron: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "800",
  },
  optionList: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  optionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5E8E2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  optionText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    fontFamily: typography.sansFamilyMedium,
  },
  optionCheck: {
    color: palette.berry,
    fontSize: 14,
    fontWeight: "800",
    minWidth: 12,
    textAlign: "right",
  },
  helper: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    fontFamily: typography.sansFamily,
  },
});
