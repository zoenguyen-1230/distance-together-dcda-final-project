import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MetricCard } from "../../components/ui/MetricCard";
import { MultiSelectDropdown } from "../../components/ui/MultiSelectDropdown";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { moodUpdates, promptDeck } from "../../data/mockData";
import { getMonthNames, parseDateValue } from "../../lib/dateHelpers";
import { useAuth } from "../../providers/AuthProvider";
import { useAppData } from "../../providers/AppDataProvider";
import { useProfile } from "../../providers/ProfileProvider";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";

const moodOptions = ["hopeful", "busy", "calm", "excited"];
const energyOptions = ["low", "steady", "high"];
const healthOptions = ["rested", "okay", "needs rest", "on the go"];
const monthNames = getMonthNames();

function getJournalEntryDate(entryDate: string) {
  const trimmed = entryDate.trim();

  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return parseDateValue(trimmed);
  }

  const withYearMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (withYearMatch) {
    const [, monthName, dayText, yearText] = withYearMatch;
    const monthIndex = monthNames.findIndex((month) => month === monthName);

    if (monthIndex >= 0) {
      return new Date(Number(yearText), monthIndex, Number(dayText), 12, 0, 0);
    }
  }

  const withoutYearMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2})$/);
  if (withoutYearMatch) {
    const [, monthName, dayText] = withoutYearMatch;
    const monthIndex = monthNames.findIndex((month) => month === monthName);

    if (monthIndex >= 0) {
      return new Date(new Date().getFullYear(), monthIndex, Number(dayText), 12, 0, 0);
    }
  }

  return null;
}

