import {
  CalendarEvent,
  CheckInPrompt,
  JournalEntry,
  Message,
  MoodUpdate,
  TimeCapsule,
} from "../types";
import { supabase } from "./supabase";
import { buildSharedConnectionId, parseSharedConnectionId } from "./sharedRelationships";
import {
  displayDateToInputValue,
  inputValueToDisplayDate,
  parseDateValue,
} from "./dateHelpers";

function formatTime(dateValue: string) {
  const date = new Date(dateValue);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHour = hours % 12 || 12;
  return `${normalizedHour}:${minutes} ${suffix}`;
}

async function fetchRelationshipPeers(userId: string) {
  const { data, error } = await supabase
    .from("relationship_members")
    .select("relationship_id, profile_id")
    .in(
      "relationship_id",
      (
        await supabase
          .from("relationship_members")
          .select("relationship_id")
          .eq("profile_id", userId)
      ).data?.map((row) => row.relationship_id) ?? []
    );

  if (error) {
    throw error;
  }

  const peerByRelationshipId = new Map<string, string>();

  (data ?? []).forEach((member) => {
    if (member.profile_id !== userId) {
      peerByRelationshipId.set(member.relationship_id, member.profile_id);
    }
  });

  return peerByRelationshipId;
}

async function ensureConversationForRelationship(relationshipId: string) {
  const { data: existing, error: fetchError } = await supabase
    .from("conversations")
    .select("id")
    .eq("relationship_id", relationshipId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: created, error: insertError } = await supabase
    .from("conversations")
    .insert({ relationship_id: relationshipId })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  return created.id;
}

export async function fetchSharedMessages(userId: string): Promise<Message[]> {
  const peerByRelationshipId = await fetchRelationshipPeers(userId);
  const relationshipIds = Array.from(peerByRelationshipId.keys());

  if (!relationshipIds.length) {
    return [];
  }

  const { data: conversations, error: conversationError } = await supabase
    .from("conversations")
    .select("id, relationship_id")
    .in("relationship_id", relationshipIds);

  if (conversationError) {
    throw conversationError;
  }

  if (!conversations?.length) {
    return [];
  }

  const relationshipByConversationId = new Map<string, string>(
    conversations.map((conversation) => [conversation.id, conversation.relationship_id])
  );

  const { data: messages, error: messageError } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, message_type, body, media_url, created_at")
    .in("conversation_id", conversations.map((conversation) => conversation.id))
    .order("created_at", { ascending: true });

  if (messageError) {
    throw messageError;
  }

  return (messages ?? []).flatMap((message) => {
    const relationshipId = relationshipByConversationId.get(message.conversation_id);
    const peerId = relationshipId ? peerByRelationshipId.get(relationshipId) : null;

    if (!relationshipId || !peerId) {
      return [];
    }

    return [
      {
        id: `remote-message-${message.id}`,
        connectionId: buildSharedConnectionId(relationshipId, peerId),
        author: message.sender_id === userId ? "self" : "connection",
        type:
          message.message_type === "voice_memo"
            ? "Voice memo"
            : message.message_type === "video_message"
              ? "Video message"
              : message.message_type === "photo"
                ? "Photo"
                : "Text",
        body: message.body || "",
        sentAt: formatTime(message.created_at),
        mediaUri: message.media_url || undefined,
        reactions: [],
      } satisfies Message,
    ];
  });
}

export async function saveSharedMessage(input: {
  userId: string;
  connectionId: string;
  type: Message["type"];
  body: string;
  mediaUri?: string;
}) {
  const parsed = parseSharedConnectionId(input.connectionId);

  if (!parsed) {
    return null;
  }

  const conversationId = await ensureConversationForRelationship(parsed.relationshipId);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: input.userId,
      message_type:
        input.type === "Voice memo"
          ? "voice_memo"
          : input.type === "Video message"
            ? "video_message"
            : input.type === "Photo"
              ? "photo"
              : "text",
      body: input.body || null,
      media_url: input.mediaUri || null,
    })
    .select("id, created_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: `remote-message-${data.id}`,
    connectionId: input.connectionId,
    author: "self",
    type: input.type,
    body: input.body,
    sentAt: formatTime(data.created_at),
    mediaUri: input.mediaUri,
    reactions: [],
  } satisfies Message;
}

