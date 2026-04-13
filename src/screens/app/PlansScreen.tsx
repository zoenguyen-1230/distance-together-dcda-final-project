import React, { useMemo, useState } from "react";
import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { FilterChip } from "../../components/ui/FilterChip";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { env, hasGoogleCalendarClientId, hasSupabaseCredentials } from "../../config/env";
import { dateIdeas } from "../../data/mockData";
import { inputValueToDisplayDate, parseDateValue, toDateValue } from "../../lib/dateHelpers";
import {
  clearGoogleCalendarSession,
  connectGoogleCalendar,
  createGoogleCalendarEvent,
  readGoogleCalendarSession,
} from "../../lib/googleCalendar";
import { saveSharedCalendarEvent } from "../../lib/sharedContent";
import { isSharedConnection } from "../../lib/sharedRelationships";
import { useAppData } from "../../providers/AppDataProvider";
import { useAuth } from "../../providers/AuthProvider";
import { useProfile } from "../../providers/ProfileProvider";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";
import { CalendarEvent, CalendarProvider } from "../../types";

const calendarProviderOptions: CalendarProvider[] = [
  "Google Calendar",
  "Apple Calendar",
  "Outlook",
];
const calendarProviderUrls: Record<CalendarProvider, string> = {
  "Google Calendar": "https://calendar.google.com/calendar/u/0/r",
  "Apple Calendar": "https://www.icloud.com/calendar",
  Outlook: "https://outlook.live.com/calendar/0/view/month",
};
const timezoneOffsets: Record<string, number> = {
  PT: -2,
  MT: -1,
  CT: 0,
  ET: 1,
  ICT: 12,
  GMT: 6,
  UTC: 6,
};
const energyTemplates = {
  low: { dayOffset: 1, startMinutes: 12 * 60 + 30, endMinutes: 13 * 60, confidence: "Low effort" },
  steady: { dayOffset: 2, startMinutes: 20 * 60, endMinutes: 20 * 60 + 45, confidence: "High match" },
  high: { dayOffset: 4, startMinutes: 9 * 60 + 30, endMinutes: 10 * 60 + 15, confidence: "Fresh energy" },
} as const;

type EnergyFit = "all" | "low" | "steady" | "high";
type SmartCallWindow = {
  id: string;
  person: string;
  energyFit: "low" | "steady" | "high";
  title: string;
  detail: string;
  confidence: string;
  dateValue: string;
  startLabel: string;
  endLabel: string;
  participantIds: string[];
};

function parseClockMinutes(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const suffix = match[3].toUpperCase();
  const normalizedHours = hours % 12 + (suffix === "PM" ? 12 : 0);
  return normalizedHours * 60 + minutes;
}

function formatClockMinutes(minutes: number) {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function shiftClockLabel(label: string, hourOffset: number) {
  const minutes = parseClockMinutes(label);
  if (minutes === null) {
    return label;
  }

  return formatClockMinutes(minutes + hourOffset * 60);
}

function buildUpcomingDate(dayOffset: number) {
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + dayOffset);
  return toDateValue(nextDate);
}

