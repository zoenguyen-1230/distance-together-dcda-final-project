import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { composerActions, conversations } from "../../data/mockData";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { useAuth } from "../../providers/AuthProvider";
import { palette } from "../../theme/palette";

export function ChatScreen() {
  const { isDemoMode } = useAuth();
  const liveConversations = isDemoMode ? conversations : [];

  return (
    <ScreenSurface>
      <SectionCard
        title="Messages"
        subtitle="Text, photos, voice notes, and video messages in one asynchronous thread"
      >
        {liveConversations.length ? (
          liveConversations.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageBubble,
                message.from === "You" ? styles.messageBubbleSelf : styles.messageBubbleOther,
              ]}
            >
              <Text style={styles.messageMeta}>
                {message.from} | {message.type}
              </Text>
              <Text style={styles.messageBody}>{message.body}</Text>
              <Text style={styles.messageTime}>{message.sentAt}</Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.messageBody}>
              New accounts start with an empty thread. Add someone in `People` to begin your first chat.
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Composer"
        subtitle="Prototype actions for the rich message tray"
      >
        <View style={styles.composerGrid}>
          {composerActions.map((action) => (
            <View key={action} style={styles.composerTile}>
              <Text style={styles.composerTileText}>{action}</Text>
            </View>
          ))}
        </View>
      </SectionCard>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  messageBubble: {
    borderRadius: 22,
    padding: 16,
    maxWidth: "90%",
    gap: 8,
  },
  messageBubbleSelf: {
    backgroundColor: "#FFE2D9",
    alignSelf: "flex-end",
  },
  messageBubbleOther: {
    backgroundColor: "#F5EFEA",
    alignSelf: "flex-start",
  },
  messageMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  messageBody: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 24,
  },
  messageTime: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  composerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  composerTile: {
    width: "48%",
    minHeight: 90,
    borderRadius: 22,
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
    justifyContent: "flex-end",
  },
  composerTileText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#F5EFEA",
    borderWidth: 1,
    borderColor: palette.line,
  },
});
