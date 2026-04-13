type EnvShape = Record<string, string | undefined>;
type PreviewBuildMode = "filled" | "blank" | null;

const runtimeProcessEnv =
  (globalThis as typeof globalThis & { process?: { env?: EnvShape } }).process?.env ?? {};

const supabaseUrl =
  (typeof process !== "undefined" ? process.env.EXPO_PUBLIC_SUPABASE_URL : undefined) ??
  runtimeProcessEnv.EXPO_PUBLIC_SUPABASE_URL ??
  "";

const supabasePublicKey =
  (typeof process !== "undefined"
    ? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    : undefined) ??
  runtimeProcessEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  (typeof process !== "undefined" ? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY : undefined) ??
  runtimeProcessEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "";

const previewBuildModeValue =
  runtimeProcessEnv.EXPO_PUBLIC_PREVIEW_BUILD_MODE ?? "";

const googleCalendarClientId =
  (typeof process !== "undefined"
    ? process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID
    : undefined) ??
  runtimeProcessEnv.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID ??
  "";

export const env = {
  supabaseUrl,
  supabasePublicKey,
  googleCalendarClientId,
  previewBuildMode:
    previewBuildModeValue === "filled" || previewBuildModeValue === "blank"
      ? (previewBuildModeValue as PreviewBuildMode)
      : null,
};

export const hasSupabaseCredentials = Boolean(
  env.supabaseUrl && env.supabasePublicKey
);

export const hasGoogleCalendarClientId = Boolean(env.googleCalendarClientId);