function getJournalStreak(entryDates: string[]) {
  if (!entryDates.length) {
    return 0;
  }

  const uniqueTimes = Array.from(
    new Set(
      entryDates
        .map((entryDate) => getJournalEntryDate(entryDate)?.getTime() ?? null)
        .filter((value): value is number => typeof value === "number")
    )
  ).sort((a, b) => b - a);

  if (!uniqueTimes.length) {
    return 0;
  }

  let streak = 1;

  for (let index = 1; index < uniqueTimes.length; index += 1) {
    const previous = uniqueTimes[index - 1];
    const current = uniqueTimes[index];
    const differenceInDays = Math.round((previous - current) / (1000 * 60 * 60 * 24));

    if (differenceInDays === 1) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function getDaysAway(dateValue: string) {
  const tripDate = new Date(`${dateValue}T12:00:00`);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
    0,
    0
  );

  return Math.max(
    0,
    Math.ceil((tripDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function formatParticipantLine(names: string[]) {
  if (!names.length) {
    return "";
  }

  if (names.length === 1) {
    return ` with ${names[0]}`;
  }

  if (names.length === 2) {
    return ` with ${names[0]} and ${names[1]}`;
  }

  return ` with ${names[0]} and ${names.length - 1} others`;
}

export function HomeScreen() {
  const { displayName, userEmail, isDemoMode, previewMode } = useAuth();
  const { profile } = useProfile();
  const {
    connections,
    visitPlans,
    journalEntries,
    timeCapsules,
    checkInPrompts,
    setCheckInPrompts,
  } = useAppData();
  const liveConnections = connections;
  const liveMoodUpdates = isDemoMode ? moodUpdates : [];
  const [selectedPrompt, setSelectedPrompt] = useState(promptDeck[0]);
  const [myMood, setMyMood] = useState("calm");
  const [myEnergy, setMyEnergy] = useState("steady");
  const [myHealth, setMyHealth] = useState("okay");
  const [openStatusMenu, setOpenStatusMenu] = useState<"mood" | "energy" | "health" | null>(
    null
  );
  const [openAudienceMenu, setOpenAudienceMenu] = useState(false);
  const [openPromptMenu, setOpenPromptMenu] = useState(false);
  const [openPromptAudienceMenu, setOpenPromptAudienceMenu] = useState(false);
  const [selectedAudience, setSelectedAudience] = useState<string[]>(
    isDemoMode ? ["conn-1", "conn-3"] : []
  );
  const [selectedPromptAudience, setSelectedPromptAudience] = useState<string[]>(
    isDemoMode ? ["conn-1", "conn-3"] : []
  );
  const [statusSent, setStatusSent] = useState(false);
  const [promptSent, setPromptSent] = useState(false);
  const [promptReplyDrafts, setPromptReplyDrafts] = useState<Record<string, string>>({});

  const upcomingTrip = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return [...visitPlans]
      .filter((trip) => !trip.archived)
      .map((trip) => {
        const parsedDate = parseDateValue(trip.startDate);

        return parsedDate ? { trip, parsedDate } : null;
      })
      .filter(
        (
          value
        ): value is {
          trip: (typeof visitPlans)[number];
          parsedDate: Date;
        } => Boolean(value && value.parsedDate >= startOfToday)
      )
      .sort((left, right) => left.parsedDate.getTime() - right.parsedDate.getTime())[0];
  }, [visitPlans]);

  const upcomingTripNames = useMemo(() => {
    if (!upcomingTrip) {
      return [];
    }

    return upcomingTrip.trip.participantIds
      .map((participantId) =>
        liveConnections.find((connection) => connection.id === participantId)?.name ?? ""
      )
      .filter(Boolean);
  }, [liveConnections, upcomingTrip]);

  const toggleAudience = (connectionId: string) => {
    setSelectedAudience((current) =>
      current.includes(connectionId)
        ? current.filter((item) => item !== connectionId)
        : [...current, connectionId]
    );
  };

  const togglePromptAudience = (connectionId: string) => {
    setSelectedPromptAudience((current) =>
      current.includes(connectionId)
        ? current.filter((item) => item !== connectionId)
        : [...current, connectionId]
    );
  };

  const sendStatus = () => {
    setStatusSent(true);
  };

  const sendPrompt = () => {
    if (!selectedPromptAudience.length) {
      return;
    }

    setCheckInPrompts((current) => [
      ...selectedPromptAudience.map((connectionId, index) => ({
        id: `prompt-${Date.now()}-${index}`,
        connectionId,
        promptText: selectedPrompt,
        sentAt: "Sent just now",
        direction: "outgoing" as const,
      })),
      ...current,
    ]);
    setPromptSent(true);
  };

  const incomingPrompts = checkInPrompts.filter((prompt) => prompt.direction === "incoming");

  const savePromptReply = (promptId: string) => {
    const nextReply = (promptReplyDrafts[promptId] ?? "").trim();

    if (!nextReply) {
      return;
    }

    setCheckInPrompts((current) =>
      current.map((prompt) =>
        prompt.id === promptId
          ? {
              ...prompt,
              replyText: nextReply,
            }
          : prompt
      )
    );
  };

  const bannerBody = upcomingTrip
    ? `${getDaysAway(upcomingTrip.trip.startDate)} more day${
        getDaysAway(upcomingTrip.trip.startDate) === 1 ? "" : "s"
      } until your next time together${formatParticipantLine(upcomingTripNames)} in ${
        upcomingTrip.trip.location
      }.`
    : liveConnections.length === 1
      ? `You have 1 person in your circle. Start a chat, share a live update, or plan your next memory together.`
      : liveConnections.length > 1
        ? `You have ${liveConnections.length} people in your circle. Keep the momentum going with a check-in, shared plan, or new memory.`
        : "Start by setting up your profile and adding your first person.";
  const sharedEntryCount = journalEntries.length;
  const savedCapsuleCount = timeCapsules.length;
  const journalStreak = getJournalStreak(journalEntries.map((entry) => entry.date));

  return (
    <ScreenSurface>
      <LinearGradient
        colors={[palette.softRose, palette.softSun]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.bannerAccent} pointerEvents="none">
          <View style={styles.bannerAccentDotLarge} />
          <View style={styles.bannerAccentLine} />
          <View style={styles.bannerAccentDotSmall} />
        </View>
        <Text style={styles.bannerEyebrow}>
          {previewMode === "filled"
            ? "Preview: Full demo"
            : previewMode === "blank"
              ? "Preview: Blank account"
              : isDemoMode
                ? "Prototype mode"
                : "Live account"}
        </Text>
        <Text style={styles.bannerTitle}>
          Welcome back, {profile.displayName || displayName || userEmail?.split("@")[0] || "friend"}.
        </Text>
        <Text style={styles.bannerBody}>{bannerBody}</Text>
      </LinearGradient>

      <View style={styles.metricRow}>
        <MetricCard label="Streak" value={`${journalStreak} day${journalStreak === 1 ? "" : "s"}`} accent={palette.coral} />
        <MetricCard label="Shared entries" value={`${sharedEntryCount}`} accent={palette.teal} />
        <MetricCard label="Saved capsules" value={`${savedCapsuleCount}`} accent={palette.berry} />
      </View>

      <SectionCard
        title="Your live status"
        subtitle="Send your own quick update so your people know how you are doing in real time"
      >
        <View style={styles.statusCard}>
          <Text style={styles.feedTitle}>How are you showing up today?</Text>
          <Text style={styles.feedMeta}>
            Mood: {myMood} | Energy: {myEnergy} | Health: {myHealth}
          </Text>
          <Text style={styles.feedSubtle}>
            Sharing as You
            {profile.location ? ` • ${profile.location}` : ""}
            {profile.timezone ? ` • ${profile.timezone}` : ""}
          </Text>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Mood</Text>
          <View style={styles.selectWrap}>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() =>
                setOpenStatusMenu((current) => (current === "mood" ? null : "mood"))
              }
            >
              <Text style={styles.selectButtonText}>{myMood}</Text>
              <Text style={styles.selectChevron}>{openStatusMenu === "mood" ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {openStatusMenu === "mood" ? (
              <View style={styles.optionList}>
                {moodOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.optionRow}
                    onPress={() => {
                      setMyMood(option);
                      setOpenStatusMenu(null);
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Energy</Text>
          <View style={styles.selectWrap}>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() =>
                setOpenStatusMenu((current) => (current === "energy" ? null : "energy"))
              }
            >
              <Text style={styles.selectButtonText}>{myEnergy}</Text>
              <Text style={styles.selectChevron}>{openStatusMenu === "energy" ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {openStatusMenu === "energy" ? (
              <View style={styles.optionList}>
                {energyOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.optionRow}
                    onPress={() => {
                      setMyEnergy(option);
                      setOpenStatusMenu(null);
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Health</Text>
          <View style={styles.selectWrap}>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() =>
                setOpenStatusMenu((current) => (current === "health" ? null : "health"))
              }
            >
              <Text style={styles.selectButtonText}>{myHealth}</Text>
              <Text style={styles.selectChevron}>{openStatusMenu === "health" ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {openStatusMenu === "health" ? (
              <View style={styles.optionList}>
                {healthOptions.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={styles.optionRow}
                    onPress={() => {
                      setMyHealth(option);
                      setOpenStatusMenu(null);
                    }}
                  >
                    <Text style={styles.optionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.controlGroup}>
          <MultiSelectDropdown
            label="Send to"
            selectedLabels={liveConnections
              .filter((connection) => selectedAudience.includes(connection.id))
              .map((connection) => connection.name)}
            options={liveConnections.map((connection) => ({
              id: connection.id,
              label: connection.name,
            }))}
            isOpen={openAudienceMenu}
            onToggleOpen={() => setOpenAudienceMenu((current) => !current)}
            onToggleOption={toggleAudience}
            emptyHelper="Add someone in `People` before sending a live status update."
          />
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={sendStatus}>
          <Text style={styles.primaryButtonText}>Share status with your people</Text>
        </TouchableOpacity>

        {statusSent ? (
          <View style={styles.sentCard}>
            <Text style={styles.feedSubtle}>
              Sent to{" "}
              {liveConnections
                .filter((connection) => selectedAudience.includes(connection.id))
                .map((connection) => connection.name)
                .join(", ") || "your circle"}
            </Text>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Daily check-in prompt"
        subtitle="A small ritual for intentional connection"
      >
        <Text style={styles.promptText}>{selectedPrompt}</Text>
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Prompt to send</Text>
          <View style={styles.selectWrap}>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setOpenPromptMenu((current) => !current)}
            >
              <Text style={styles.promptSelectText}>{selectedPrompt}</Text>
              <Text style={styles.selectChevron}>{openPromptMenu ? "▲" : "▼"}</Text>
            </TouchableOpacity>
            {openPromptMenu ? (
              <View style={styles.optionList}>
                {promptDeck.map((prompt) => (
                  <TouchableOpacity
                    key={prompt}
                    style={styles.optionRow}
                    onPress={() => {
                      setSelectedPrompt(prompt);
                      setOpenPromptMenu(false);
                    }}
                  >
                    <Text style={styles.promptOptionText}>{prompt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>
        <MultiSelectDropdown
          label="Send prompt to"
          selectedLabels={liveConnections
            .filter((connection) => selectedPromptAudience.includes(connection.id))
            .map((connection) => connection.name)}
          options={liveConnections.map((connection) => ({
            id: connection.id,
            label: connection.name,
          }))}
          isOpen={openPromptAudienceMenu}
          onToggleOpen={() => setOpenPromptAudienceMenu((current) => !current)}
          onToggleOption={togglePromptAudience}
          emptyHelper="Add someone in `People` before sending a daily prompt."
        />
        <TouchableOpacity style={styles.primaryButton} onPress={sendPrompt}>
          <Text style={styles.primaryButtonText}>Send prompt to your circle</Text>
        </TouchableOpacity>
        {promptSent ? (
          <View style={styles.sentCard}>
            <Text style={styles.feedSubtle}>
              Prompt sent to{" "}
              {liveConnections
                .filter((connection) => selectedPromptAudience.includes(connection.id))
                .map((connection) => connection.name)
                .join(", ") || "your circle"}
            </Text>
          </View>
        ) : null}

        <View style={styles.promptInboxBlock}>
          <Text style={styles.feedTitle}>Prompts from your people</Text>
          <Text style={styles.feedMeta}>
            Reply to each prompt separately so different people can ask different things at the same time.
          </Text>
          {incomingPrompts.length ? (
            incomingPrompts.map((prompt) => {
              const sender =
                liveConnections.find((connection) => connection.id === prompt.connectionId)?.name ??
                "Your person";

              return (
                <View key={prompt.id} style={styles.promptReplyCard}>
                  <Text style={styles.feedTitle}>{sender} asked:</Text>
                  <Text style={styles.promptText}>{prompt.promptText}</Text>
                  <Text style={styles.feedSubtle}>{prompt.sentAt}</Text>
                  <TextInput
                    value={promptReplyDrafts[prompt.id] ?? prompt.replyText ?? ""}
                    onChangeText={(value) =>
                      setPromptReplyDrafts((current) => ({ ...current, [prompt.id]: value }))
                    }
                    placeholder={`Reply to ${sender}`}
                    placeholderTextColor="#A08F89"
                    style={[styles.textInput, styles.replyInput]}
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => savePromptReply(prompt.id)}
                  >
                    <Text style={styles.primaryButtonText}>
                      {prompt.replyText ? "Update reply" : "Send reply"}
                    </Text>
                  </TouchableOpacity>
                  {prompt.replyText ? (
                    <View style={styles.replyPreviewCard}>
                      <Text style={styles.feedMeta}>Your reply</Text>
                      <Text style={styles.replyPreviewText}>{prompt.replyText}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.feedMeta}>
                Prompts from other people will land here when they check in with you.
              </Text>
            </View>
          )}
        </View>
      </SectionCard>

      <SectionCard
        title="Mood sharing"
        subtitle="Quick emotional and wellness updates from your people"
      >
        {liveMoodUpdates.length ? (
          liveMoodUpdates.map((mood) => (
            <View key={mood.id} style={styles.feedCard}>
              <View style={[styles.avatarBadge, { backgroundColor: mood.color }]}>
                <Text style={styles.avatarLabel}>{mood.name[0]}</Text>
              </View>
              <View style={styles.feedCopy}>
                <Text style={styles.feedTitle}>{mood.name} feels {mood.mood}</Text>
                <Text style={styles.feedMeta}>
                  Energy: {mood.energy} | Health: {mood.health}
                </Text>
                <Text style={styles.feedSubtle}>{mood.updatedAt}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.feedMeta}>
              Mood updates from your people will appear here once you start connecting.
            </Text>
          </View>
        )}
      </SectionCard>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 28,
    padding: 22,
    gap: 8,
    overflow: "hidden",
  },
  bannerAccent: {
    position: "absolute",
    top: 18,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    opacity: 0.75,
  },
  bannerAccentDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: palette.berry,
  },
  bannerAccentLine: {
    width: 20,
    height: 2,
    borderRadius: 999,
    backgroundColor: "#E8BBC8",
  },
  bannerAccentDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#E8BBC8",
  },
  bannerEyebrow: {
    color: palette.berry,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    fontFamily: typography.sansFamilyMedium,
  },
  bannerTitle: {
    color: palette.text,
    fontSize: 32,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.6,
  },
  bannerBody: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: typography.sansFamily,
  },
  metricRow: {
    flexDirection: "row",
    gap: 10,
  },
  statusCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    gap: 4,
  },
  controlGroup: {
    gap: 8,
  },
  controlLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
    letterSpacing: 0.2,
  },
  promptText: {
    color: palette.text,
    fontSize: 18,
    lineHeight: 28,
    fontWeight: "700",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
  },
  selectWrap: {
    gap: 6,
  },
  selectButton: {
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
  selectButtonText: {
    color: palette.text,
    fontSize: 14,
    flex: 1,
    textTransform: "capitalize",
    fontFamily: typography.sansFamily,
  },
  promptSelectText: {
    color: palette.text,
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
  selectChevron: {
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
  },
  optionText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
    fontFamily: typography.sansFamilyMedium,
  },
  promptOptionText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
    fontFamily: typography.sansFamilyMedium,
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
    fontFamily: typography.sansFamilyMedium,
  },
  sentCard: {
    backgroundColor: palette.mint,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#CDEBDD",
    padding: 14,
  },
  emptyCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
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
  avatarBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F4E6DF",
  },
  avatarLabel: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
  },
  feedCopy: {
    flex: 1,
    gap: 3,
  },
  feedTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
  },
  feedMeta: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
  feedSubtle: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: typography.sansFamilyMedium,
  },
  textInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 14,
    fontFamily: typography.sansFamily,
  },
  replyInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  promptInboxBlock: {
    gap: 12,
  },
  promptReplyCard: {
    gap: 10,
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  replyPreviewCard: {
    backgroundColor: "#FFFCFA",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0DDD3",
    padding: 12,
    gap: 4,
  },
  replyPreviewText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
});
