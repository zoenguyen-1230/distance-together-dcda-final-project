type EnvShape = Record<string, string | undefined>;
type PreviewBuildMode = "filled" | "blank" | null;

const processEnv =
  (globalThis as typeof globalThis & { process?: { env?: EnvShape } }).process?.env ?? {};

export const env = {
  supabaseUrl: processEnv.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabasePublicKey:
    processEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    processEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  previewBuildMode:
    processEnv.EXPO_PUBLIC_PREVIEW_BUILD_MODE === "filled" ||
    processEnv.EXPO_PUBLIC_PREVIEW_BUILD_MODE === "blank"
      ? (processEnv.EXPO_PUBLIC_PREVIEW_BUILD_MODE as PreviewBuildMode)
      : null,
};

export const hasSupabaseCredentials = Boolean(
  env.supabaseUrl && env.supabasePublicKey
);