function buildCalendarAwareCallWindows(input: {
  connectionId: string;
  name: string;
  timezone: string;
  connectedCalendars: CalendarProvider[];
  relatedCalendarEvents: CalendarEvent[];
}): SmartCallWindow[] {
  const timezoneLabel = input.timezone || "their timezone";
  const timezoneOffset = timezoneOffsets[input.timezone] ?? 0;
  const busyCount = input.relatedCalendarEvents.length;
  const providerLabel = input.connectedCalendars.length
    ? input.connectedCalendars.join(" + ")
    : "Same Time shared calendar";

  return (Object.entries(energyTemplates) as Array<[Exclude<EnergyFit, "all">, (typeof energyTemplates)[Exclude<EnergyFit, "all">]]>).map(
    ([energyFit, template]) => {
      const dateValue = buildUpcomingDate(template.dayOffset);
      const startLabel = formatClockMinutes(template.startMinutes);
      const endLabel = formatClockMinutes(template.endMinutes);
      const peerStartLabel = shiftClockLabel(startLabel, timezoneOffset);
      const peerEndLabel = shiftClockLabel(endLabel, timezoneOffset);
      const headline =
        energyFit === "steady"
          ? `Best overlap this week: ${startLabel} CT / ${peerStartLabel} ${timezoneLabel}`
          : energyFit === "low"
            ? `Lower-pressure window: ${startLabel} CT / ${peerStartLabel} ${timezoneLabel}`
            : `Brighter-energy check-in: ${startLabel} CT / ${peerStartLabel} ${timezoneLabel}`;

      return {
        id: `call-${input.connectionId}-${energyFit}`,
        person: input.name,
        energyFit,
        title: headline,
        detail: `${input.name}'s calendar and your shared plans suggest ${inputValueToDisplayDate(dateValue)} from ${startLabel} to ${endLabel} CT (${peerStartLabel} to ${peerEndLabel} ${timezoneLabel}). ${busyCount ? `${busyCount} shared calendar item${busyCount === 1 ? "" : "s"} already shape this week.` : "No shared conflicts are on the calendar yet."}`,
        confidence: template.confidence,
        dateValue,
        startLabel,
        endLabel,
        participantIds: [input.connectionId],
      };
    }
  );
}

function buildAlternateWindows(slot: SmartCallWindow, timezone: string) {
  const timezoneOffset = timezoneOffsets[timezone] ?? 0;
  const startMinutes = parseClockMinutes(slot.startLabel) ?? 0;
  const suggestions = [-90, 90, 180].map((offset, index) => {
    const shiftedStart = formatClockMinutes(startMinutes + offset);
    const shiftedPeerStart = formatClockMinutes(startMinutes + offset + timezoneOffset * 60);
    const dateValue = buildUpcomingDate(index + 1);
    return `${inputValueToDisplayDate(dateValue)} • ${shiftedStart} CT / ${shiftedPeerStart} ${timezone || "their timezone"}`;
  });

  return suggestions;
}

