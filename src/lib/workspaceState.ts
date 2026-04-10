import { supabase } from "./supabase";
import type {
  BudgetItem,
  CalendarEvent,
  CheckInPrompt,
  Connection,
  CurrentUserProfile,
  FlightTrackerEntry,
  FlightWindow,
  ItineraryItem,
  JournalEntry,
  Message,
  MoodUpdate,
  PackingItem,
  TimeCapsule,
  VisitPlan,
} from "../types";

export interface StoredAppData {
  connections: Connection[];
  journalEntries: JournalEntry[];
  timeCapsules: TimeCapsule[];
  calendarEvents: CalendarEvent[];
  messages: Message[];
  moodUpdates: MoodUpdate[];
  checkInPrompts: CheckInPrompt[];
  visitPlans: VisitPlan[];
  itineraryItems: ItineraryItem[];
  completedItinerary: string[];
  flightWindows: FlightWindow[];
  trackedFlights: FlightTrackerEntry[];
  packingItems: PackingItem[];
  packedItems: string[];
  budgetItems: BudgetItem[];
  closedBudgetTrips: string[];
}

interface WorkspaceStateRow {
  user_id: string;
  profile_data: CurrentUserProfile | null;
  app_data: StoredAppData | null;
}

export async function loadWorkspaceState(userId: string) {
  const { data, error } = await supabase
    .from("workspace_state")
    .select("user_id, profile_data, app_data")
    .eq("user_id", userId)
    .maybeSingle<WorkspaceStateRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function saveWorkspaceProfile(userId: string, profile: CurrentUserProfile) {
  const { data: updatedRows, error: updateError } = await supabase
    .from("workspace_state")
    .update({
      profile_data: profile,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id");

  if (updateError) {
    throw updateError;
  }

  if (!updatedRows?.length) {
    const { error: insertError } = await supabase.from("workspace_state").insert({
      user_id: userId,
      profile_data: profile,
      app_data: {},
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      throw insertError;
    }
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: profile.displayName || null,
      location: profile.location || null,
      timezone: profile.timezone || null,
      relationship_focus: profile.relationshipFocus || null,
      note: profile.note || null,
      photo_uri: profile.photoUri || null,
      avatar_url: profile.photoUri || null,
    })
    .eq("id", userId);

  if (profileError) {
    throw profileError;
  }
}

export async function saveWorkspaceAppData(userId: string, appData: StoredAppData) {
  const { data: updatedRows, error: updateError } = await supabase
    .from("workspace_state")
    .update({
      app_data: appData,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .select("user_id");

  if (updateError) {
    throw updateError;
  }

  if (!updatedRows?.length) {
    const { error: insertError } = await supabase.from("workspace_state").insert({
      user_id: userId,
      profile_data: {},
      app_data: appData,
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      throw insertError;
    }
  }
}
