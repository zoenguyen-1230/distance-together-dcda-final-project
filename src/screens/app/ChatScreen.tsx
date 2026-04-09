import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { FilterChip } from "../../components/ui/FilterChip";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { hasSupabaseCredentials } from "../../config/env";
import { pickImageFromDevice } from "../../lib/pickImageFromDevice";
import { saveSharedMessage } from "../../lib/sharedContent";
import { isSharedConnection } from "../../lib/sharedRelationships";
import { useAuth } from "../../providers/AuthProvider";
import { useAppData } from "../../providers/AppDataProvider";
import { useProfile } from "../../providers/ProfileProvider";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";

const reactionOptions = ["❤️", "👍", "😢", "✨", "😂", "🔥", "🥹", "🙌"];
const photoPreviewWebStyle = {
  width: 220,
  maxWidth: "100%",
  borderRadius: 18,
  objectFit: "cover",
  border: "1px solid #EED8CB",
};
const audioPreviewWebStyle = {
  width: "100%",
  maxWidth: 260,
};
const videoPreviewWebStyle = {
  width: 220,
  maxWidth: "100%",
  borderRadius: 18,
  border: "1px solid #EED8CB",
  backgroundColor: "#120F0E",
};

function buildTimeStamp() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHour = hours % 12 || 12;

  return `${normalizedHour}:${minutes} ${suffix}`;
}

function toTitleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Could not read media file."));
    };
    reader.onerror = () => reject(new Error("Could not read media file."));
    reader.readAsDataURL(blob);
  });
}