export async function fetchSharedJournalEntries(userId: string): Promise<JournalEntry[]> {
  const peerByRelationshipId = await fetchRelationshipPeers(userId);
  const relationshipIds = Array.from(peerByRelationshipId.keys());

  if (!relationshipIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("journal_entries")
    .select("id, relationship_id, title, body, cover_image_url, created_at")
    .in("relationship_id", relationshipIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((entry) => {
    const peerId = peerByRelationshipId.get(entry.relationship_id);
    if (!peerId) {
      return [];
    }

    return [
      {
        id: `remote-journal-${entry.id}`,
        date: inputValueToDisplayDate(entry.created_at.slice(0, 10)),
        title: entry.title,
        body: entry.body,
        photos: entry.cover_image_url
          ? [{ id: `remote-journal-photo-${entry.id}`, label: "Shared photo", uri: entry.cover_image_url }]
          : [],
        participantIds: [buildSharedConnectionId(entry.relationship_id, peerId)],
      } satisfies JournalEntry,
    ];
  });
}

export async function saveSharedJournalEntry(input: {
  userId: string;
  entry: JournalEntry;
}) {
  const sharedParticipantId =
    (input.entry.participantIds ?? []).find((id) => parseSharedConnectionId(id)) ?? null;
  if (!sharedParticipantId) {
    return null;
  }
  const parsed = sharedParticipantId ? parseSharedConnectionId(sharedParticipantId) : null;

  if (!parsed) {
    return null;
  }

  const remoteId = input.entry.id.startsWith("remote-journal-")
    ? input.entry.id.replace("remote-journal-", "")
    : null;

  const payload = {
    relationship_id: parsed.relationshipId,
    author_id: input.userId,
    title: input.entry.title,
    body: input.entry.body,
    cover_image_url: input.entry.photos[0]?.uri || null,
  };

  const query = remoteId
    ? supabase.from("journal_entries").update(payload).eq("id", remoteId).select("id, relationship_id, title, body, cover_image_url, created_at").single()
    : supabase.from("journal_entries").insert(payload).select("id, relationship_id, title, body, cover_image_url, created_at").single();

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return {
    id: `remote-journal-${data.id}`,
    date: input.entry.date,
    title: data.title,
    body: data.body,
    photos: data.cover_image_url
      ? [{ id: `remote-journal-photo-${data.id}`, label: "Shared photo", uri: data.cover_image_url }]
      : [],
    participantIds: [sharedParticipantId],
  } satisfies JournalEntry;
}

export async function deleteSharedJournalEntry(entryId: string) {
  const remoteId = entryId.replace("remote-journal-", "");
  const { error } = await supabase.from("journal_entries").delete().eq("id", remoteId);
  if (error) throw error;
}

export async function fetchSharedTimeCapsules(userId: string): Promise<TimeCapsule[]> {
  const peerByRelationshipId = await fetchRelationshipPeers(userId);
  const relationshipIds = Array.from(peerByRelationshipId.keys());
  if (!relationshipIds.length) return [];

  const { data, error } = await supabase
    .from("time_capsules")
    .select("id, relationship_id, title, body, unlock_at, created_at")
    .in("relationship_id", relationshipIds)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).flatMap((capsule) => {
    const peerId = peerByRelationshipId.get(capsule.relationship_id);
    if (!peerId) return [];
    return [{
      id: `remote-capsule-${capsule.id}`,
      title: capsule.title,
      from: "Shared space",
      body: capsule.body || "",
      unlockMode: capsule.unlock_at ? "date" : "anytime",
      unlockDate: capsule.unlock_at ? inputValueToDisplayDate(capsule.unlock_at.slice(0, 10)) : "Open anytime",
      participantIds: [buildSharedConnectionId(capsule.relationship_id, peerId)],
    } satisfies TimeCapsule];
  });
}

export async function saveSharedTimeCapsule(input: {
  userId: string;
  capsule: TimeCapsule;
}) {
  const sharedParticipantId = (input.capsule.participantIds ?? []).find((id) => parseSharedConnectionId(id));
  const parsed = sharedParticipantId ? parseSharedConnectionId(sharedParticipantId) : null;
  if (!parsed) return null;

  const remoteId = input.capsule.id.startsWith("remote-capsule-")
    ? input.capsule.id.replace("remote-capsule-", "")
    : null;

  const payload = {
    relationship_id: parsed.relationshipId,
    author_id: input.userId,
    title: input.capsule.title,
    body: input.capsule.body,
    unlock_at:
      input.capsule.unlockMode === "date"
        ? parseDateValue(displayDateToInputValue(input.capsule.unlockDate))?.toISOString() ?? null
        : null,
  };

  const query = remoteId
    ? supabase.from("time_capsules").update(payload).eq("id", remoteId).select("id").single()
    : supabase.from("time_capsules").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) throw error;

  return { ...input.capsule, id: `remote-capsule-${data.id}` } satisfies TimeCapsule;
}

