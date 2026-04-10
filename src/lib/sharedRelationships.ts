import { supabase } from "./supabase";
import { Connection, RelationshipInvite, RelationshipType } from "../types";

export function buildSharedConnectionId(relationshipId: string, profileId: string) {
  return `shared::${relationshipId}::${profileId}`;
}

export function parseSharedConnectionId(connectionId: string) {
  if (connectionId.startsWith("shared::")) {
    const [, relationshipId, profileId] = connectionId.split("::");

    if (!relationshipId || !profileId) {
      return null;
    }

    return { relationshipId, profileId };
  }

  if (!connectionId.startsWith("shared-")) {
    return null;
  }

  const legacyPayload = connectionId.slice("shared-".length);
  const relationshipId = legacyPayload.slice(0, 36);
  const profileId = legacyPayload.slice(37);

  if (!relationshipId || !profileId) {
    return null;
  }

  return { relationshipId, profileId };
}

function accentForRelationship(relationshipType: RelationshipType) {
  if (relationshipType === "partner") {
    return "#FFD4D8";
  }

  if (relationshipType === "friend") {
    return "#DFF3FF";
  }

  return "#FFF1E7";
}

export function isSharedConnection(connectionId: string) {
  return connectionId.startsWith("shared::") || connectionId.startsWith("shared-");
}

export async function fetchSharedConnections(userId: string): Promise<Connection[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("relationship_members")
    .select("relationship_id, profile_id")
    .eq("profile_id", userId);

  if (membershipError) {
    throw membershipError;
  }

  const relationshipIds = Array.from(
    new Set((memberships ?? []).map((membership) => membership.relationship_id).filter(Boolean))
  );

  if (!relationshipIds.length) {
    return [];
  }

  const { data: members, error: memberError } = await supabase
    .from("relationship_members")
    .select("relationship_id, profile_id")
    .in("relationship_id", relationshipIds);

  if (memberError) {
    throw memberError;
  }

  const { data: relationships, error: relationshipError } = await supabase
    .from("relationships")
    .select("id, relationship_type, created_at")
    .in("id", relationshipIds);

  if (relationshipError) {
    throw relationshipError;
  }

  const relationshipMetaById = new Map<
    string,
    { relationshipType: RelationshipType; createdAt: string | null }
  >(
    (relationships ?? []).map((relationship) => [
      relationship.id,
      {
        relationshipType: relationship.relationship_type as RelationshipType,
        createdAt: relationship.created_at ?? null,
      },
    ])
  );

  const peerMembers = (members ?? []).filter((member) => member.profile_id !== userId);
  const preferredMemberByPeerId = new Map<
    string,
    { relationshipId: string; relationshipType: RelationshipType }
  >();

  peerMembers.forEach((member) => {
    const peerId = member.profile_id;
    const relationshipMeta = relationshipMetaById.get(member.relationship_id);
    const relationshipType = relationshipMeta?.relationshipType ?? "friend";

    if (!peerId) {
      return;
    }

    const existing = preferredMemberByPeerId.get(peerId);
    if (!existing) {
      preferredMemberByPeerId.set(peerId, {
        relationshipId: member.relationship_id,
        relationshipType,
      });
      return;
    }

    const existingCreatedAt =
      relationshipMetaById.get(existing.relationshipId)?.createdAt ?? "";
    const nextCreatedAt = relationshipMeta?.createdAt ?? "";

    if (nextCreatedAt > existingCreatedAt) {
      preferredMemberByPeerId.set(peerId, {
        relationshipId: member.relationship_id,
        relationshipType,
      });
    }
  });

  const peerIds = Array.from(preferredMemberByPeerId.keys());

  if (!peerIds.length) {
    return [];
  }

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, location, timezone, note, photo_uri, avatar_url")
    .in("id", peerIds);

  if (profileError) {
    throw profileError;
  }

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  const connections: Connection[] = [];

  peerIds.forEach((peerId) => {
      const profile = profileById.get(peerId);
      const preferredMember = preferredMemberByPeerId.get(peerId);
      const relationshipId = preferredMember?.relationshipId;
      const relationshipType = preferredMember?.relationshipType ?? "friend";

      if (!relationshipId) {
        return;
      }

      connections.push({
        id: buildSharedConnectionId(relationshipId, peerId),
        name: profile?.full_name || "Shared connection",
        relationshipType,
        location: profile?.location || "Shared space",
        note: profile?.note || `Shared ${relationshipType} space is active.`,
        timezone: profile?.timezone || "",
        photoLabel: "Shared profile",
        accent: accentForRelationship(relationshipType),
        linkedSocials: [],
        accountStatus: "Shared space active",
        photoUri: profile?.photo_uri || profile?.avatar_url || undefined,
      } satisfies Connection);
    });

  return connections;
}