export function ChatScreen() {
  const { user } = useAuth();
  const { connections, messages, setMessages } = useAppData();
  const { profile } = useProfile();
  const { width } = useWindowDimensions();
  const [selectedConnectionId, setSelectedConnectionId] = useState(connections[0]?.id ?? "");
  const [draftMessage, setDraftMessage] = useState("");
  const [draftType, setDraftType] = useState<"Text" | "Photo" | "Voice memo" | "Video message">(
    "Text"
  );
  const [draftMediaUri, setDraftMediaUri] = useState<string | undefined>();
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "processing">(
    "idle"
  );
  const [recordingError, setRecordingError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const recorderChunksRef = useRef<Blob[]>([]);

  const liveMessages = useMemo(
    () => messages.filter((message) => message.connectionId === selectedConnectionId),
    [messages, selectedConnectionId]
  );

  const selectedConnection = connections.find((connection) => connection.id === selectedConnectionId);
  const isWideLayout = width >= 1080;

  useEffect(() => {
    if (!selectedConnectionId && connections[0]?.id) {
      setSelectedConnectionId(connections[0].id);
      return;
    }

    if (
      selectedConnectionId &&
      !connections.some((connection) => connection.id === selectedConnectionId)
    ) {
      setSelectedConnectionId(connections[0]?.id ?? "");
    }
  }, [connections, selectedConnectionId]);

  useEffect(() => {
    setDraftMessage("");
    setDraftMediaUri(undefined);
    setRecordingError("");
    setRecordingState("idle");
  }, [draftType, selectedConnectionId]);

  useEffect(
    () => () => {
      recorderRef.current?.stop?.();
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  const sendMessage = async () => {
    const body = draftMessage.trim();
    const requiresMedia = draftType === "Photo" || draftType === "Voice memo" || draftType === "Video message";

    if (!selectedConnectionId) {
      return;
    }

    if ((!body && !draftMediaUri) || (requiresMedia && !draftMediaUri)) {
      return;
    }

    const shouldSaveShared =
      Boolean(user?.id && hasSupabaseCredentials && isSharedConnection(selectedConnectionId));

    if (shouldSaveShared && user?.id) {
      try {
        const sharedMessage = await saveSharedMessage({
          userId: user.id,
          connectionId: selectedConnectionId,
          type: draftType,
          body,
          mediaUri: draftMediaUri,
        });

        if (sharedMessage) {
          setMessages((current) => [...current, sharedMessage]);
        }
      } catch {
        return;
      }
    } else {
      setMessages((current) => [
        ...current,
        {
          id: `msg-${Date.now()}`,
          connectionId: selectedConnectionId,
          author: "self",
          type: draftType,
          body,
          sentAt: buildTimeStamp(),
          mediaUri: draftMediaUri,
          reactions: [],
        },
      ]);
    }
    setDraftMessage("");
    setDraftMediaUri(undefined);
    setDraftType("Text");
    setRecordingState("idle");
    setRecordingError("");
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages((current) =>
      current.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        const currentReactions = message.reactions ?? [];
        const nextReactions = currentReactions.includes(emoji)
          ? currentReactions.filter((reaction) => reaction !== emoji)
          : [...currentReactions, emoji];

        return {
          ...message,
          reactions: nextReactions,
        };
      })
    );
  };

  const selectPhoto = async () => {
    const nextPhotoUri = await pickImageFromDevice();

    if (nextPhotoUri) {
      setDraftMediaUri(nextPhotoUri);
      setRecordingError("");
    }
  };

  const startRecording = async (kind: "audio" | "video") => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordingError("Recording is only available in a supported browser.");
      return;
    }

    try {
      setRecordingError("");
      setRecordingState("recording");
      recorderChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia(
        kind === "audio"
          ? { audio: true }
          : {
              audio: true,
              video: true,
            }
      );

      recorderStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recorderChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        try {
          setRecordingState("processing");
          const mimeType =
            kind === "audio" ? "audio/webm" : "video/webm";
          const blob = new Blob(recorderChunksRef.current, { type: mimeType });
          const nextMediaUri = await blobToDataUrl(blob);
          setDraftMediaUri(nextMediaUri);
        } catch {
          setRecordingError("We couldn't finish that recording. Try again.");
        } finally {
          recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
          recorderStreamRef.current = null;
          recorderRef.current = null;
          recorderChunksRef.current = [];
          setRecordingState("idle");
        }
      };

      recorder.start();
    } catch {
      recorderStreamRef.current?.getTracks().forEach((track) => track.stop());
      recorderStreamRef.current = null;
      recorderRef.current = null;
      setRecordingState("idle");
      setRecordingError("Recording access was blocked. Check browser permissions and try again.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recordingState === "recording") {
      recorderRef.current.stop();
    }
  };

  const renderDraftMediaTools = () => {
    if (draftType === "Text") {
      return null;
    }

    if (draftType === "Photo") {
      return (
        <View style={styles.mediaToolCardCompact}>
          <Text style={styles.feedMeta}>Choose a photo from your device.</Text>
          <View style={styles.actionRowCompact}>
            <TouchableOpacity style={styles.secondaryAction} onPress={() => void selectPhoto()}>
              <Text style={styles.secondaryActionText}>
                {draftMediaUri ? "Replace photo" : "Upload photo"}
              </Text>
            </TouchableOpacity>
            {draftMediaUri ? (
              <TouchableOpacity style={styles.clearButton} onPress={() => setDraftMediaUri(undefined)}>
                <Text style={styles.clearButtonText}>Remove</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.mediaToolCardCompact}>
        <Text style={styles.feedMeta}>
          {draftType === "Voice memo"
            ? "Record a short voice memo right in the browser."
            : "Record a video message right in the browser."}
        </Text>
        <View style={styles.actionRowCompact}>
          {recordingState !== "recording" ? (
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => void startRecording(draftType === "Voice memo" ? "audio" : "video")}
            >
              <Text style={styles.secondaryActionText}>
                {draftMediaUri ? "Record again" : draftType === "Voice memo" ? "Record voice" : "Record video"}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.primaryButton} onPress={stopRecording}>
              <Text style={styles.primaryButtonText}>Stop recording</Text>
            </TouchableOpacity>
          )}
          {draftMediaUri ? (
            <TouchableOpacity style={styles.clearButton} onPress={() => setDraftMediaUri(undefined)}>
              <Text style={styles.clearButtonText}>Remove</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {recordingState === "processing" ? (
          <Text style={styles.helperMeta}>Saving your recording...</Text>
        ) : null}
        {recordingError ? <Text style={styles.errorText}>{recordingError}</Text> : null}
      </View>
    );
  };

  const renderMessageMedia = (message: (typeof messages)[number]) => {
    if (!message.mediaUri) {
      return null;
    }

    if (message.type === "Photo") {
      return <img src={message.mediaUri} alt={message.body || "shared photo"} style={photoPreviewWebStyle as any} />;
    }

    if (message.type === "Voice memo") {
      return <audio controls src={message.mediaUri} style={audioPreviewWebStyle as any} />;
    }

    if (message.type === "Video message") {
      return <video controls src={message.mediaUri} style={videoPreviewWebStyle as any} />;
    }

    return null;
  };

  const renderDraftPreview = () => {
    if (!draftMediaUri) {
      return null;
    }

    if (draftType === "Photo") {
      return <img src={draftMediaUri} alt="draft upload" style={photoPreviewWebStyle as any} />;
    }

    if (draftType === "Voice memo") {
      return <audio controls src={draftMediaUri} style={audioPreviewWebStyle as any} />;
    }

    if (draftType === "Video message") {
      return <video controls src={draftMediaUri} style={videoPreviewWebStyle as any} />;
    }

    return null;
  };

  return (
    <ScreenSurface>
      <SectionCard
        title="Messages"
        subtitle="Text, photos, voice notes, and video messages in one asynchronous thread"
      >
        {connections.length ? (
          <>
            <View style={[styles.chatShell, isWideLayout && styles.chatShellWide]}>
              <View style={[styles.selectorPane, isWideLayout && styles.selectorPaneWide]}>
                <View style={styles.controlGroup}>
                  <Text style={styles.controlLabel}>Choose a conversation</Text>
                  <View style={styles.conversationGrid}>
                    {connections.map((connection) => (
                      <TouchableOpacity
                        key={connection.id}
                        style={[
                          styles.conversationCard,
                          selectedConnectionId === connection.id && styles.conversationCardActive,
                        ]}
                        onPress={() => setSelectedConnectionId(connection.id)}
                        activeOpacity={0.9}
                      >
                        {connection.photoUri ? (
                          <Image
                            source={{ uri: connection.photoUri }}
                            style={styles.conversationAvatarImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={styles.conversationAvatarFallback}>
                            <Text style={styles.conversationAvatarInitial}>
                              {connection.name[0]}
                            </Text>
                          </View>
                        )}
                        <View style={styles.conversationCardCopy}>
                          <Text style={styles.conversationCardTitle}>{connection.name}</Text>
                          <Text style={styles.conversationCardMeta}>
                            {toTitleCase(connection.relationshipType)} | {connection.location}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              <View style={[styles.threadPane, isWideLayout && styles.threadPaneWide]}>
                {selectedConnection ? (
                  <View style={styles.threadHeader}>
                    <Text style={styles.feedTitle}>{selectedConnection.name}</Text>
                    <Text style={styles.feedMeta}>
                      {toTitleCase(selectedConnection.relationshipType)} | {selectedConnection.location}
                    </Text>
                  </View>
                ) : null}

                <View style={[styles.threadStream, isWideLayout && styles.threadStreamWide]}>
                  {liveMessages.length ? (
                    liveMessages.map((message) => (
                      <View
                        key={message.id}
                        style={[
                          styles.messageBubble,
                          message.author === "self" ? styles.messageBubbleSelf : styles.messageBubbleOther,
                        ]}
                      >
                        <Text style={styles.messageMeta}>
                          {message.author === "self"
                            ? "You"
                            : selectedConnection?.name || "Your person"}{" "}
                          | {message.type}
                        </Text>
                        {renderMessageMedia(message)}
                        {message.body ? <Text style={styles.messageBody}>{message.body}</Text> : null}
                        <Text style={styles.messageTime}>{message.sentAt}</Text>
                        <View style={styles.reactionRow}>
                          {(message.reactions ?? []).map((reaction) => (
                            <View key={`${message.id}-${reaction}`} style={styles.reactionChip}>
                              <Text style={styles.reactionChipText}>{reaction}</Text>
                            </View>
                          ))}
                        </View>
                        <View style={styles.reactionPicker}>
                          {reactionOptions.map((reaction) => (
                            <TouchableOpacity
                              key={`${message.id}-picker-${reaction}`}
                              style={[
                                styles.reactionOption,
                                (message.reactions ?? []).includes(reaction) && styles.reactionOptionActive,
                              ]}
                              onPress={() => addReaction(message.id, reaction)}
                            >
                              <Text style={styles.reactionOptionText}>{reaction}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View
                          style={[
                            styles.messageTail,
                            message.author === "self" ? styles.messageTailSelf : styles.messageTailOther,
                          ]}
                        />
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyCard}>
                      <Text style={styles.messageBody}>
                        Nothing in this thread yet with {selectedConnection?.name || "this person"}. The first message can be simple.
                      </Text>
                    </View>
                  )}
                </View>

                <View style={[styles.composerCard, isWideLayout && styles.composerCardWide]}>
                  <View style={[styles.composerTopRow, isWideLayout && styles.composerTopRowWide]}>
                    <Text style={styles.composerHeading}>Send a message</Text>
                    {selectedConnection ? (
                      <Text style={styles.composerAudienceMeta}>to {selectedConnection.name}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.chipWrap, isWideLayout && styles.chipWrapWide]}>
                    {(["Text", "Photo", "Voice memo", "Video message"] as const).map((type) => (
                      <FilterChip
                        key={type}
                        label={type}
                        active={draftType === type}
                        onPress={() => setDraftType(type)}
                      />
                    ))}
                  </View>
                  {renderDraftMediaTools()}
                  {renderDraftPreview()}
                  <TextInput
                    value={draftMessage}
                    onChangeText={setDraftMessage}
                    placeholder={
                      draftType === "Text"
                        ? "Type your message"
                        : `Add a note for this ${draftType.toLowerCase()}`
                    }
                    placeholderTextColor="#A08F89"
                    style={[styles.textInput, styles.detailInput, isWideLayout && styles.detailInputCompact]}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.primaryButton, isWideLayout && styles.primaryButtonCompact]}
                    onPress={() => void sendMessage()}
                  >
                    <Text style={styles.primaryButtonText}>
                      Send to {selectedConnection?.name || "your person"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.messageBody}>
              New accounts start quietly. Add someone in `People`, and the first thread can begin here.
            </Text>
          </View>
        )}
      </SectionCard>

    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  chatShell: {
    gap: 18,
  },
  chatShellWide: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  selectorPane: {
    gap: 12,
  },
  selectorPaneWide: {
    width: 330,
    flexShrink: 0,
    position: "sticky" as any,
    top: 24 as any,
  },
  threadPane: {
    gap: 16,
  },
  threadPaneWide: {
    flex: 1,
    minWidth: 0,
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
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipWrapWide: {
    gap: 6,
  },
  conversationGrid: {
    gap: 10,
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFF8F2",
    padding: 12,
  },
  conversationCardActive: {
    backgroundColor: "#FFF1E7",
    borderColor: "#E9B8A9",
  },
  conversationAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EED8CB",
    backgroundColor: "#F4E6DF",
  },
  conversationAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF1E7",
    borderWidth: 1,
    borderColor: "#EED8CB",
  },
  conversationAvatarInitial: {
    color: palette.berry,
    fontSize: 18,
    fontFamily: typography.displayFamily,
    fontWeight: "800",
  },
  conversationCardCopy: {
    flex: 1,
    gap: 2,
  },
  conversationCardTitle: {
    color: palette.text,
    fontSize: 17,
    fontFamily: typography.displayFamily,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  conversationCardMeta: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: typography.sansFamily,
  },
  threadHeader: {
    gap: 4,
    paddingBottom: 4,
  },
  threadStream: {
    gap: 12,
  },
  threadStreamWide: {
    paddingBottom: 18,
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
  helperMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    fontFamily: typography.sansFamily,
  },
  errorText: {
    color: "#B5544B",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    fontFamily: typography.sansFamily,
  },
  messageBubble: {
    position: "relative",
    borderRadius: 22,
    padding: 16,
    maxWidth: "90%",
    gap: 8,
  },
  messageBubbleSelf: {
    backgroundColor: "#FFE2D9",
    alignSelf: "flex-end",
    borderBottomRightRadius: 12,
  },
  messageBubbleOther: {
    backgroundColor: "#F5EFEA",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 12,
  },
  messageTail: {
    position: "absolute",
    bottom: 10,
    width: 18,
    height: 18,
    transform: [{ rotate: "45deg" }],
    borderRadius: 4,
  },
  messageTailSelf: {
    right: -6,
    backgroundColor: "#FFE2D9",
  },
  messageTailOther: {
    left: -6,
    backgroundColor: "#F5EFEA",
  },
  messageMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    fontFamily: typography.sansFamilyMedium,
  },
  messageBody: {
    color: palette.text,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: typography.sansFamily,
  },
  messageTime: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: typography.sansFamily,
  },
  reactionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reactionChip: {
    borderRadius: 999,
    backgroundColor: "#FFF7F2",
    borderWidth: 1,
    borderColor: "#EED8CB",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reactionChipText: {
    fontSize: 14,
  },
  reactionPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reactionOption: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4D1C8",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reactionOptionActive: {
    backgroundColor: "#FFF1E7",
    borderColor: "#E9B8A9",
  },
  reactionOptionText: {
    fontSize: 14,
  },
  composerCard: {
    gap: 12,
    borderRadius: 22,
    backgroundColor: "#FFF8F2",
    borderWidth: 1,
    borderColor: palette.line,
    padding: 16,
  },
  composerCardWide: {
    gap: 8,
    padding: 10,
    position: "sticky" as any,
    bottom: 16 as any,
    zIndex: 5,
  },
  composerTopRow: {
    gap: 4,
  },
  composerTopRowWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  composerHeading: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  composerAudienceMeta: {
    color: palette.muted,
    fontSize: 12,
    fontFamily: typography.sansFamily,
  },
  mediaToolCard: {
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEDDD1",
    backgroundColor: "#FFFCF8",
    padding: 12,
  },
  mediaToolCardCompact: {
    gap: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEDDD1",
    backgroundColor: "#FFFCF8",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  actionRowCompact: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
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
  detailInput: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  detailInputCompact: {
    minHeight: 52,
    paddingVertical: 10,
  },
  primaryButton: {
    borderRadius: 18,
    backgroundColor: palette.text,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryButtonCompact: {
    paddingVertical: 10,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#FFFCFA",
  },
  secondaryActionText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  clearButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E4D1C8",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#FFF6EF",
  },
  clearButtonText: {
    color: palette.berry,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  emptyCard: {
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#F5EFEA",
    borderWidth: 1,
    borderColor: palette.line,
  },
});
