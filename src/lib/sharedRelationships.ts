import { supabase } from "./supabase";
import { Connection, RelationshipInvite, RelationshipType } from "../types";

export function buildSharedConnectionId(relationshipId: string, profileId: string) {
  return `shared-${relationshipId}-${profileId}`;
}

export function parseSharedConnectionId(connectionId: string) {
  if (!connectionId.startsWith("shared-")) {
    return null;
  }

  const [, relationshipId, ...profileIdParts] = connectionId.split("-");
  const profileId = profileIdParts.join("-");

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
  return connectionId.startsWith("shared-");
}

export async function fetchSharedConnections(userId: string): Promise<Connection[]> {
  const { data: memberships, error: membershipError } = await supabase
    .from("relationship_members")
    .select("relationship_id")
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

  const { data: relationships, error: relationshipError } = await supabase
    .from("relationships")
    .select("id, relationship_type")
    .in("id", relationshipIds);

  if (relationshipError) {
    throw relationshipError;
  }

  const relationshipTypeById = new Map<string, RelationshipType>(
    (relationships ?? []).map((relationship) => [
      relationship.id,
      relationship.relationship_type as RelationshipType,
    ])
  );

  const { data: members, error: memberError } = await supabase
    .from("relationship_members")
    .select(
      "relationship_id, profile_id, profile:profiles!relationship_members_profile_id_fkey(id, full_name, location, timezone, note, photo_uri, avatar_url)"
    )
    .in("relationship_id", relationshipIds);

  if (memberError) {
    throw memberError;
  }

  return (members ?? [])
    .filter((member) => member.profile_id !== userId)
    .map((member) => {
      const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile;
      const relationshipType = relationshipTypeById.get(member.relationship_id) ?? "friend";

      return {
        id: buildSharedConnectionId(member.relationship_id, member.profile_id),
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
      } satisfies Connection;
    });
}

export async function fetchIncomingInvites(userEmail: string): Promise<RelationshipInvite[]> {
  const { data, error } = await supabase
    .from("relationship_invites")
    .select(
      "id, sender_id, recipient_email, recipient_name, relationship_type, note, status, created_at, sender:profiles!relationship_invites_sender_id_fkey(full_name)"
    )
    .eq("recipient_email", userEmail.trim().toLowerCase())
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((invite) => ({
    id: invite.id,
    senderId: invite.sender_id,
    senderName:
      (
        Array.isArray(invite.sender)
          ? (invite.sender[0] as { full_name?: string } | undefined)?.full_name
          : (invite.sender as { full_name?: string } | null | undefined)?.full_name
      ) ||
      "Someone",
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

  return (data ?? []).map((invite) => ({
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
  const { error } = await supabase.from("relationship_invites").insert({
    sender_id: input.senderId,
    recipient_email: input.recipientEmail.trim().toLowerCase(),
    recipient_name: input.recipientName.trim() || null,
    relationship_type: input.relationshipType,
    note: input.note.trim() || null,
  });

  if (error) {
    throw error;
  }
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