export async function fetchIncomingInvites(userEmail: string): Promise<RelationshipInvite[]> {
  const { data, error } = await supabase
    .from("relationship_invites")
    .select(
      "id, sender_id, recipient_email, recipient_name, relationship_type, note, status, created_at"
    )
    .eq("recipient_email", userEmail.trim().toLowerCase())
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const senderIds = Array.from(new Set((data ?? []).map((invite) => invite.sender_id).filter(Boolean)));
  const { data: senderProfiles } = senderIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", senderIds)
    : { data: [] as Array<{ id: string; full_name: string | null }> };
  const senderNameById = new Map(
    (senderProfiles ?? []).map((profile) => [profile.id, profile.full_name || "Someone"])
  );

  const dedupedInvites = new Map<string, (typeof data)[number]>();
  (data ?? []).forEach((invite) => {
    const key = `${invite.sender_id}|${invite.recipient_email.toLowerCase()}|${invite.relationship_type}|${invite.status}`;
    if (!dedupedInvites.has(key)) {
      dedupedInvites.set(key, invite);
    }
  });

  return Array.from(dedupedInvites.values()).map((invite) => ({
    id: invite.id,
    senderId: invite.sender_id,
    senderName: senderNameById.get(invite.sender_id) || "Someone",
    recipientEmail: invite.recipient_email,
    recipientName: invite.recipient_name || "",
    relationshipType: invite.relationship_type as RelationshipType,
    note: invite.note || "",
    status: invite.status as RelationshipInvite["status"],
    createdAt: invite.created_at,
  }));
}

export async function fetchSentInvites(userId: string): Promise<RelationshipInvite[]> {
  const { data, error } = await supabase
    .from("relationship_invites")
    .select("id, sender_id, recipient_email, recipient_name, relationship_type, note, status, created_at")
    .eq("sender_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const dedupedInvites = new Map<string, (typeof data)[number]>();
  (data ?? []).forEach((invite) => {
    const key = `${invite.recipient_email.toLowerCase()}|${invite.relationship_type}|${invite.status}`;
    if (!dedupedInvites.has(key)) {
      dedupedInvites.set(key, invite);
    }
  });

  return Array.from(dedupedInvites.values()).map((invite) => ({
    id: invite.id,
    senderId: invite.sender_id,
    senderName: "You",
    recipientEmail: invite.recipient_email,
    recipientName: invite.recipient_name || "",
    relationshipType: invite.relationship_type as RelationshipType,
    note: invite.note || "",
    status: invite.status as RelationshipInvite["status"],
    createdAt: invite.created_at,
  }));
}

export async function sendRelationshipInvite(input: {
  senderId: string;
  recipientEmail: string;
  recipientName: string;
  relationshipType: RelationshipType;
  note: string;
}) {
  const normalizedEmail = input.recipientEmail.trim().toLowerCase();
  const { data: existingInvite, error: existingInviteError } = await supabase
    .from("relationship_invites")
    .select("id, status")
    .eq("sender_id", input.senderId)
    .eq("recipient_email", normalizedEmail)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingInviteError) {
    throw existingInviteError;
  }

  if (existingInvite?.status === "accepted") {
    return { status: "already_connected" as const };
  }

  if (existingInvite?.status === "pending") {
    return { status: "already_sent" as const };
  }

  const { error } = await supabase.from("relationship_invites").insert({
    sender_id: input.senderId,
    recipient_email: normalizedEmail,
    recipient_name: input.recipientName.trim() || null,
    relationship_type: input.relationshipType,
    note: input.note.trim() || null,
  });

  if (error) {
    throw error;
  }

  return { status: "sent" as const };
}

export async function acceptRelationshipInvite(inviteId: string) {
  const { error } = await supabase.rpc("accept_relationship_invite", {
    invite_id: inviteId,
  });

  if (error) {
    throw error;
  }
}

export async function declineRelationshipInvite(inviteId: string) {
  const { error } = await supabase.rpc("decline_relationship_invite", {
    invite_id: inviteId,
  });

  if (error) {
    throw error;
  }
}