export async function deleteSharedTimeCapsule(capsuleId: string) {
  const remoteId = capsuleId.replace("remote-capsule-", "");
  const { error } = await supabase.from("time_capsules").delete().eq("id", remoteId);
  if (error) throw error;
}

export async function fetchSharedCalendarEvents(userId: string): Promise<CalendarEvent[]> {
  const peerByRelationshipId = await fetchRelationshipPeers(userId);
  const relationshipIds = Array.from(peerByRelationshipId.keys());
  if (!relationshipIds.length) return [];

  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, relationship_id, title, details, starts_at")
    .in("relationship_id", relationshipIds)
    .order("starts_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).flatMap((event) => {
    const peerId = peerByRelationshipId.get(event.relationship_id);
    if (!peerId) return [];
    const dateValue = event.starts_at.slice(0, 10);
    const parsedDate = parseDateValue(dateValue);
    if (!parsedDate) return [];
    return [{
      id: `remote-event-${event.id}`,
      month: parsedDate.toLocaleString("en-US", { month: "short" }).toUpperCase(),
      day: String(parsedDate.getDate()),
      title: event.title,
      detail: event.details || "",
      dateValue,
      participantIds: [buildSharedConnectionId(event.relationship_id, peerId)],
    } satisfies CalendarEvent];
  });
}

export async function saveSharedCalendarEvent(input: {
  userId: string;
  event: CalendarEvent;
}) {
  const sharedParticipantId = (input.event.participantIds ?? []).find((id) => parseSharedConnectionId(id));
  const parsed = sharedParticipantId ? parseSharedConnectionId(sharedParticipantId) : null;
  if (!parsed || !input.event.dateValue) return null;

  const remoteId = input.event.id.startsWith("remote-event-")
    ? input.event.id.replace("remote-event-", "")
    : null;
  const startsAt = parseDateValue(input.event.dateValue)?.toISOString();
  if (!startsAt) return null;

  const payload = {
    relationship_id: parsed.relationshipId,
    created_by: input.userId,
    title: input.event.title,
    details: input.event.detail,
    starts_at: startsAt,
  };

  const query = remoteId
    ? supabase.from("calendar_events").update(payload).eq("id", remoteId).select("id").single()
    : supabase.from("calendar_events").insert(payload).select("id").single();
  const { data, error } = await query;
  if (error) throw error;

  return { ...input.event, id: `remote-event-${data.id}` } satisfies CalendarEvent;
}

export async function deleteSharedCalendarEvent(eventId: string) {
  const remoteId = eventId.replace("remote-event-", "");
  const { error } = await supabase.from("calendar_events").delete().eq("id", remoteId);
  if (error) throw error;
}