function toGoogleDateToken(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function buildGoogleCalendarUrl(slot: SmartCallWindow) {
  const baseDate = parseDateValue(slot.dateValue);
  const startMinutes = parseClockMinutes(slot.startLabel);
  const endMinutes = parseClockMinutes(slot.endLabel);

  if (!baseDate || startMinutes === null || endMinutes === null) {
    return calendarProviderUrls["Google Calendar"];
  }

  const startDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    Math.floor(startMinutes / 60),
    startMinutes % 60,
    0
  );
  const endDate = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    Math.floor(endMinutes / 60),
    endMinutes % 60,
    0
  );

  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", `Call with ${slot.person}`);
  url.searchParams.set(
    "details",
    `Scheduled from Same Time\n\nSuggested window: ${slot.startLabel} - ${slot.endLabel} CT`
  );
  url.searchParams.set("dates", `${toGoogleDateToken(startDate)}/${toGoogleDateToken(endDate)}`);

  return url.toString();
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function PlansScreen() {
  const { user, userEmail } = useAuth();
  const { profile, saveProfile } = useProfile();
  const { connections, calendarEvents, setCalendarEvents } = useAppData();
  const liveCallWindows = useMemo(() => {
    if (!connections.length) {
      return [];
    }

    return connections.flatMap((connection) =>
      buildCalendarAwareCallWindows({
        connectionId: connection.id,
        name: connection.name,
        timezone: connection.timezone,
        connectedCalendars: profile.connectedCalendars ?? [],
        relatedCalendarEvents: calendarEvents.filter((event) =>
          (event.participantIds ?? []).includes(connection.id)
        ),
      })
    );
  }, [calendarEvents, connections, profile.connectedCalendars]);
  const [selectedDateIdea, setSelectedDateIdea] = useState(dateIdeas[0]);
  const [dateIdeaRolls, setDateIdeaRolls] = useState(1);
  const [savedDateIdeas, setSavedDateIdeas] = useState<string[]>([]);
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedEnergy, setSelectedEnergy] = useState<EnergyFit>("steady");
  const [scheduledCallId, setScheduledCallId] = useState<string | null>(null);
  const [scheduledCallMessage, setScheduledCallMessage] = useState<string | null>(null);
  const [alternateTimesOpenFor, setAlternateTimesOpenFor] = useState<string | null>(null);
  const [calendarConnectionMessage, setCalendarConnectionMessage] = useState<string | null>(null);

  const filteredCallWindows = useMemo(
    () =>
      liveCallWindows.filter(
        (slot) =>
          slot.person === selectedPerson &&
          (selectedEnergy === "all" || slot.energyFit === selectedEnergy)
      ),
    [liveCallWindows, selectedEnergy, selectedPerson]
  );

  const selectedConnection = connections.find((connection) => connection.name === selectedPerson);
  const connectedCalendars = profile.connectedCalendars ?? [];
  const googleCalendarSession = readGoogleCalendarSession(userEmail);

  React.useEffect(() => {
    if (!selectedPerson && liveCallWindows[0]?.person) {
      setSelectedPerson(liveCallWindows[0].person);
      return;
    }

    if (
      selectedPerson &&
      !liveCallWindows.some((slot) => slot.person === selectedPerson) &&
      liveCallWindows[0]?.person
    ) {
      setSelectedPerson(liveCallWindows[0].person);
    }
  }, [liveCallWindows, selectedPerson]);

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

  const toggleCalendarProvider = async (provider: CalendarProvider) => {
    const isConnected = connectedCalendars.includes(provider);

    if (provider === "Google Calendar") {
      if (isConnected) {
        clearGoogleCalendarSession(userEmail);
        await saveProfile({
          ...profile,
          connectedCalendars: connectedCalendars.filter((item) => item !== provider),
        });
        setCalendarConnectionMessage("Google Calendar disconnected.");
        return;
      }

      if (!hasGoogleCalendarClientId) {
        setCalendarConnectionMessage(
          "Add EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID first so Google Calendar can authorize on web."
        );
        return;
      }

      try {
        await connectGoogleCalendar({
          clientId: env.googleCalendarClientId,
          userEmail,
        });

        await saveProfile({
          ...profile,
          connectedCalendars: [...connectedCalendars, provider],
        });
        setCalendarConnectionMessage(
          "Google Calendar connected. Smart call drafts can now save into your Google Calendar."
        );
      } catch {
        setCalendarConnectionMessage(
          "Google Calendar authorization was canceled or could not be completed."
        );
      }
        return;
    }

    const nextCalendars = isConnected
      ? connectedCalendars.filter((item) => item !== provider)
      : [...connectedCalendars, provider];

    await saveProfile({
      ...profile,
      connectedCalendars: nextCalendars,
    });
    setCalendarConnectionMessage(
      isConnected ? `${provider} disconnected.` : `${provider} opened for calendar handoff.`
    );

    if (!isConnected) {
      const providerUrl = calendarProviderUrls[provider];

      if (providerUrl) {
        void Linking.openURL(providerUrl).catch(() => {
          // Keep the connection state saved even if the browser blocks the open.
        });
      }
    }
  };

  const scheduleCall = async (slot: SmartCallWindow) => {
    const date = parseDateValue(slot.dateValue);
    const startMinutes = parseClockMinutes(slot.startLabel);
    const endMinutes = parseClockMinutes(slot.endLabel);

    if (!date) {
      return;
    }

    const startDate =
      startMinutes === null
        ? null
        : new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            Math.floor(startMinutes / 60),
            startMinutes % 60,
            0
          );
    const endDate =
      endMinutes === null
        ? null
        : new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            Math.floor(endMinutes / 60),
            endMinutes % 60,
            0
          );

    const nextEvent: CalendarEvent = {
      id: `call-event-${Date.now()}`,
      month: date.toLocaleString("en-US", { month: "short" }).toUpperCase(),
      day: String(date.getDate()),
      title: `Call with ${slot.person}`,
      detail: `${slot.startLabel} - ${slot.endLabel} CT • Scheduled from Smart call scheduling`,
      dateValue: slot.dateValue,
      participantIds: slot.participantIds,
    };

    const shouldSaveShared =
      Boolean(user?.id && hasSupabaseCredentials && slot.participantIds.some((id) => isSharedConnection(id)));

    if (shouldSaveShared && user?.id) {
      try {
        const savedEvent = await saveSharedCalendarEvent({
          userId: user.id,
          event: nextEvent,
        });

        if (savedEvent) {
          setCalendarEvents((current) => [savedEvent, ...current]);
        }
      } catch {
        return;
      }
    } else {
      setCalendarEvents((current) => [nextEvent, ...current]);
    }

    setScheduledCallId(slot.id);
    setScheduledCallMessage("Call draft added to your shared calendar.");
    setAlternateTimesOpenFor(null);

    if (connectedCalendars.includes("Google Calendar") && googleCalendarSession && startDate && endDate) {
      try {
        await createGoogleCalendarEvent({
          accessToken: googleCalendarSession.accessToken,
          title: `Call with ${slot.person}`,
          description: `Scheduled from Same Time\n\nSuggested window: ${slot.startLabel} - ${slot.endLabel} CT`,
          startDate,
          endDate,
          timeZone: "America/Chicago",
        });
        setScheduledCallMessage(
          "Call draft added to your shared calendar and saved into Google Calendar."
        );
        return;
      } catch {
        clearGoogleCalendarSession(userEmail);
      }
    }

    if (connectedCalendars.includes("Google Calendar")) {
      setScheduledCallMessage(
        googleCalendarSession
          ? "Call draft added to your shared calendar. Google Calendar needs to reconnect, so a handoff tab was opened instead."
          : "Call draft added to your shared calendar. Finish Google Calendar authorization to save there directly."
      );
      void Linking.openURL(buildGoogleCalendarUrl(slot)).catch(() => {
        // Keep the shared calendar draft even if the external tab is blocked.
      });
    }
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
            Keep your calendars in step so call windows and shared plans stay aligned in one place.
          </Text>
          <View style={styles.chipWrap}>
            {calendarProviderOptions.map((provider) => (
              <FilterChip
                key={provider}
                label={provider}
                active={connectedCalendars.includes(provider)}
                onPress={() => void toggleCalendarProvider(provider)}
              />
            ))}
          </View>
          <Text style={styles.helperMeta}>
            {calendarConnectionMessage ??
              (connectedCalendars.length
                ? `Connected for scheduling: ${connectedCalendars.join(", ")}`
                : "Choose the calendars you want to keep aligned with Same Time. Shared call drafts will still appear here.")}
          </Text>
          {!hasGoogleCalendarClientId ? (
            <Text style={styles.helperMeta}>
              Google Calendar authorization turns on after you add a web client ID in
              {" "}EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID.
            </Text>
          ) : null}
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
                  label={toTitleCase(energy)}
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
              This space will suggest shared windows once you add the people you want to stay in rhythm with.
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
                {slot.person} | {toTitleCase(slot.energyFit)} energy fit
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.actionButton]}
                  onPress={() => void scheduleCall(slot)}
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
                  <Text style={styles.helperMeta}>{scheduledCallMessage}</Text>
                </View>
              ) : null}

              {alternateTimesOpenFor === slot.id ? (
                <View style={styles.altList}>
                  {buildAlternateWindows(slot, selectedConnection?.timezone ?? "").map((window) => (
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
              No gentle overlap for that energy right now. Try another pace and see what opens up.
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
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
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
    letterSpacing: 0.3,
    fontFamily: typography.sansFamilyMedium,
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
    letterSpacing: 0.3,
    fontFamily: typography.sansFamilyMedium,
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
    fontFamily: typography.sansFamilyMedium,
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
    letterSpacing: 0.2,
    fontFamily: typography.sansFamilyMedium,
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
    fontFamily: typography.sansFamilyMedium,
  },
  helperMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: typography.sansFamily,
  },
  subsectionBlock: {
    gap: 10,
    paddingTop: 4,
  },
  subsectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
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
    letterSpacing: 0.2,
    fontFamily: typography.sansFamilyMedium,
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
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
  },
  feedMeta: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
});
