import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../providers/AuthProvider";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";
import { ScreenSurface } from "../../components/ui/ScreenSurface";

type AuthMode = "login" | "signup";
type PreviewMode = "filled" | "blank";

export function AuthScreen() {
  const { signIn, signUp, isDemoMode } = useAuth();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null);
    setIsSubmitting(true);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();

    const result =
      mode === "signup"
        ? await signUp(trimmedEmail, password, trimmedName)
        : await signIn(trimmedEmail, password);

    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
    }
  };

  const openPreview = (previewMode: PreviewMode) => {
    if (typeof window === "undefined") {
      return;
    }

    const nextUrl = new URL(window.location.href);

    if (nextUrl.hostname.includes("--draft.")) {
      nextUrl.hostname = nextUrl.hostname.replace(
        "--draft.",
        previewMode === "filled" ? "--demo-filled." : "--demo-blank."
      );
      nextUrl.hash = "";
      nextUrl.search = "";
      window.location.href = nextUrl.toString();
      return;
    }

    nextUrl.hash = `preview=${previewMode}`;
    window.location.href = nextUrl.toString();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenSurface contentContainerStyle={styles.content}>
        <LinearGradient
          colors={[palette.softRose, palette.softSun, "#FCE8FF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.eyebrow}>Same Time</Text>
          <Text style={styles.heroTitle}>So same time next week?</Text>
          <Text style={styles.heroBody}>
            Shared routines, life updates, memory keeping, and thoughtful planning
            for the people you love, no matter the kind of relationship.
          </Text>
          <View style={styles.chipWrap}>
            {["Chat", "Shared journal", "Time capsule", "Visit countdown"].map(
              (item) => (
                <View key={item} style={styles.valueChip}>
                  <Text style={styles.valueChipText}>{item}</Text>
                </View>
              )
            )}
          </View>
        </LinearGradient>

        <View style={styles.card}>
          <View style={styles.segmentRow}>
            <SegmentButton
              label="Sign up"
              active={mode === "signup"}
              onPress={() => setMode("signup")}
            />
            <SegmentButton
              label="Log in"
              active={mode === "login"}
              onPress={() => setMode("login")}
            />
          </View>

          {isDemoMode && (
            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Demo mode is on</Text>
              <Text style={styles.noticeBody}>
                Add Supabase credentials later to turn this into real email auth.
                For now, any email and password will enter the app.
              </Text>
            </View>
          )}

          {Platform.OS === "web" ? (
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>Jump into a preview</Text>
              <Text style={styles.previewBody}>
                Use a seeded walkthrough or a completely blank account without signing up first.
              </Text>
              <View style={styles.previewButtonRow}>
                <TouchableOpacity
                  style={styles.previewButton}
                  onPress={() => openPreview("filled")}
                >
                  <Text style={styles.previewButtonText}>Open full demo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.previewButton, styles.previewButtonSecondary]}
                  onPress={() => openPreview("blank")}
                >
                  <Text
                    style={[
                      styles.previewButtonText,
                      styles.previewButtonSecondaryText,
                    ]}
                  >
                    Open blank preview
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {mode === "signup" && (
            <>
              <Text style={styles.inputLabel}>Full name</Text>
              <TextInput
                placeholder="Your name"
                placeholderTextColor="#9A8480"
                style={styles.textInput}
                value={fullName}
                onChangeText={setFullName}
              />
            </>
          )}

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            placeholderTextColor="#9A8480"
            style={styles.textInput}
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
          />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            placeholder="Password"
            placeholderTextColor="#9A8480"
            style={styles.textInput}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting
                ? "Loading..."
                : mode === "signup"
                  ? "Create your shared space"
                  : "Enter app"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenSurface>
    </KeyboardAvoidingView>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    paddingTop: 60,
  },
  hero: {
    borderRadius: 28,
    padding: 24,
    gap: 14,
  },
  eyebrow: {
    color: palette.berry,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontFamily: typography.sansFamilyMedium,
  },
  heroTitle: {
    color: palette.text,
    fontSize: 38,
    lineHeight: 44,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.8,
  },
  heroBody: {
    color: palette.muted,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: typography.sansFamily,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  valueChip: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  valueChipText: {
    color: palette.text,
    fontWeight: "600",
    fontFamily: typography.sansFamilyMedium,
    letterSpacing: 0.2,
  },
  card: {
    backgroundColor: palette.card,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 12,
  },
  segmentRow: {
    flexDirection: "row",
    backgroundColor: "#F7ECE7",
    borderRadius: 999,
    padding: 4,
    marginBottom: 8,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  segmentText: {
    color: palette.muted,
    fontWeight: "600",
    fontFamily: typography.sansFamilyMedium,
  },
  segmentTextActive: {
    color: palette.text,
  },
  notice: {
    backgroundColor: "#FFF2D9",
    borderRadius: 20,
    padding: 14,
    gap: 4,
  },
  noticeTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  noticeBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
  previewCard: {
    backgroundColor: "#FFF8F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    gap: 10,
  },
  previewTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
  },
  previewBody: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
  previewButtonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  previewButton: {
    backgroundColor: palette.text,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 160,
    alignItems: "center",
  },
  previewButtonSecondary: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: palette.text,
  },
  previewButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  previewButtonSecondaryText: {
    color: palette.text,
  },
  inputLabel: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
    fontFamily: typography.sansFamilyMedium,
  },
  textInput: {
    backgroundColor: "#FFF7F2",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: palette.text,
    fontSize: 16,
    fontFamily: typography.sansFamily,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.3,
  },
  sectionHint: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
  errorText: {
    color: "#A73434",
    fontSize: 14,
    fontWeight: "600",
    fontFamily: typography.sansFamilyMedium,
  },
  primaryButton: {
    backgroundColor: palette.text,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
});
