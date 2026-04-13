import { removeBrowserStorage, readBrowserStorage, writeBrowserStorage } from "./browserStorage";

const GOOGLE_CALENDAR_SCOPE = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  expires_in?: number;
  scope?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleIdentityGlobal = {
  accounts?: {
    oauth2?: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: () => void;
      }) => GoogleTokenClient;
      revoke?: (token: string, done?: () => void) => void;
    };
  };
};

export type GoogleCalendarSession = {
  accessToken: string;
  expiresAt: number;
  scope: string;
  connectedAt: string;
};

type GoogleCalendarEventInput = {
  accessToken: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  timeZone: string;
};

let googleIdentityScriptPromise: Promise<void> | null = null;

function getGoogleGlobal() {
  return (globalThis as typeof globalThis & { google?: GoogleIdentityGlobal }).google;
}

function getGoogleCalendarStorageKey(userEmail: string | null) {
  return userEmail ? `same-time-google-calendar:${userEmail}` : null;
}

function hasValidGoogleSession(session: GoogleCalendarSession | null) {
  return Boolean(session && session.accessToken && session.expiresAt > Date.now());
}

function persistGoogleCalendarSession(userEmail: string | null, session: GoogleCalendarSession) {
  const storageKey = getGoogleCalendarStorageKey(userEmail);

  if (!storageKey) {
    return;
  }

  writeBrowserStorage(storageKey, JSON.stringify(session));
}

export function readGoogleCalendarSession(userEmail: string | null) {
  const rawSession = readBrowserStorage(getGoogleCalendarStorageKey(userEmail));

  if (!rawSession) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSession) as GoogleCalendarSession;

    if (!hasValidGoogleSession(parsed)) {
      clearGoogleCalendarSession(userEmail);
      return null;
    }

    return parsed;
  } catch {
    clearGoogleCalendarSession(userEmail);
    return null;
  }
}

export function clearGoogleCalendarSession(userEmail: string | null) {
  const storageKey = getGoogleCalendarStorageKey(userEmail);
  const googleGlobal = getGoogleGlobal();
  const session = readGoogleCalendarSession(userEmail);

  if (session?.accessToken) {
    try {
      googleGlobal?.accounts?.oauth2?.revoke?.(session.accessToken);
    } catch {
      // Ignore revoke issues and still clear local state.
    }
  }

  removeBrowserStorage(storageKey);
}

function loadGoogleIdentityScript() {
  if (typeof document === "undefined") {
    return Promise.reject(new Error("google_calendar_browser_only"));
  }

  if (getGoogleGlobal()?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) {
    return googleIdentityScriptPromise;
  }

  googleIdentityScriptPromise = new Promise<void>((resolve, reject) => {
    const sourceUrl = "https://accounts.google.com/gsi/client";
    const existingScript = document.querySelector(`script[src="${sourceUrl}"]`);

    const handleReady = () => {
      if (getGoogleGlobal()?.accounts?.oauth2) {
        resolve();
        return;
      }

      reject(new Error("google_calendar_script_unavailable"));
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleReady, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("google_calendar_script_failed")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = sourceUrl;
    script.async = true;
    script.defer = true;
    script.onload = handleReady;
    script.onerror = () => reject(new Error("google_calendar_script_failed"));
    document.head.appendChild(script);
  });

  return googleIdentityScriptPromise;
}

async function requestGoogleCalendarAccessToken(input: {
  clientId: string;
  userEmail: string | null;
  prompt: string;
}) {
  await loadGoogleIdentityScript();

  const googleGlobal = getGoogleGlobal();
  const oauth2 = googleGlobal?.accounts?.oauth2;

  if (!oauth2?.initTokenClient) {
    throw new Error("google_calendar_oauth_unavailable");
  }

  return new Promise<GoogleCalendarSession>((resolve, reject) => {
    const tokenClient = oauth2.initTokenClient({
      client_id: input.clientId,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error || "google_calendar_access_denied"));
          return;
        }

        const session: GoogleCalendarSession = {
          accessToken: response.access_token,
          expiresAt: Date.now() + Math.max((response.expires_in ?? 3600) - 60, 60) * 1000,
          scope: response.scope ?? GOOGLE_CALENDAR_SCOPE,
          connectedAt: new Date().toISOString(),
        };

        persistGoogleCalendarSession(input.userEmail, session);
        resolve(session);
      },
      error_callback: () => {
        reject(new Error("google_calendar_popup_closed"));
      },
    });

    tokenClient.requestAccessToken({ prompt: input.prompt });
  });
}

export async function connectGoogleCalendar(input: {
  clientId: string;
  userEmail: string | null;
}) {
  return requestGoogleCalendarAccessToken({
    clientId: input.clientId,
    userEmail: input.userEmail,
    prompt: "consent",
  });
}

export async function createGoogleCalendarEvent(input: GoogleCalendarEventInput) {
  const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary: input.title,
      description: input.description,
      start: {
        dateTime: input.startDate.toISOString(),
        timeZone: input.timeZone,
      },
      end: {
        dateTime: input.endDate.toISOString(),
        timeZone: input.timeZone,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`google_calendar_insert_failed_${response.status}`);
  }

  return (await response.json()) as { id?: string; htmlLink?: string };
}
