import React, {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CurrentUserProfile, SocialPlatform } from "../types";
import { useAuth } from "./AuthProvider";

interface ProfileContextValue {
  initialized: boolean;
  profile: CurrentUserProfile;
  saveProfile: (nextProfile: CurrentUserProfile) => Promise<void>;
}

const defaultLinkedSocials: SocialPlatform[] = [];

function buildDefaultProfile(
  userEmail: string | null,
  displayName: string | null
): CurrentUserProfile {
  return {
    displayName: displayName || userEmail?.split("@")[0] || "You",
    location: "",
    timezone: "",
    relationshipFocus: "",
    note: "",
    linkedSocials: defaultLinkedSocials,
    photoUri: "",
  };
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { userEmail, displayName } = useAuth();
  const [initialized, setInitialized] = useState(false);
  const [profile, setProfile] = useState<CurrentUserProfile>(
    buildDefaultProfile(userEmail, displayName)
  );

  useEffect(() => {
    const loadProfile = async () => {
      if (!userEmail) {
        startTransition(() => {
          setProfile(buildDefaultProfile(userEmail, displayName));
          setInitialized(true);
        });
        return;
      }

      setInitialized(false);

      try {
        const storageKey = `distance-together-profile:${userEmail}`;
        const savedValue = await AsyncStorage.getItem(storageKey);
        const defaultProfile = buildDefaultProfile(userEmail, displayName);

        if (savedValue) {
          const savedProfile = JSON.parse(savedValue) as Partial<CurrentUserProfile>;

          startTransition(() => {
            setProfile({
              ...defaultProfile,
              ...savedProfile,
              linkedSocials: Array.isArray(savedProfile.linkedSocials)
                ? (savedProfile.linkedSocials as SocialPlatform[])
                : defaultProfile.linkedSocials,
              photoUri:
                typeof savedProfile.photoUri === "string"
                  ? savedProfile.photoUri
                  : defaultProfile.photoUri,
            });
            setInitialized(true);
          });
          return;
        }

        startTransition(() => {
          setProfile(defaultProfile);
          setInitialized(true);
        });
      } catch {
        startTransition(() => {
          setProfile(buildDefaultProfile(userEmail, displayName));
          setInitialized(true);
        });
      }
    };

    void loadProfile();
  }, [displayName, userEmail]);

  const saveProfile = async (nextProfile: CurrentUserProfile) => {
    startTransition(() => {
      setProfile(nextProfile);
    });

    if (!userEmail) {
      return;
    }

    await AsyncStorage.setItem(
      `distance-together-profile:${userEmail}`,
      JSON.stringify(nextProfile)
    );
  };

  const value = useMemo<ProfileContextValue>(
    () => ({
      initialized,
      profile,
      saveProfile,
    }),
    [initialized, profile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const value = useContext(ProfileContext);

  if (!value) {
    throw new Error("useProfile must be used inside ProfileProvider");
  }

  return value;
}
