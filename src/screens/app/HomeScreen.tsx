import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MetricCard } from "../../components/ui/MetricCard";
import { FilterChip } from "../../components/ui/FilterChip";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { connections, moodUpdates, nextVisit, promptDeck } from "../../data/mockData";
import { useAuth } from "../../providers/AuthProvider";
import { useProfile } from "../../providers/ProfileProvider";
import { palette } from "../../theme/palette";

const moodOptions = ["hopeful", "busy", "calm", "excited"];
const energyOptions = ["low", "steady", "high"];
const healthOptions = ["rested", "okay", "needs rest", "on the go"];

export function HomeScreen() {
  const { displayName, userEmail, isDemoMode, previewMode } = useAuth();
  const { profile } = useProfile();
  const liveConnections = isDemoMode ? connections : [];
  const liveMoodUpdates = isDemoMode ? moodUpdates : [];
  const liveNextVisit = isDemoMode ? nextVisit : null;
  const [selectedPrompt, setSelectedPrompt] = useState(promptDeck[0]);
  const [myMood, setMyMood] = useState("calm");
  const [myEnergy, setMyEnergy] = useState("steady");
  const [myHealth, setMyHealth] = useState("okay");
  const [openStatusMenu, setOpenStatusMenu] = useState<"mood" | "energy" | "health" | null>(
    null
  );
  const [selectedAudience, setSelectedAudience] = useState<string[]>(
    isDemoMode ? ["conn-1", "conn-3"] : []
  );
  const [statusSent, setStatusSent] = useState(false);

  const toggleAudience = (connectionId: string) => {
    setSelectedAudience((current) =>
      current.includes(connectionId)
        ? current.filter((item) => item !== connectionId)
        : [...current, connectionId]
    );
  };

  const sendStatus = () => {
    setStatusSent(true);
  };

  return (
    <ScreenSurface>
      <LinearGradient
        colors={[palette.softRose, palette.softSun]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
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
        <Text style={styles.bannerBody}>
          {liveNextVisit
            ? `${liveNextVisit.daysAway} days until your next time together in ${liveNextVisit.location}.`
            : "Start by setting up your profile and adding your first person."}
        </Text>
      </LinearGradient>

      <View style={styles.metricRow}>
        <MetricCard label="Streak" value={isDemoMode ? "14 days" : "0 days"} accent={palette.coral} />
        <MetricCard label="Shared entries" value={isDemoMode ? "42" : "0"} accent={palette.teal} />
        <MetricCard label="Pending capsules" value={isDemoMode ? "3" : "0"} accent={palette.berry} />
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
            Sharing as {profile.displayName}
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
          <Text style={styles.controlLabel}>Send to</Text>
          {liveConnections.length ? (
            <View style={styles.chipWrap}>
              {liveConnections.map((connection) => (
                <FilterChip
                  key={connection.id}
                  label={connection.name}
                  active={selectedAudience.includes(connection.id)}
                  onPress={() => toggleAudience(connection.id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.feedMeta}>
                Add someone in `People` before sending a live status update.
              </Text>
            </View>
          )}
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
        <View style={styles.chipWrap}>
          {promptDeck.map((prompt) => (
            <FilterChip
              key={prompt}
              label={prompt}
              active={selectedPrompt === prompt}
              onPress={() => setSelectedPrompt(prompt)}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Send prompt to your circle</Text>
        </TouchableOpacity>
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
  },
  bannerEyebrow: {
    color: palette.berry,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  bannerTitle: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "800",
  },
  bannerBody: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
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
  },
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
  feedSubtle: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
});
