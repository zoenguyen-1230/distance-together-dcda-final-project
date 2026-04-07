import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { connections as seedConnections, socialPlatforms } from "../../data/mockData";
import { FilterChip } from "../../components/ui/FilterChip";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { locationDirectory } from "../../data/locationDirectory";
import { useAuth } from "../../providers/AuthProvider";
import { useProfile } from "../../providers/ProfileProvider";
import { Connection, ConnectionFilter, CurrentUserProfile, SocialPlatform } from "../../types";
import { palette } from "../../theme/palette";

const filters: ConnectionFilter[] = ["all", "partner", "friend", "family"];
const seanProfileImage = require("../../assets/sean-profile.jpg");
const profileImages: Record<string, any> = {
  "conn-1": seanProfileImage,
};
const socialVisuals: Record<
  SocialPlatform,
  { glyph: string; background: string; color: string }
> = {
  Instagram: { glyph: "IG", background: "#FDE7F0", color: "#C64C73" },
  Spotify: { glyph: "SP", background: "#E7F8EE", color: "#1DB954" },
  TikTok: { glyph: "TT", background: "#EAF2FF", color: "#111111" },
  Facebook: { glyph: "f", background: "#E8F0FF", color: "#1877F2" },
  X: { glyph: "X", background: "#F2F2F2", color: "#111111" },
  BeReal: { glyph: "Be", background: "#FFF3D9", color: "#111111" },
};
export function ConnectionsScreen() {
  const { isDemoMode } = useAuth();
  const { profile, saveProfile } = useProfile();
  const [connections, setConnections] = useState<Connection[]>(
    isDemoMode ? seedConnections : []
  );
  const [selectedFilter, setSelectedFilter] = useState<ConnectionFilter>(
    isDemoMode ? "partner" : "all"
  );
  const [selectedSocials, setSelectedSocials] = useState<SocialPlatform[]>(
    isDemoMode ? ["Instagram", "Spotify"] : []
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
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [editorVisible, setEditorVisible] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftRelationshipType, setDraftRelationshipType] = useState<ConnectionFilter>("partner");
  const [draftLocation, setDraftLocation] = useState("");
  const [draftTimezone, setDraftTimezone] = useState("");
  const [draftPhotoLabel, setDraftPhotoLabel] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [draftLinkedSocials, setDraftLinkedSocials] = useState<SocialPlatform[]>([]);
  const [draftAccountStatus, setDraftAccountStatus] = useState("");

  const filteredConnections = useMemo(
    () =>
      connections.filter((connection) =>
        selectedFilter === "all"
          ? true
          : connection.relationshipType === selectedFilter
      ),
    [connections, selectedFilter]
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
    setConnections(isDemoMode ? seedConnections : []);
    setSelectedFilter(isDemoMode ? "partner" : "all");
    setSelectedSocials(isDemoMode ? ["Instagram", "Spotify"] : []);
    setEditorVisible(false);
    setSelectedPersonId("");
  }, [isDemoMode]);

  useEffect(() => {
    setProfileDraftName(profile.displayName);
    setProfileDraftLocation(profile.location);
    setProfileDraftTimezone(profile.timezone);
    setProfileDraftRelationshipFocus(profile.relationshipFocus);
    setProfileDraftNote(profile.note);
    setProfileDraftLinkedSocials(profile.linkedSocials);
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

  const toggleSocial = (platform: SocialPlatform) => {
    setSelectedSocials((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

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

  const toggleDraftSocial = (platform: SocialPlatform) => {
    setDraftLinkedSocials((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const saveConnection = () => {
    if (
      !draftName.trim() ||
      !draftLocation.trim() ||
      !draftTimezone.trim() ||
      !draftNote.trim()
    ) {
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
      note: draftNote.trim(),
      linkedSocials: draftLinkedSocials,
      accountStatus: draftAccountStatus.trim() || "Account ready to connect",
      accent: existingConnection?.accent ?? "#FFF1E7",
    };

    if (existingConnection) {
      setConnections((current) =>
        current.map((item) => (item.id === existingConnection.id ? nextConnection : item))
      );
      setSelectedPersonId(existingConnection.id);
    } else {
      setConnections((current) => [...current, nextConnection]);
      setSelectedPersonId(nextConnection.id);
    }

    setEditorVisible(false);
  };

  const applyProfileLocationSuggestion = (locationLabel: string) => {
    const match = locationDirectory.find((location) => location.label === locationLabel);

    setProfileDraftLocation(locationLabel);
    if (match) {
      setProfileDraftTimezone(match.timezone);
    }
  };

  const toggleProfileSocial = (platform: SocialPlatform) => {
    setProfileDraftLinkedSocials((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
  };

  const saveCurrentProfile = () => {
    if (!profileDraftName.trim()) {
      return;
    }

    const nextProfile: CurrentUserProfile = {
      displayName: profileDraftName.trim(),
      location: profileDraftLocation.trim(),
      timezone: profileDraftTimezone.trim(),
      relationshipFocus: profileDraftRelationshipFocus.trim(),
      note: profileDraftNote.trim(),
      linkedSocials: profileDraftLinkedSocials,
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
          <View style={[styles.photoPanel, { backgroundColor: palette.softSun }]}>
            <Text style={styles.avatarInitial}>
              {(profile.displayName || "Y").charAt(0).toUpperCase()}
            </Text>
          </View>
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
            <View style={styles.profileSocialRow}>
              {profile.linkedSocials.map((platform) => {
                const visual = socialVisuals[platform];

                return (
                  <View
                    key={`current-profile-${platform}`}
                    style={[
                      styles.inlineSocialBadge,
                      { backgroundColor: visual.background },
                    ]}
                  >
                    <Text style={[styles.inlineSocialGlyph, { color: visual.color }]}>
                      {visual.glyph}
                    </Text>
                  </View>
                );
              })}
            </View>
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
              <TextInput
                value={profileDraftName}
                onChangeText={setProfileDraftName}
                placeholder="Your name"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
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
              <TextInput
                value={profileDraftTimezone}
                onChangeText={setProfileDraftTimezone}
                placeholder="Timezone, ex: CT"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              <TextInput
                value={profileDraftRelationshipFocus}
                onChangeText={setProfileDraftRelationshipFocus}
                placeholder="Relationship focus, ex: Partner in SF + family in Hanoi"
                placeholderTextColor="#A08F89"
                style={[styles.textInput, styles.detailInput]}
                multiline
              />
              <TextInput
                value={profileDraftNote}
                onChangeText={setProfileDraftNote}
                placeholder="A note about how you want to use the app"
                placeholderTextColor="#A08F89"
                style={[styles.textInput, styles.detailInput]}
                multiline
              />
              <Text style={styles.accountLabel}>Linked socials</Text>
              <View style={styles.chipWrap}>
                {socialPlatforms.map((platform) => (
                  <FilterChip
                    key={`profile-${platform}`}
                    label={platform}
                    active={profileDraftLinkedSocials.includes(platform)}
                    onPress={() => toggleProfileSocial(platform)}
                  />
                ))}
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
            {profileImages[connection.id] ? (
              <View style={styles.realPhotoPanel}>
                <Image
                  source={profileImages[connection.id]}
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
              <View style={styles.profileSocialRow}>
                {connection.linkedSocials.map((platform) => {
                  const visual = socialVisuals[platform];

                  return (
                    <View
                      key={`${connection.id}-${platform}`}
                      style={[
                        styles.inlineSocialBadge,
                        { backgroundColor: visual.background },
                      ]}
                    >
                      <Text style={[styles.inlineSocialGlyph, { color: visual.color }]}>
                        {visual.glyph}
                      </Text>
                    </View>
                  );
                })}
              </View>
              <TouchableOpacity onPress={() => loadConnection(connection.id)}>
                <Text style={styles.editLink}>Edit profile</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {!filteredConnections.length ? (
          <View style={styles.feedCard}>
            <View style={styles.feedCopy}>
              <Text style={styles.feedTitle}>No people added yet</Text>
              <Text style={styles.feedMeta}>
                Start blank and build your own circle. Add your first partner, friend, or family member below.
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
              <TextInput
                value={draftTimezone}
                onChangeText={setDraftTimezone}
                placeholder="Timezone, ex: PT"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              <TextInput
                value={draftPhotoLabel}
                onChangeText={setDraftPhotoLabel}
                placeholder="Photo label"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              <TextInput
                value={draftNote}
                onChangeText={setDraftNote}
                placeholder="Profile note"
                placeholderTextColor="#A08F89"
                style={[styles.textInput, styles.detailInput]}
                multiline
              />
              <TextInput
                value={draftAccountStatus}
                onChangeText={setDraftAccountStatus}
                placeholder="Account sync status"
                placeholderTextColor="#A08F89"
                style={styles.textInput}
              />
              <Text style={styles.accountLabel}>Connect accounts</Text>
              <View style={styles.chipWrap}>
                {socialPlatforms.map((platform) => (
                  <FilterChip
                    key={`draft-${platform}`}
                    label={platform}
                    active={draftLinkedSocials.includes(platform)}
                    onPress={() => toggleDraftSocial(platform)}
                  />
                ))}
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
        title="Connected socials"
        subtitle="Bring familiar context into the relationship space without making outside platforms the main experience"
      >
        <View style={styles.chipWrap}>
          {socialPlatforms.map((platform) => (
            <FilterChip
              key={platform}
              label={platform}
              active={selectedSocials.includes(platform)}
              onPress={() => toggleSocial(platform)}
            />
          ))}
        </View>

        {selectedSocials.length ? (
          selectedSocials.map((platform) => (
            <View key={platform} style={styles.feedCard}>
              <View
                style={[
                  styles.socialBadge,
                  { backgroundColor: socialVisuals[platform].background },
                ]}
              >
                <Text
                  style={[
                    styles.socialBadgeText,
                    { color: socialVisuals[platform].color },
                  ]}
                >
                  {socialVisuals[platform].glyph}
                </Text>
              </View>
              <View style={styles.feedCopy}>
                <Text style={styles.feedTitle}>{platform} profile linked</Text>
                <Text style={styles.feedMeta}>
                  Sync handles, recent context, and shared identity cues so the app stays up to
                  date with the accounts you both already use.
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.feedCard}>
            <View style={styles.feedCopy}>
              <Text style={styles.feedTitle}>No socials linked yet</Text>
              <Text style={styles.feedMeta}>
                Pick the platforms you want to connect when you are ready to personalize your account.
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
  },
  profileCopy: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
  },
  profileMeta: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  profileNote: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  profileSubtle: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  accountStatus: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "600",
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
  },
  editorCard: {
    gap: 12,
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
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
  textInput: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.text,
    fontSize: 14,
  },
  detailInput: {
    minHeight: 84,
    textAlignVertical: "top",
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
  },
  suggestionMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  accountLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
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
});
