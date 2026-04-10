import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { FilterChip } from "../../components/ui/FilterChip";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { hasSupabaseCredentials } from "../../config/env";
import { locationDirectory } from "../../data/locationDirectory";
import { pickImageFromDevice } from "../../lib/pickImageFromDevice";
import {
  acceptRelationshipInvite,
  declineRelationshipInvite,
  fetchIncomingInvites,
  fetchSentInvites,
  fetchSharedConnections,
  isSharedConnection,
  sendRelationshipInvite,
} from "../../lib/sharedRelationships";
import { useAuth } from "../../providers/AuthProvider";
import { useAppData } from "../../providers/AppDataProvider";
import { useProfile } from "../../providers/ProfileProvider";
import {
  Connection,
  ConnectionFilter,
  CurrentUserProfile,
  RelationshipInvite,
  SocialPlatform,
} from "../../types";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";

const filters: ConnectionFilter[] = ["all", "partner", "friend", "family"];
const profileNoteOptions = [
  "Building a space for daily check-ins and gentle updates",
  "Using this mostly for memory keeping and trip planning",
  "Keeping partner, friends, and family together in one place",
  "Focusing on rituals, moods, and thoughtful connection",
];
const accountStatusOptions = [
  "Not connected yet",
  "Invite sent",
  "Profile saved",
  "Shared space active",
  "Shared planning in progress",
];
const seanProfileImage = require("../../assets/sean-profile.jpg");
const profileImages: Record<string, any> = {
  "conn-1": seanProfileImage,
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
}

