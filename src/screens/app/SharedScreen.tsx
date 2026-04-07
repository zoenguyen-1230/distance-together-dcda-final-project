import React, { useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  calendarEvents,
  journalEntries,
  timeCapsules,
} from "../../data/mockData";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { useAuth } from "../../providers/AuthProvider";
import { palette } from "../../theme/palette";

function getJournalDateParts(date: string) {
  const [month = "", day = ""] = date.split(" ");

  return {
    month: month.slice(0, 3).toUpperCase(),
    day,
  };
}

export function SharedScreen() {
  const { isDemoMode } = useAuth();
  const [entries, setEntries] = useState(isDemoMode ? journalEntries : []);
  const [draftPhotos, setDraftPhotos] = useState<Record<string, string>>({});
  const liveTimeCapsules = isDemoMode ? timeCapsules : [];
  const liveCalendarEvents = isDemoMode ? calendarEvents : [];

  const addPhotoToEntry = (entryId: string, label: string) => {
    const cleanLabel = label.trim();

    if (!cleanLabel) {
      return;
    }

    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? { ...entry, photos: [...entry.photos, cleanLabel] }
          : entry
      )
    );
    setDraftPhotos((current) => ({ ...current, [entryId]: "" }));
  };

  const removePhotoFromEntry = (entryId: string, label: string) => {
    setEntries((current) =>
      current.map((entry) =>
        entry.id === entryId
          ? { ...entry, photos: entry.photos.filter((photo) => photo !== label) }
          : entry
      )
    );
  };

  const recentPhotoIdeas = [
    "coffee receipt snapshot",
    "museum hallway mirror",
    "airport goodbye selfie",
    "playlist screenshot",
  ];

  return (
    <ScreenSurface>
      <SectionCard
        title="Shared journal"
        subtitle="Capture the moments that matter, not just the messages you send"
      >
        {entries.length ? entries.map((entry) => (
          <View key={entry.id} style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <View style={styles.timelineBadge}>
                <Text style={styles.timelineMonth}>{getJournalDateParts(entry.date).month}</Text>
                <Text style={styles.timelineDay}>{getJournalDateParts(entry.date).day}</Text>
              </View>
              <View style={styles.timelineCopy}>
                <Text style={styles.timelineTitle}>{entry.title}</Text>
                <Text style={styles.timelineBody}>{entry.body}</Text>
              </View>
            </View>
            <View style={styles.photoStrip}>
              {entry.photos.map((photo) => (
                <TouchableOpacity
                  key={photo}
                  style={styles.photoTile}
                  onPress={() => removePhotoFromEntry(entry.id, photo)}
                  activeOpacity={0.9}
                >
                  <View style={styles.photoArt}>
                    <Text style={styles.photoArtLabel}>PHOTO</Text>
                    <Text style={styles.photoArtHint}>placeholder</Text>
                  </View>
                  <View style={styles.photoMeta}>
                    <Text style={styles.photoTileLabel}>{photo}</Text>
                    <Text style={styles.photoTileHint}>Tap to remove</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.photoAddTile}
                onPress={() => addPhotoToEntry(entry.id, draftPhotos[entry.id] ?? "")}
                activeOpacity={0.9}
              >
                <View style={styles.photoAddArt}>
                  <Text style={styles.photoAddPlus}>+</Text>
                </View>
                <View style={styles.photoMeta}>
                  <Text style={styles.photoAddLabel}>Add photo</Text>
                  <Text style={styles.photoAddHint}>
                    {draftPhotos[entry.id]?.trim()
                      ? "Use the draft caption below"
                      : "Name a memory below first"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.photoComposer}>
              <Text style={styles.composerLabel}>Add a photo caption or placeholder label</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={draftPhotos[entry.id] ?? ""}
                  onChangeText={(value) =>
                    setDraftPhotos((current) => ({ ...current, [entry.id]: value }))
                  }
                  placeholder="ex: coffee shop selfie"
                  placeholderTextColor="#A08F89"
                  style={styles.textInput}
                />
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addPhotoToEntry(entry.id, draftPhotos[entry.id] ?? "")}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.ideaWrap}>
                {recentPhotoIdeas.map((idea) => (
                  <TouchableOpacity
                    key={`${entry.id}-${idea}`}
                    style={styles.ideaChip}
                    onPress={() => addPhotoToEntry(entry.id, idea)}
                  >
                    <Text style={styles.ideaChipText}>{idea}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.feedMeta}>
              Your shared journal starts blank. Add your first memory once you begin using the app together.
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Time capsule"
        subtitle="Leave something meaningful for later"
      >
        {liveTimeCapsules.length ? liveTimeCapsules.map((capsule) => (
          <View key={capsule.id} style={styles.feedCard}>
            <View style={styles.capsuleBadge}>
              <Text style={styles.capsuleBadgeText}>TC</Text>
            </View>
            <View style={styles.feedCopy}>
              <Text style={styles.feedTitle}>{capsule.title}</Text>
              <Text style={styles.feedMeta}>
                Opens on {capsule.unlockDate} | From {capsule.from}
              </Text>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.feedMeta}>
              Time capsules will show up here after you save your first message for later.
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Shared calendar"
        subtitle="Stay aligned on rituals, travel, birthdays, and intentional time together"
      >
        {liveCalendarEvents.length ? liveCalendarEvents.map((event) => (
          <View key={event.id} style={styles.calendarRow}>
            <View style={styles.calendarDate}>
              <Text style={styles.calendarDateMonth}>{event.month}</Text>
              <Text style={styles.calendarDateDay}>{event.day}</Text>
            </View>
            <View style={styles.feedCopy}>
              <Text style={styles.feedTitle}>{event.title}</Text>
              <Text style={styles.feedMeta}>{event.detail}</Text>
            </View>
          </View>
        )) : (
          <View style={styles.emptyCard}>
            <Text style={styles.feedMeta}>
              Your shared calendar is empty right now. Trips, rituals, and visits will appear here once you create them.
            </Text>
          </View>
        )}
      </SectionCard>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  timelineCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 14,
  },
  timelineHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
  },
  timelineBadge: {
    width: 60,
    borderRadius: 18,
    backgroundColor: "#FFF1E7",
    borderWidth: 1,
    borderColor: "#F4E6DF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  timelineCopy: {
    flex: 1,
    gap: 6,
  },
  timelineMonth: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  timelineDay: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800",
  },
  timelineTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "800",
  },
  timelineBody: {
    color: palette.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  photoStrip: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  photoTile: {
    width: 128,
    borderRadius: 20,
    backgroundColor: "#FFF1E7",
    borderWidth: 1,
    borderColor: "#F4E6DF",
    overflow: "hidden",
  },
  photoArt: {
    minHeight: 96,
    backgroundColor: "#F7E8DA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0DDD3",
  },
  photoArtLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  photoArtHint: {
    color: palette.berry,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  photoMeta: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  photoTileLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  photoTileHint: {
    color: palette.berry,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  photoAddTile: {
    width: 128,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#E6CDBE",
    backgroundColor: "#FFFBF7",
    overflow: "hidden",
  },
  photoAddArt: {
    minHeight: 96,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0DDD3",
    backgroundColor: "#FFF6ED",
  },
  photoAddPlus: {
    color: palette.berry,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "300",
  },
  photoAddLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "800",
  },
  photoAddHint: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 6,
  },
  photoComposer: {
    gap: 10,
  },
  composerLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  textInput: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 18,
    backgroundColor: palette.text,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  ideaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ideaChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#F4E6DF",
    backgroundColor: "#FFF1E7",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ideaChipText: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
  },
  feedCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  capsuleBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.lavender,
    borderWidth: 1,
    borderColor: "#E6D6F3",
  },
  capsuleBadgeText: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 12,
  },
  feedCopy: {
    flex: 1,
    gap: 3,
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
  emptyCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  calendarRow: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  calendarDate: {
    width: 60,
    borderRadius: 18,
    backgroundColor: "#FFF1E7",
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F4E6DF",
  },
  calendarDateMonth: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  calendarDateDay: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800",
  },
});
