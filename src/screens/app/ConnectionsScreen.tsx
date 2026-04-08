import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { socialPlatforms } from "../../data/mockData";
import { FilterChip } from "../../components/ui/FilterChip";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { locationDirectory } from "../../data/locationDirectory";
import { pickImageFromDevice } from "../../lib/pickImageFromDevice";
import { useAuth } from "../../providers/AuthProvider";
import { useAppData } from "../../providers/AppDataProvider";
import { useProfile } from "../../providers/ProfileProvider";
import { Connection, ConnectionFilter, CurrentUserProfile, SocialPlatform } from "../../types";
import { palette } from "../../theme/palette";

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
  "Synced profile photo",
  "Synced profile + playlist",
  "Synced socials + calendar context",
];
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
  const { connections, setConnections } = useAppData();
  const { profile, saveProfile } = useProfile();
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

  const toggleDraftSocial = (platform: SocialPlatform) => {
    setDraftLinkedSocials((current) =>
      current.includes(platform)
        ? current.filter((item) => item !== platform)
        : [...current, platform]
    );
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
                Use this to show what outside context is already connected for this person.
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
  fieldLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
  },
  requiredMark: {
    color: palette.berry,
  },
  fieldHelper: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: -4,
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