export async function fetchSharedCheckInPrompts(userId: string): Promise<CheckInPrompt[]> {
  const peerByRelationshipId = await fetchRelationshipPeers(userId);
  const relationshipIds = Array.from(peerByRelationshipId.keys());

  if (!relationshipIds.length) {
    return [];
  }

  const [{ data: prompts, error: promptError }, { data: responses, error: responseError }] =
    await Promise.all([
      supabase
        .from("checkin_prompts")
        .select("id, relationship_id, prompt_text, created_by, created_at")
        .in("relationship_id", relationshipIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("checkin_responses")
        .select("id, prompt_id, author_id, response_text, created_at")
        .order("created_at", { ascending: false }),
    ]);

  if (promptError) {
    throw promptError;
  }

  if (responseError) {
    throw responseError;
  }

  const latestResponseByPromptId = new Map<string, { authorId: string; text: string }>();
  (responses ?? []).forEach((response) => {
    if (!latestResponseByPromptId.has(response.prompt_id)) {
      latestResponseByPromptId.set(response.prompt_id, {
        authorId: response.author_id,
        text: response.response_text || "",
      });
    }
  });

  return (prompts ?? []).flatMap((prompt) => {
    const peerId = peerByRelationshipId.get(prompt.relationship_id);
    if (!peerId) {
      return [];
    }

    const reply = latestResponseByPromptId.get(prompt.id);

    return [
      {
        id: `remote-prompt-${prompt.id}`,
        connectionId: buildSharedConnectionId(prompt.relationship_id, peerId),
        promptText: prompt.prompt_text,
        sentAt: formatTime(prompt.created_at),
        direction: prompt.created_by === userId ? "outgoing" : "incoming",
        replyText: reply?.authorId === userId ? reply.text : undefined,
      } satisfies CheckInPrompt,
    ];
  });
}

export async function saveSharedCheckInPrompt(input: {
  userId: string;
  connectionIds: string[];
  promptText: string;
}) {
  const sharedConnections = input.connectionIds
    .map((connectionId) => ({
      connectionId,
      parsed: parseSharedConnectionId(connectionId),
    }))
    .filter(
      (
        item
      ): item is { connectionId: string; parsed: NonNullable<ReturnType<typeof parseSharedConnectionId>> } =>
        Boolean(item.parsed)
    );

  if (!sharedConnections.length) {
    return [];
  }

  const payload = sharedConnections.map((item) => ({
    relationship_id: item.parsed.relationshipId,
    prompt_text: input.promptText,
    created_by: input.userId,
  }));

  const { data, error } = await supabase
    .from("checkin_prompts")
    .insert(payload)
    .select("id, relationship_id, prompt_text, created_at");

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((prompt) => {
    const matchingConnection = sharedConnections.find(
      (item) => item.parsed.relationshipId === prompt.relationship_id
    );
    if (!matchingConnection) {
      return [];
    }

    return [
      {
        id: `remote-prompt-${prompt.id}`,
        connectionId: matchingConnection.connectionId,
        promptText: prompt.prompt_text,
        sentAt: formatTime(prompt.created_at),
        direction: "outgoing",
      } satisfies CheckInPrompt,
    ];
  });
}

export async function saveSharedCheckInReply(input: {
  userId: string;
  promptId: string;
  replyText: string;
}) {
  const remotePromptId = input.promptId.replace("remote-prompt-", "");
  const { data, error } = await supabase
    .from("checkin_responses")
    .insert({
      prompt_id: remotePromptId,
      author_id: input.userId,
      response_text: input.replyText,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export async function fetchSharedMoodUpdates(userId: string): Promise<MoodUpdate[]> {
  const peerByRelationshipId = await fetchRelationshipPeers(userId);
  const relationshipIds = Array.from(peerByRelationshipId.keys());

  if (!relationshipIds.length) {
    return [];
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", Array.from(new Set(peerByRelationshipId.values())));

  if (profileError) {
    throw profileError;
  }

  const peerNameById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.full_name || "Your person"])
  );

  const { data, error } = await supabase
    .from("mood_updates")
    .select("id, relationship_id, author_id, mood, energy, health, note, created_at")
    .in("relationship_id", relationshipIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const latestByRelationshipId = new Map<string, (typeof data)[number]>();
  (data ?? []).forEach((item) => {
    if (item.author_id !== userId && !latestByRelationshipId.has(item.relationship_id)) {
      latestByRelationshipId.set(item.relationship_id, item);
    }
  });

  return Array.from(latestByRelationshipId.values()).flatMap((item) => {
    const peerId = peerByRelationshipId.get(item.relationship_id);
    if (!peerId) {
      return [];
    }

    return [
      {
        id: `remote-mood-${item.id}`,
        connectionId: buildSharedConnectionId(item.relationship_id, peerId),
        name: peerNameById.get(peerId) || "Your person",
        mood: item.mood,
        energy: item.energy || "",
        health: item.health || "",
        note: item.note || "",
        updatedAt: formatTime(item.created_at),
        color: "#FFD8DE",
      } satisfies MoodUpdate,
    ];
  });
}

export async function saveSharedMoodUpdate(input: {
  userId: string;
  connectionIds: string[];
  mood: string;
  energy: string;
  health: string;
  note?: string;
}) {
  const sharedConnections = input.connectionIds
    .map((connectionId) => ({
      connectionId,
      parsed: parseSharedConnectionId(connectionId),
    }))
    .filter(
      (
        item
      ): item is { connectionId: string; parsed: NonNullable<ReturnType<typeof parseSharedConnectionId>> } =>
        Boolean(item.parsed)
    );

  if (!sharedConnections.length) {
    return [];
  }

  const payload = sharedConnections.map((item) => ({
    relationship_id: item.parsed.relationshipId,
    author_id: input.userId,
    mood: input.mood,
    energy: input.energy,
    health: input.health,
    note: input.note || null,
  }));

  const { data, error } = await supabase
    .from("mood_updates")
    .insert(payload)
    .select("id, relationship_id, created_at");

  if (error) {
    throw error;
  }

  return (data ?? []).flatMap((item) => {
    const matchingConnection = sharedConnections.find(
      (connection) => connection.parsed.relationshipId === item.relationship_id
    );

    if (!matchingConnection) {
      return [];
    }

    return [
      {
        id: `remote-mood-${item.id}`,
        connectionId: matchingConnection.connectionId,
        name: "You",
        mood: input.mood,
        energy: input.energy,
        health: input.health,
        note: input.note || "",
        updatedAt: formatTime(item.created_at),
        color: "#FFD8DE",
      } satisfies MoodUpdate,
    ];
  });
}
