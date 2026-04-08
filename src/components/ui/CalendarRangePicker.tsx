import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  buildCalendarCells,
  formatCalendarMonth,
  weekdayLabels,
} from "../../lib/dateHelpers";
import { palette } from "../../theme/palette";

interface CalendarRangePickerProps {
  title: string;
  summary: string;
  monthDate: Date;
  startDate: string;
  endDate?: string;
  isOpen: boolean;
  onToggle: () => void;
  onShiftMonth: (offset: number) => void;
  onSelectDate: (dateValue: string) => void;
  onClear: () => void;
  helperText: string;
}

export function CalendarRangePicker({
  title,
  summary,
  monthDate,
  startDate,
  endDate,
  isOpen,
  onToggle,
  onShiftMonth,
  onSelectDate,
  onClear,
  helperText,
}: CalendarRangePickerProps) {
  const cells = buildCalendarCells(monthDate);

  return (
    <View style={styles.calendarWrap}>
      <TouchableOpacity style={styles.calendarTrigger} onPress={onToggle} activeOpacity={0.9}>
        <View style={styles.calendarHeaderCopy}>
          <Text style={styles.controlLabel}>{title}</Text>
          <Text style={styles.feedMeta}>{summary}</Text>
        </View>
        <Text style={styles.selectChevron}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>

      {isOpen ? (
        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity style={styles.calendarMonthButton} onPress={() => onShiftMonth(-1)}>
              <Text style={styles.calendarMonthButtonText}>Prev</Text>
            </TouchableOpacity>
            <Text style={styles.calendarMonthTitle}>{formatCalendarMonth(monthDate)}</Text>
            <TouchableOpacity style={styles.calendarMonthButton} onPress={() => onShiftMonth(1)}>
              <Text style={styles.calendarMonthButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.calendarWeekHeader}>
            {weekdayLabels.map((label) => (
              <View key={label} style={styles.calendarCellSlot}>
                <Text style={styles.calendarWeekLabel}>{label}</Text>
              </View>
            ))}
          </View>
          <View style={styles.calendarGrid}>
            {cells.map((cell) => {
              const isSelectedStart = cell.value === startDate;
              const isSelectedEnd = cell.value === endDate;
              const hasRangeEnd = typeof endDate === "string" && endDate.length > 0;
              const isInRange =
                Boolean(cell.value) &&
                Boolean(startDate) &&
                hasRangeEnd &&
                cell.value! > startDate &&
                cell.value! < endDate;

              return (
                <View key={cell.key} style={styles.calendarCellSlot}>
                  <TouchableOpacity
                    style={[
                      styles.calendarDay,
                      !cell.value && styles.calendarDayBlank,
                      isInRange && styles.calendarDayRange,
                      (isSelectedStart || isSelectedEnd) && styles.calendarDaySelected,
                    ]}
                    onPress={() => (cell.value ? onSelectDate(cell.value) : undefined)}
                    disabled={!cell.value}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        !cell.value && styles.calendarDayTextBlank,
                        isInRange && styles.calendarDayRangeText,
                        (isSelectedStart || isSelectedEnd) && styles.calendarDaySelectedText,
                      ]}
                    >
                      {cell.label}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          <View style={styles.calendarFooter}>
            <Text style={styles.helperMeta}>{helperText}</Text>
            <TouchableOpacity style={styles.secondaryAction} onPress={onClear}>
              <Text style={styles.secondaryActionText}>Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  calendarWrap: {
    gap: 8,
  },
  calendarTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  calendarCard: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    padding: 10,
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    shadowColor: "#2A1B18",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  calendarHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  calendarMonthTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
  },
  calendarMonthButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFF8F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  calendarMonthButtonText: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  calendarWeekHeader: {
    flexDirection: "row",
    marginHorizontal: -2,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -2,
  },
  calendarCellSlot: {
    width: "14.2857%",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  calendarWeekLabel: {
    color: palette.muted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  calendarDay: {
    width: "100%",
    aspectRatio: 0.88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3E6DE",
    backgroundColor: "#FFF8F2",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayBlank: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  calendarDayRange: {
    backgroundColor: "#FDF0E7",
    borderColor: "#F1D8C8",
  },
  calendarDaySelected: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  calendarDayText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
  },
  calendarDayTextBlank: {
    color: "transparent",
  },
  calendarDayRangeText: {
    color: palette.berry,
  },
  calendarDaySelectedText: {
    color: "#FFFFFF",
  },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  controlLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  feedMeta: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  helperMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    flex: 1,
  },
  secondaryAction: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.text,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#FFFCFA",
  },
  secondaryActionText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  selectChevron: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "800",
  },
});