export function ConnectionsScreen() {
  const { isDemoMode, user, userEmail } = useAuth();
  const { connections, setConnections, persistAppDataNow } = useAppData();
  const { profile, saveProfile } = useProfile();
  const [selectedFilter, setSelectedFilter] = useState<ConnectionFilter>(
    isDemoMode ? "partner" : "all"
  );
  const [profileEditorVisible, setProfileEditorVisible] = useState(false);
  const [profileDraftName, setProfileDraftName] = useState(profile.displayName);
  const [profileDraftLocation, setProfileDraftLocation] = useState(profile.location);
  const [profileDraftTimezone, setProfileDraftTimezone] = useState(profile.timezone);
  const [profileDraftRelationshipFocus, setProfileDraftRelationshipFocus] = useState(
    profile.relationshipFocus
  );
  const [profileDraftNote, setProfileDraftNote] = useState(profile.note);
  const [profileDraftLinkedSocials, setProfileDraftLinkedSocials] = useState<
    SocialPlatform[]
  >(profile.linkedSocials);
  const [profileDraftPhotoUri, setProfileDraftPhotoUri] = useState(profile.photoUri ?? "");
  const [openProfileNoteMenu, setOpenProfileNoteMenu] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [editorVisible, setEditorVisible] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftRelationshipType, setDraftRelationshipType] = useState<ConnectionFilter>("partner");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftTimezone, setDraftTimezone] = useState("");
  const [draftPhotoLabel, setDraftPhotoLabel] = useState("");
  const [draftPhotoUri, setDraftPhotoUri] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftLinkedSocials, setDraftLinkedSocials] = useState<SocialPlatform[]>([]);
  const [draftAccountStatus, setDraftAccountStatus] = useState("");
  const [openConnectionNoteMenu, setOpenConnectionNoteMenu] = useState(false);
  const [openAccountStatusMenu, setOpenAccountStatusMenu] = useState(false);
  const [incomingInvites, setIncomingInvites] = useState<RelationshipInvite[]>([]);
  const [sentInvites, setSentInvites] = useState<RelationshipInvite[]>([]);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRelationshipType, setInviteRelationshipType] = useState<ConnectionFilter>("partner");
  const [inviteNote, setInviteNote] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const filteredConnections = useMemo(
    () =>
      connections.filter((connection) =>
        selectedFilter === "all"
          ? true
          : connection.relationshipType === selectedFilter
      ),
    [connections, selectedFilter]
  );
  const sharedConnections = useMemo(
    () => connections.filter((connection) => isSharedConnection(connection.id)),
    [connections]
  );
  const profileLocationSuggestions = useMemo(() => {
    const query = profileDraftLocation.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return locationDirectory
      .filter((location) => location.label.toLowerCase().includes(query))
      .slice(0, 5);
  }, [profileDraftLocation]);

  const locationSuggestions = useMemo(() => {
    const query = draftLocation.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return locationDirectory
      .filter((location) => location.label.toLowerCase().includes(query))
      .slice(0, 5);
  }, [draftLocation]);

  useEffect(() => {
    setSelectedFilter(isDemoMode ? "partner" : "all");
    setEditorVisible(false);
    setSelectedPersonId("");
  }, [isDemoMode]);

  useEffect(() => {
    const loadInvites = async () => {
      if (!user?.id || !userEmail || !hasSupabaseCredentials || isDemoMode) {
        setIncomingInvites([]);
        setSentInvites([]);
        return;
      }

      try {
        const [incoming, sent] = await Promise.all([
          fetchIncomingInvites(userEmail),
          fetchSentInvites(user.id),
        ]);
        setIncomingInvites(incoming.filter((invite) => invite.status === "pending"));
        setSentInvites(sent);
      } catch {
        setIncomingInvites([]);
        setSentInvites([]);
      }
    };

    void loadInvites();
  }, [isDemoMode, user?.id, userEmail]);

  useEffect(() => {
    setProfileDraftName(profile.displayName);
    setProfileDraftLocation(profile.location);
    setProfileDraftTimezone(profile.timezone);
    setProfileDraftRelationshipFocus(profile.relationshipFocus);
    setProfileDraftNote(profile.note);
    setProfileDraftLinkedSocials(profile.linkedSocials);
    setProfileDraftPhotoUri(profile.photoUri ?? "");
  }, [profile]);

  useEffect(() => {
    const exactMatch = locationDirectory.find(
      (location) => location.label.toLowerCase() === profileDraftLocation.trim().toLowerCase()
    );

    if (exactMatch) {
      setProfileDraftTimezone(exactMatch.timezone);
    }
  }, [profileDraftLocation]);

  useEffect(() => {
    const exactMatch = locationDirectory.find(
      (location) => location.label.toLowerCase() === draftLocation.trim().toLowerCase()
    );

    if (exactMatch) {
      setDraftTimezone(exactMatch.timezone);
    }
  }, [draftLocation]);

  const loadConnection = (connectionId: string) => {
    const connection = connections.find((item) => item.id === connectionId);

    if (!connection) {
      return;
    }

    setSelectedPersonId(connectionId);
    setDraftName(connection.name);
    setDraftRelationshipType(connection.relationshipType);
    setDraftLocation(connection.location);
    setDraftTimezone(connection.timezone);
    setDraftPhotoLabel(connection.photoLabel);
    setDraftPhotoUri(connection.photoUri ?? "");
    setDraftNote(connection.note);
    setDraftLinkedSocials(connection.linkedSocials);
    setDraftAccountStatus(connection.accountStatus);
    setEditorVisible(true);
  };

  const startNewConnection = () => {
    setSelectedPersonId("");
    setDraftName("");
    setDraftRelationshipType("friend");
    setDraftLocation("");
    setDraftTimezone("");
    setDraftPhotoLabel("");
    setDraftPhotoUri("");
    setDraftNote("");
    setDraftLinkedSocials([]);
    setDraftAccountStatus("");
    setEditorVisible(true);
  };

  const applyLocationSuggestion = (locationLabel: string) => {
    const match = locationDirectory.find((location) => location.label === locationLabel);

    setDraftLocation(locationLabel);
    if (match) {
      setDraftTimezone(match.timezone);
    }
  };

  const saveConnection = () => {
    if (!draftName.trim() || !draftLocation.trim()) {
      return;
    }

    const existingConnection = connections.find((item) => item.id === selectedPersonId);
    const nextConnection: Connection = {
      id: existingConnection?.id ?? `conn-${Date.now()}`,
      name: draftName.trim(),
      relationshipType:
        draftRelationshipType === "all" ? "friend" : draftRelationshipType,
      location: draftLocation.trim(),
      timezone: draftTimezone.trim(),
      photoLabel: draftPhotoLabel.trim(),
      note: draftNote.trim() || "Add a little context about how you stay connected.",
      linkedSocials: draftLinkedSocials,
      accountStatus: draftAccountStatus.trim() || "Not connected yet",
      accent: existingConnection?.accent ?? "#FFF1E7",
      photoUri: draftPhotoUri.trim() || undefined,
    };

    let nextConnections: Connection[];

    if (existingConnection) {
      nextConnections = connections.map((item) =>
        item.id === existingConnection.id ? nextConnection : item
      );
      setConnections(nextConnections);
      setSelectedPersonId(existingConnection.id);
    } else {
      nextConnections = [...connections, nextConnection];
      setConnections(nextConnections);
      setSelectedPersonId(nextConnection.id);
    }

    void persistAppDataNow({ connections: nextConnections });
    setEditorVisible(false);
  };

  const syncSharedConnections = async () => {
    if (!user?.id || !hasSupabaseCredentials) {
      return;
    }

    const nextSharedConnections = await fetchSharedConnections(user.id);
    setConnections((current) => {
      const localConnections = current.filter((connection) => !isSharedConnection(connection.id));
      const dedupedLocalConnections = [...localConnections];

      nextSharedConnections.forEach((sharedConnection) => {
        const duplicateLocalIndex = dedupedLocalConnections.findIndex(
          (connection) =>
            connection.relationshipType === sharedConnection.relationshipType &&
            connection.name.trim().toLowerCase() === sharedConnection.name.trim().toLowerCase()
        );

        if (duplicateLocalIndex >= 0) {
          dedupedLocalConnections.splice(duplicateLocalIndex, 1);
        }
      });

      return [...dedupedLocalConnections, ...nextSharedConnections];
    });
  };

  const submitInvite = async () => {
    if (
      !user?.id ||
      !userEmail ||
      !inviteEmail.trim() ||
      inviteRelationshipType === "all" ||
      !hasSupabaseCredentials
    ) {
      return;
    }

    setInviteLoading(true);
    setInviteFeedback("");

    try {
      const result = await sendRelationshipInvite({
        senderId: user.id,
        recipientEmail: inviteEmail,
        recipientName: inviteName,
        relationshipType: inviteRelationshipType,
        note: inviteNote,
      });
      if (result.status === "already_connected") {
        setInviteFeedback(
          `${inviteEmail.trim().toLowerCase()} is already connected to your shared Same Time space.`
        );
      } else if (result.status === "already_sent") {
        setInviteFeedback(
          `An invite is already waiting for ${inviteEmail.trim().toLowerCase()}. I refreshed the details instead of creating a duplicate.`
        );
      } else {
        setInviteFeedback(
          `Invite saved for ${inviteEmail.trim().toLowerCase()}. They can accept it from the People tab after signing in.`
        );
      }
      setInviteName("");
      setInviteEmail("");
      setInviteNote("");
      const nextSentInvites = await fetchSentInvites(user.id);
      setSentInvites(nextSentInvites);
    } catch (error) {
      setInviteFeedback(getErrorMessage(error, "Invite could not be sent."));
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      await acceptRelationshipInvite(inviteId);
      const [nextIncomingInvites] = await Promise.all([
        userEmail ? fetchIncomingInvites(userEmail) : Promise.resolve([]),
        syncSharedConnections(),
      ]);
      setIncomingInvites(nextIncomingInvites.filter((invite) => invite.status === "pending"));
      setInviteFeedback("Invite accepted. Your shared space is now connected.");
    } catch (error) {
      setInviteFeedback(getErrorMessage(error, "Invite could not be accepted."));
    }
  };

  const handleDeclineInvite = async (inviteId: string) => {
    try {
      await declineRelationshipInvite(inviteId);
      setIncomingInvites((current) => current.filter((invite) => invite.id !== inviteId));
    } catch (error) {
      setInviteFeedback(getErrorMessage(error, "Invite could not be declined."));
    }
  };

  const applyProfileLocationSuggestion = (locationLabel: string) => {
    const match = locationDirectory.find((location) => location.label === locationLabel);

    setProfileDraftLocation(locationLabel);
    if (match) {
      setProfileDraftTimezone(match.timezone);
    }
  };

  const uploadProfilePhoto = async () => {
    const nextPhotoUri = await pickImageFromDevice();

    if (nextPhotoUri) {
      setProfileDraftPhotoUri(nextPhotoUri);
    }
  };

  const uploadConnectionPhoto = async () => {
    const nextPhotoUri = await pickImageFromDevice();

    if (nextPhotoUri) {
      setDraftPhotoUri(nextPhotoUri);
      if (!draftPhotoLabel.trim()) {
        setDraftPhotoLabel(`${draftName.trim() || "New"} profile photo`);
      }
    }
  };

  const saveCurrentProfile = () => {
    if (!profileDraftName.trim() || !profileDraftLocation.trim()) {
      return;
    }

    const nextProfile: CurrentUserProfile = {
      displayName: profileDraftName.trim(),
      location: profileDraftLocation.trim(),
      timezone: profileDraftTimezone.trim(),
      relationshipFocus: profileDraftRelationshipFocus.trim(),
      note: profileDraftNote.trim() || "Building this space one relationship at a time.",
      linkedSocials: profileDraftLinkedSocials,
      photoUri: profileDraftPhotoUri.trim() || undefined,
    };

    void saveProfile(nextProfile);
    setProfileEditorVisible(false);
  };

  return (
    <ScreenSurface>
      <SectionCard
        title="Your profile"
        subtitle="Personalize your side of the app so the experience reflects your own long-distance world"
      >
        <View style={styles.profileCard}>
          {profile.photoUri ? (
            <View style={styles.realPhotoPanel}>
              <Image source={{ uri: profile.photoUri }} style={styles.profileImage} resizeMode="cover" />
            </View>
          ) : (
            <View style={[styles.photoPanel, { backgroundColor: palette.softSun }]}>
              <Text style={styles.avatarInitial}>
                {(profile.displayName || "Y").charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{profile.displayName}</Text>
            <Text style={styles.profileMeta}>
              {profile.location || "Add your home base"}
              {profile.timezone ? ` | ${profile.timezone}` : ""}
            </Text>
            <Text style={styles.profileNote}>
              {profile.relationshipFocus || "Add your relationship focus"}
            </Text>
            <Text style={styles.accountStatus}>
              {profile.note || "Describe how you want to use the space with your people."}
            </Text>
            <TouchableOpacity onPress={() => setProfileEditorVisible(true)}>
              <Text style={styles.editLink}>Edit your profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {profileEditorVisible ? (
          <View style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <Text style={styles.feedTitle}>Set up your profile</Text>
              <TouchableOpacity onPress={() => setProfileEditorVisible(false)}>
                <Text style={styles.editLink}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputStack}>
              <Text style={styles.fieldLabel}>
                Name <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                value={profileDraftName}
                onChangeText={setProfileDraftName}
                placeholder="Your name"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              <Text style={styles.fieldLabel}>
                Location <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                value={profileDraftLocation}
                onChangeText={setProfileDraftLocation}
                placeholder="Your location"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              {profileLocationSuggestions.length ? (
                <View style={styles.suggestionList}>
                  {profileLocationSuggestions.map((location) => (
                    <TouchableOpacity
                      key={`profile-${location.label}`}
                      style={styles.suggestionRow}
                      onPress={() => applyProfileLocationSuggestion(location.label)}
                    >
                      <Text style={styles.suggestionTitle}>{location.label}</Text>
                      <Text style={styles.suggestionMeta}>{location.timezone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>Timezone</Text>
              <TextInput
                value={profileDraftTimezone}
                onChangeText={setProfileDraftTimezone}
                placeholder="Timezone, ex: CT"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              <Text style={styles.fieldLabel}>Profile photo</Text>
              <Text style={styles.fieldHelper}>
                Upload from your computer or phone browser to personalize your card.
              </Text>
              <View style={styles.uploadRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => void uploadProfilePhoto()}>
                  <Text style={styles.secondaryButtonText}>
                    {profileDraftPhotoUri ? "Replace photo" : "Upload photo"}
                  </Text>
                </TouchableOpacity>
                {profileDraftPhotoUri ? (
                  <TouchableOpacity style={styles.ghostAction} onPress={() => setProfileDraftPhotoUri("")}>
                    <Text style={styles.ghostActionText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TextInput
                value={profileDraftRelationshipFocus}
                onChangeText={setProfileDraftRelationshipFocus}
                placeholder="Relationship focus, ex: Partner in SF + family in Hanoi"
                placeholderTextColor="#A08F89"
                style={[styles.textInput, styles.detailInput]}
                multiline
              />
              <Text style={styles.fieldLabel}>Profile note</Text>
              <Text style={styles.fieldHelper}>
                This helps explain what kind of shared space you want to build.
              </Text>
              <View style={styles.selectWrap}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setOpenProfileNoteMenu((current) => !current)}
                >
                  <Text style={[styles.selectButtonText, !profileDraftNote && styles.selectPlaceholder]}>
                    {profileDraftNote || "Choose a profile note"}
                  </Text>
                  <Text style={styles.selectChevron}>{openProfileNoteMenu ? "▲" : "▼"}</Text>
                </TouchableOpacity>
                {openProfileNoteMenu ? (
                  <View style={styles.optionList}>
                    {profileNoteOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={styles.optionRow}
                        onPress={() => {
                          setProfileDraftNote(option);
                          setOpenProfileNoteMenu(false);
                        }}
                      >
                        <Text style={styles.optionText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={saveCurrentProfile}>
              <Text style={styles.primaryButtonText}>Save your profile</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Your people"
        subtitle="Invite partners, close friends, siblings, parents, or anyone you want to stay meaningfully connected to"
      >
        <View style={styles.chipWrap}>
          {filters.map((filter) => (
            <FilterChip
              key={filter}
              label={capitalize(filter)}
              active={selectedFilter === filter}
              onPress={() => setSelectedFilter(filter)}
            />
          ))}
        </View>

        {filteredConnections.map((connection) => (
          <View key={connection.id} style={styles.profileCard}>
            {connection.photoUri || profileImages[connection.id] ? (
              <View style={styles.realPhotoPanel}>
                <Image
                  source={connection.photoUri ? { uri: connection.photoUri } : profileImages[connection.id]}
                  style={styles.profileImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <View
                style={[
                  styles.photoPanel,
                  { backgroundColor: connection.accent },
                ]}
              >
                <Text style={styles.avatarInitial}>{connection.name[0]}</Text>
              </View>
            )}
            <View style={styles.profileCopy}>
              <Text style={styles.profileName}>{connection.name}</Text>
              <Text style={styles.profileMeta}>
                {capitalize(connection.relationshipType)} | {connection.location}
              </Text>
              <Text style={styles.profileNote}>{connection.note}</Text>
              <Text style={styles.profileSubtle}>
                {connection.photoLabel} | {connection.timezone}
              </Text>
              <Text style={styles.accountStatus}>{connection.accountStatus}</Text>
              {!isSharedConnection(connection.id) ? (
                <TouchableOpacity onPress={() => loadConnection(connection.id)}>
                  <Text style={styles.editLink}>Edit profile</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.profileSubtle}>Connected through a shared Same Time space</Text>
              )}
            </View>
          </View>
        ))}

        {!filteredConnections.length ? (
          <View style={styles.feedCard}>
            <View style={styles.feedCopy}>
              <Text style={styles.feedTitle}>No people added yet</Text>
              <Text style={styles.feedMeta}>
                Start with one person who feels like home, then let the circle grow from there.
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={startNewConnection}>
            <Text style={styles.secondaryButtonText}>Add friend / partner / family member</Text>
          </TouchableOpacity>
        </View>

        {editorVisible ? (
          <View style={styles.editorCard}>
            <View style={styles.editorHeader}>
              <Text style={styles.feedTitle}>
                {selectedPersonId ? "Edit person profile" : "Add a new person"}
              </Text>
              <TouchableOpacity onPress={() => setEditorVisible(false)}>
                <Text style={styles.editLink}>Close</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputStack}>
              <Text style={styles.fieldLabel}>
                Name <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Name"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              <View style={styles.chipWrap}>
                {["partner", "friend", "family"].map((type) => (
                  <FilterChip
                    key={type}
                    label={capitalize(type)}
                    active={draftRelationshipType === type}
                    onPress={() => setDraftRelationshipType(type as ConnectionFilter)}
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>
                Location <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput
                value={draftLocation}
                onChangeText={setDraftLocation}
                placeholder="Location"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              {locationSuggestions.length ? (
                <View style={styles.suggestionList}>
                  {locationSuggestions.map((location) => (
                    <TouchableOpacity
                      key={location.label}
                      style={styles.suggestionRow}
                      onPress={() => applyLocationSuggestion(location.label)}
                    >
                      <Text style={styles.suggestionTitle}>{location.label}</Text>
                      <Text style={styles.suggestionMeta}>{location.timezone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              <Text style={styles.fieldLabel}>Timezone</Text>
              <TextInput
                value={draftTimezone}
                onChangeText={setDraftTimezone}
                placeholder="Timezone, ex: PT"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              <Text style={styles.fieldLabel}>Profile photo</Text>
              <Text style={styles.fieldHelper}>
                Upload a photo from your computer or phone browser for this person.
              </Text>
              <View style={styles.uploadRow}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => void uploadConnectionPhoto()}>
                  <Text style={styles.secondaryButtonText}>
                    {draftPhotoUri ? "Replace photo" : "Upload photo"}
                  </Text>
                </TouchableOpacity>
                {draftPhotoUri ? (
                  <TouchableOpacity style={styles.ghostAction} onPress={() => setDraftPhotoUri("")}>
                    <Text style={styles.ghostActionText}>Remove</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <TextInput
                value={draftPhotoLabel}
                onChangeText={setDraftPhotoLabel}
                placeholder="Photo label"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              <Text style={styles.fieldLabel}>Profile note</Text>
              <Text style={styles.fieldHelper}>
                This is the quick relationship context shown on their card.
              </Text>
              <View style={styles.selectWrap}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setOpenConnectionNoteMenu((current) => !current)}
                >
                  <Text style={[styles.selectButtonText, !draftNote && styles.selectPlaceholder]}>
                    {draftNote || "Choose a profile note"}
                  </Text>
                  <Text style={styles.selectChevron}>{openConnectionNoteMenu ? "▲" : "▼"}</Text>
                </TouchableOpacity>
                {openConnectionNoteMenu ? (
                  <View style={styles.optionList}>
                    {profileNoteOptions.map((option) => (
                      <TouchableOpacity
                        key={`connection-${option}`}
                        style={styles.optionRow}
                        onPress={() => {
                          setDraftNote(option);
                          setOpenConnectionNoteMenu(false);
                        }}
                      >
                        <Text style={styles.optionText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
              <Text style={styles.fieldLabel}>Account sync status</Text>
              <Text style={styles.fieldHelper}>
                Use this to show whether this person is still local-only, invited, or already sharing a real Same Time space with you.
              </Text>
              <View style={styles.selectWrap}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setOpenAccountStatusMenu((current) => !current)}
                >
                  <Text style={[styles.selectButtonText, !draftAccountStatus && styles.selectPlaceholder]}>
                    {draftAccountStatus || "Choose account sync status"}
                  </Text>
                  <Text style={styles.selectChevron}>{openAccountStatusMenu ? "▲" : "▼"}</Text>
                </TouchableOpacity>
                {openAccountStatusMenu ? (
                  <View style={styles.optionList}>
                    {accountStatusOptions.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={styles.optionRow}
                        onPress={() => {
                          setDraftAccountStatus(option);
                          setOpenAccountStatusMenu(false);
                        }}
                      >
                        <Text style={styles.optionText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={saveConnection}>
              <Text style={styles.primaryButtonText}>
                {selectedPersonId ? "Save profile" : "Add person"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Shared spaces"
        subtitle="Invite someone by email so their account can connect into a real shared Same Time space"
        variant="memory"
      >
        {hasSupabaseCredentials && !isDemoMode ? (
          <>
            <View style={styles.editorCard}>
              <View style={styles.editorHeader}>
                <Text style={styles.feedTitle}>Invite someone into Same Time</Text>
              </View>
              <View style={styles.inputStack}>
                <Text style={styles.fieldLabel}>Their name</Text>
                <TextInput
                  value={inviteName}
                  onChangeText={setInviteName}
                  placeholder="Sean"
                  placeholderTextColor="#A08F89"
                  style={styles.textInput}
                />
                <Text style={styles.fieldLabel}>
                  Their email <Text style={styles.requiredMark}>*</Text>
                </Text>
                <TextInput
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  placeholder="name@example.com"
                  placeholderTextColor="#A08F89"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.textInput}
                />
                <Text style={styles.fieldLabel}>
                  Relationship type <Text style={styles.requiredMark}>*</Text>
                </Text>
                <View style={styles.chipWrap}>
                  {["partner", "friend", "family"].map((type) => (
                    <FilterChip
                      key={`invite-${type}`}
                      label={capitalize(type)}
                      active={inviteRelationshipType === type}
                      onPress={() => setInviteRelationshipType(type as ConnectionFilter)}
                    />
                  ))}
                </View>
                <Text style={styles.fieldLabel}>Invite note</Text>
                <TextInput
                  value={inviteNote}
                  onChangeText={setInviteNote}
                  placeholder="A gentle note about what you want to build together"
                  placeholderTextColor="#A08F89"
                  style={[styles.textInput, styles.detailInput]}
                  multiline
                />
                {inviteFeedback ? <Text style={styles.fieldHelper}>{inviteFeedback}</Text> : null}
              </View>
              <TouchableOpacity style={styles.primaryButton} onPress={() => void submitInvite()}>
                <Text style={styles.primaryButtonText}>
                  {inviteLoading ? "Sending..." : "Send invite"}
                </Text>
              </TouchableOpacity>
            </View>

            {incomingInvites.length ? (
              <View style={styles.editorCard}>
                <Text style={styles.feedTitle}>Incoming invites</Text>
                <View style={styles.feedStack}>
                  {incomingInvites.map((invite) => (
                    <View key={invite.id} style={styles.feedCard}>
                      <View style={styles.feedCopy}>
                        <Text style={styles.feedTitle}>
                          {invite.senderName} invited you as {capitalize(invite.relationshipType)}
                        </Text>
                        <Text style={styles.feedMeta}>
                          {invite.note || "Open a shared Same Time space together."}
                        </Text>
                      </View>
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.secondaryButton}
                          onPress={() => void handleAcceptInvite(invite.id)}
                        >
                          <Text style={styles.secondaryButtonText}>Accept</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.ghostAction}
                          onPress={() => void handleDeclineInvite(invite.id)}
                        >
                          <Text style={styles.ghostActionText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {sentInvites.length ? (
              <View style={styles.editorCard}>
                <Text style={styles.feedTitle}>Sent invites</Text>
                <View style={styles.feedStack}>
                  {sentInvites.map((invite) => (
                    <View key={invite.id} style={styles.feedCard}>
                      <View style={styles.feedCopy}>
                        <Text style={styles.feedTitle}>
                          {invite.recipientName || invite.recipientEmail}
                        </Text>
                        <Text style={styles.feedMeta}>
                          {capitalize(invite.relationshipType)} invite • {capitalize(invite.status)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {sharedConnections.length ? (
              <View style={styles.feedCard}>
                <View style={styles.feedCopy}>
                  <Text style={styles.feedTitle}>Shared spaces live here now</Text>
                  <Text style={styles.feedMeta}>
                    Accepted people appear in your people list and begin moving Same Time toward real shared spaces.
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        ) : (
          <View style={styles.feedCard}>
            <View style={styles.feedCopy}>
              <Text style={styles.feedTitle}>Shared invites appear on real accounts</Text>
              <Text style={styles.feedMeta}>
                Sign into a live Supabase-backed account to invite someone into a shared Same Time space.
              </Text>
            </View>
          </View>
        )}
      </SectionCard>

    </ScreenSurface>
  );
}

function capitalize(value: string) {
  if (value === "friend") {
    return "Friends";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

const styles = StyleSheet.create({
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileCard: {
    flexDirection: "row",
    gap: 14,
    padding: 14,
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
  },
  photoPanel: {
    width: 84,
    minHeight: 84,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F4E6DF",
    paddingVertical: 10,
    gap: 4,
  },
  realPhotoPanel: {
    width: 84,
    height: 104,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F4E6DF",
    position: "relative",
    backgroundColor: "#F4E6DF",
  },
  profileImage: {
    width: "100%",
    height: "100%",
  },
  avatarInitial: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
  },
  profileMeta: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: typography.sansFamilyMedium,
  },
  profileNote: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
  profileSubtle: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontFamily: typography.sansFamilyMedium,
  },
  accountStatus: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
    fontFamily: typography.sansFamily,
  },
  profileSocialRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 2,
  },
  inlineSocialBadge: {
    minWidth: 34,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  inlineSocialGlyph: {
    fontSize: 11,
    fontWeight: "800",
  },
  editLink: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: typography.sansFamilyMedium,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.text,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  editorCard: {
    gap: 12,
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  feedStack: {
    gap: 10,
  },
  editorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inputStack: {
    gap: 10,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  requiredMark: {
    color: palette.berry,
  },
  fieldHelper: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
    fontFamily: typography.sansFamily,
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
    minHeight: 84,
    textAlignVertical: "top",
  },
  selectWrap: {
    gap: 8,
  },
  selectButton: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  selectButtonText: {
    color: palette.text,
    fontSize: 14,
    flex: 1,
    fontFamily: typography.sansFamily,
  },
  selectPlaceholder: {
    color: "#A08F89",
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
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
  suggestionList: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5E8E2",
  },
  suggestionTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "600",
    fontFamily: typography.sansFamilyMedium,
  },
  suggestionMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontFamily: typography.sansFamilyMedium,
  },
  accountLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  uploadRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  ghostAction: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ghostActionText: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
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
  socialBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0E6",
    borderWidth: 1,
    borderColor: "#F4E6DF",
  },
  socialBadgeText: {
    color: palette.text,
    fontWeight: "700",
    fontSize: 12,
    fontFamily: typography.sansFamilyMedium,
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
});
