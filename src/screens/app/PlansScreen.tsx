import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FilterChip } from "../../components/ui/FilterChip";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { dateIdeas, smartCallWindows } from "../../data/mockData";
import { useAuth } from "../../providers/AuthProvider";
import { palette } from "../../theme/palette";

const alternateWindowsByPerson: Record<string, string[]> = {
  Sean: [
    "Wednesday 7:15 PM CT / 5:15 PM PT",
    "Thursday 9:00 PM CT / 7:00 PM PT",
    "Saturday 11:00 AM CT / 9:00 AM PT",
  ],
  Trang: [
    "Friday 8:30 PM CT / 8:30 AM ICT",
    "Sunday 9:00 AM CT / 9:00 PM ICT",
  ],
  Hien: [
    "Monday 6:30 AM CT / 6:30 PM ICT",
    "Saturday 8:00 AM CT / 8:00 PM ICT",
  ],
};

export function PlansScreen() {
  const { isDemoMode } = useAuth();
  const liveCallWindows = isDemoMode ? smartCallWindows : [];
  const [selectedDateIdea, setSelectedDateIdea] = useState(dateIdeas[0]);
  const [dateIdeaRolls, setDateIdeaRolls] = useState(1);
  const [savedDateIdeas, setSavedDateIdeas] = useState<string[]>([]);
  const [selectedPerson, setSelectedPerson] = useState(liveCallWindows[0]?.person ?? "");
  const [selectedEnergy, setSelectedEnergy] = useState<"all" | "low" | "steady" | "high">(
    "steady"
  );
  const [scheduledCallId, setScheduledCallId] = useState<string | null>(null);
  const [alternateTimesOpenFor, setAlternateTimesOpenFor] = useState<string | null>(null);

  const filteredCallWindows = useMemo(
    () =>
      liveCallWindows.filter(
        (slot) =>
          slot.person === selectedPerson &&
          (selectedEnergy === "all" || slot.energyFit === selectedEnergy)
      ),
    [liveCallWindows, selectedEnergy, selectedPerson]
  );

  const alternateWindows = alternateWindowsByPerson[selectedPerson] ?? [];

  const rollDateIdea = () => {
    if (dateIdeas.length === 1) {
      return;
    }

    let nextIdea = selectedDateIdea;

    while (nextIdea === selectedDateIdea) {
      nextIdea = dateIdeas[Math.floor(Math.random() * dateIdeas.length)];
    }

    setSelectedDateIdea(nextIdea);
    setDateIdeaRolls((current) => current + 1);
  };

  const saveDateIdea = () => {
    setSavedDateIdeas((current) =>
      current.includes(selectedDateIdea) ? current : [selectedDateIdea, ...current]
    );
  };

  const removeSavedDateIdea = (idea: string) => {
    setSavedDateIdeas((current) => current.filter((item) => item !== idea));
  };

  const scheduleCall = (slotId: string) => {
    setScheduledCallId(slotId);
    setAlternateTimesOpenFor(null);
  };

  const toggleAlternateTimes = (slotId: string) => {
    setAlternateTimesOpenFor((current) => (current === slotId ? null : slotId));
  };

  return (
    <ScreenSurface>
      <SectionCard
        title="Date night generator"
        subtitle="Roll for something playful and intentional when you want to feel close without overplanning it"
      >
        <View style={styles.diceCard}>
          <View style={styles.diceBadge}>
            <Text style={styles.diceEmoji}>🎲</Text>
            <Text style={styles.diceMeta}>Roll #{dateIdeaRolls}</Text>
          </View>
          <View style={styles.toolCopy}>
            <Text style={styles.promptText}>{selectedDateIdea}</Text>
            <Text style={styles.feedMeta}>
              Pull a fresh idea any time you want a low-pressure way to connect.
            </Text>
          </View>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.primaryButton, styles.actionButton]}
            onPress={rollDateIdea}
          >
            <Text style={styles.primaryButtonText}>Roll the dice</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryAction, styles.actionButton]}
            onPress={saveDateIdea}
          >
            <Text style={styles.secondaryActionText}>Save idea</Text>
          </TouchableOpacity>
        </View>

        {savedDateIdeas.length ? (
          <View style={styles.subsectionBlock}>
            <Text style={styles.subsectionTitle}>Saved ideas</Text>
            {savedDateIdeas.map((idea) => (
              <View key={idea} style={styles.savedIdeaCard}>
                <Text style={styles.feedMeta}>{idea}</Text>
                <TouchableOpacity onPress={() => removeSavedDateIdea(idea)}>
                  <Text style={styles.removeText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Smart call scheduling"
        subtitle="Linked calendar-aware windows that help you find open time without overlap"
      >
        <View style={styles.calendarSyncCard}>
          <Text style={styles.feedTitle}>Shared calendar scan</Text>
          <Text style={styles.feedMeta}>
            These suggestions assume both calendars are connected, so class blocks, work
            meetings, and existing plans are filtered out first.
          </Text>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Who are you planning for?</Text>
          <View style={styles.chipWrap}>
            {[...new Set(liveCallWindows.map((slot) => slot.person))].map((person) => (
              <FilterChip
                key={person}
                label={person}
                active={selectedPerson === person}
                onPress={() => setSelectedPerson(person)}
              />
            ))}
          </View>
        </View>

        {liveCallWindows.length ? (
          <View style={styles.controlGroup}>
            <Text style={styles.controlLabel}>What energy level fits best?</Text>
            <View style={styles.chipWrap}>
              {["all", "low", "steady", "high"].map((energy) => (
                <FilterChip
                  key={energy}
                  label={energy}
                  active={selectedEnergy === energy}
                  onPress={() =>
                    setSelectedEnergy(energy as "all" | "low" | "steady" | "high")
                  }
                />
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.feedMeta}>
              Smart call scheduling starts blank for new accounts. Add your people first, then this section can suggest shared windows.
            </Text>
          </View>
        )}

        {filteredCallWindows.map((slot) => (
          <View key={slot.id} style={styles.callCard}>
            <View style={[styles.callBadge, styles.toolBadge]}>
              <Text style={styles.callBadgeText}>{slot.confidence}</Text>
            </View>
            <View style={styles.toolCopy}>
              <Text style={styles.feedTitle}>{slot.title}</Text>
              <Text style={styles.feedMeta}>{slot.detail}</Text>
              <Text style={styles.helperMeta}>
                {slot.person} | {slot.energyFit} energy fit
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.actionButton]}
                  onPress={() => scheduleCall(slot.id)}
                >
                  <Text style={styles.primaryButtonText}>Schedule call</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryAction, styles.actionButton]}
                  onPress={() => toggleAlternateTimes(slot.id)}
                >
                  <Text style={styles.secondaryActionText}>Find alternate times</Text>
                </TouchableOpacity>
              </View>

              {scheduledCallId === slot.id ? (
                <View style={styles.confirmationCard}>
                  <Text style={styles.helperMeta}>
                    Call draft added to both calendars. Next step: confirm and send.
                  </Text>
                </View>
              ) : null}

              {alternateTimesOpenFor === slot.id ? (
                <View style={styles.altList}>
                  {alternateWindows.map((window) => (
                    <View key={window} style={styles.altRow}>
                      <Text style={styles.feedMeta}>{window}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        ))}

        {!filteredCallWindows.length && liveCallWindows.length ? (
          <View style={styles.emptyState}>
            <Text style={styles.feedMeta}>
              No perfect match yet for that energy level. Try a different energy filter
              to see more suggestions.
            </Text>
          </View>
        ) : null}
      </SectionCard>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  promptText: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "700",
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  diceCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    alignItems: "center",
  },
  diceBadge: {
    width: 84,
    minHeight: 84,
    borderRadius: 22,
    backgroundColor: palette.softSun,
    borderWidth: 1,
    borderColor: "#F1E3C8",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 8,
  },
  diceEmoji: {
    fontSize: 28,
  },
  diceMeta: {
    color: palette.berry,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  callCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  toolBadge: {
    minWidth: 76,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  callBadge: {
    backgroundColor: palette.mint,
    borderWidth: 1,
    borderColor: "#CDEBDD",
  },
  callBadgeText: {
    color: palette.teal,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  toolCopy: {
    flex: 1,
    gap: 4,
    paddingTop: 1,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  actionButton: {
    flex: 1,
    minHeight: 54,
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: palette.text,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryAction: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.text,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: "#FFFCFA",
  },
  secondaryActionText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  confirmationCard: {
    backgroundColor: palette.mint,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    padding: 12,
  },
  altList: {
    gap: 8,
    paddingTop: 2,
  },
  altRow: {
    backgroundColor: "#FFF8F2",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  calendarSyncCard: {
    gap: 6,
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  controlGroup: {
    gap: 8,
  },
  controlLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  helperMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
  },
  subsectionBlock: {
    gap: 10,
    paddingTop: 4,
  },
  subsectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
  },
  savedIdeaCard: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF8F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  removeText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  emptyState: {
    backgroundColor: "#FFF8F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  feedTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
  },
  feedMeta: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
