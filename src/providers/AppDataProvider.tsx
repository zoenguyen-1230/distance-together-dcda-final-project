import React, {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { hasSupabaseCredentials } from "../config/env";
import {
  calendarEvents as seedCalendarEvents,
  checkInPrompts as seedCheckInPrompts,
  cheapFlightWindows as seedFlightWindows,
  connections as seedConnections,
  conversations as seedConversations,
  journalEntries as seedJournalEntries,
  nextVisitItinerary as seedItineraryItems,
  packingChecklist as seedPackingItems,
  sharedBudgetSeed as seedBudgetItems,
  timeCapsules as seedTimeCapsules,
  trackedFlights as seedTrackedFlights,
  upcomingVisits as seedVisitPlans,
} from "../data/mockData";
import {
  BudgetItem,
  CalendarEvent,
  CheckInPrompt,
  Connection,
  FlightTrackerEntry,
  FlightWindow,
  ItineraryItem,
  JournalEntry,
  Message,
  PackingItem,
  TimeCapsule,
  VisitPlan,
} from "../types";
import { loadWorkspaceState, saveWorkspaceAppData, type StoredAppData } from "../lib/workspaceState";
import { fetchSharedConnections, isSharedConnection } from "../lib/sharedRelationships";
import { useAuth } from "./AuthProvider";

interface AppDataContextValue {
  initialized: boolean;
  connections: Connection[];
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>;
  journalEntries: JournalEntry[];
  setJournalEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  timeCapsules: TimeCapsule[];
  setTimeCapsules: React.Dispatch<React.SetStateAction<TimeCapsule[]>>;
  calendarEvents: CalendarEvent[];
  setCalendarEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  checkInPrompts: CheckInPrompt[];
  setCheckInPrompts: React.Dispatch<React.SetStateAction<CheckInPrompt[]>>;
  visitPlans: VisitPlan[];
  setVisitPlans: React.Dispatch<React.SetStateAction<VisitPlan[]>>;
  itineraryItems: ItineraryItem[];
  setItineraryItems: React.Dispatch<React.SetStateAction<ItineraryItem[]>>;
  completedItinerary: string[];
  setCompletedItinerary: React.Dispatch<React.SetStateAction<string[]>>;
  flightWindows: FlightWindow[];
  setFlightWindows: React.Dispatch<React.SetStateAction<FlightWindow[]>>;
  trackedFlights: FlightTrackerEntry[];
  setTrackedFlights: React.Dispatch<React.SetStateAction<FlightTrackerEntry[]>>;
  packingItems: PackingItem[];
  setPackingItems: React.Dispatch<React.SetStateAction<PackingItem[]>>;
  packedItems: string[];
  setPackedItems: React.Dispatch<React.SetStateAction<string[]>>;
  budgetItems: BudgetItem[];
  setBudgetItems: React.Dispatch<React.SetStateAction<BudgetItem[]>>;
  closedBudgetTrips: string[];
  setClosedBudgetTrips: React.Dispatch<React.SetStateAction<string[]>>;
}

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

function getStorageKey(userEmail: string | null, previewMode: "filled" | "blank" | null) {
  if (previewMode) {
    return `same-time-preview-data:${previewMode}`;
  }

  if (userEmail) {
    return `same-time-app-data:${userEmail}`;
  }

  return null;
}

function buildDefaultData(mode: "filled" | "blank"): StoredAppData {
  if (mode === "filled") {
    return {
      connections: seedConnections,
      journalEntries: seedJournalEntries,
      timeCapsules: seedTimeCapsules,
      calendarEvents: seedCalendarEvents,
      messages: seedConversations,
      checkInPrompts: seedCheckInPrompts,
      visitPlans: seedVisitPlans,
      itineraryItems: seedItineraryItems,
      completedItinerary: seedItineraryItems[0] ? [seedItineraryItems[0].id] : [],
      flightWindows: seedFlightWindows,
      trackedFlights: seedTrackedFlights,
      packingItems: seedPackingItems,
      packedItems: [],
      budgetItems: seedBudgetItems,
      closedBudgetTrips: [],
    };
  }

  return {
    connections: [],
    journalEntries: [],
    timeCapsules: [],
    calendarEvents: [],
    messages: [],
    checkInPrompts: [],
    visitPlans: [],
    itineraryItems: [],
    completedItinerary: [],
    flightWindows: [],
    trackedFlights: [],
    packingItems: [],
    packedItems: [],
    budgetItems: [],
    closedBudgetTrips: [],
  };
}

function mergeConnections(localConnections: Connection[], sharedConnections: Connection[]) {
  const byId = new Map<string, Connection>();

  [...localConnections, ...sharedConnections].forEach((connection) => {
    byId.set(connection.id, connection);
  });

  return Array.from(byId.values());
}

function withoutSharedConnections(connections: Connection[]) {
  return connections.filter((connection) => !isSharedConnection(connection.id));
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user, userEmail, previewMode, isDemoMode } = useAuth();
  const storageKey = getStorageKey(userEmail, previewMode);
  const shouldUseSupabaseState = Boolean(user?.id && hasSupabaseCredentials && !previewMode);
  const [initialized, setInitialized] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [timeCapsules, setTimeCapsules] = useState<TimeCapsule[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [checkInPrompts, setCheckInPrompts] = useState<CheckInPrompt[]>([]);
  const [visitPlans, setVisitPlans] = useState<VisitPlan[]>([]);
  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([]);
  const [completedItinerary, setCompletedItinerary] = useState<string[]>([]);
  const [flightWindows, setFlightWindows] = useState<FlightWindow[]>([]);
  const [trackedFlights, setTrackedFlights] = useState<FlightTrackerEntry[]>([]);
  const [packingItems, setPackingItems] = useState<PackingItem[]>([]);
  const [packedItems, setPackedItems] = useState<string[]>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [closedBudgetTrips, setClosedBudgetTrips] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setInitialized(false);

      try {
        if (shouldUseSupabaseState && user?.id) {
          const sharedConnections = await fetchSharedConnections(user.id).catch(() => []);
          const workspace = await loadWorkspaceState(user.id);
          const parsed = workspace?.app_data;

          if (parsed) {
            const localConnections = Array.isArray(parsed.connections)
              ? (parsed.connections as Connection[])
              : [];
            startTransition(() => {
              setConnections(mergeConnections(localConnections, sharedConnections));
              setJournalEntries(
                Array.isArray(parsed.journalEntries) ? (parsed.journalEntries as JournalEntry[]) : []
              );
              setTimeCapsules(
                Array.isArray(parsed.timeCapsules) ? (parsed.timeCapsules as TimeCapsule[]) : []
              );
              setCalendarEvents(
                Array.isArray(parsed.calendarEvents) ? (parsed.calendarEvents as CalendarEvent[]) : []
              );
              setMessages(Array.isArray(parsed.messages) ? (parsed.messages as Message[]) : []);
              setCheckInPrompts(
                Array.isArray(parsed.checkInPrompts) ? (parsed.checkInPrompts as CheckInPrompt[]) : []
              );
              setVisitPlans(Array.isArray(parsed.visitPlans) ? (parsed.visitPlans as VisitPlan[]) : []);
              setItineraryItems(
                Array.isArray(parsed.itineraryItems) ? (parsed.itineraryItems as ItineraryItem[]) : []
              );
              setCompletedItinerary(
                Array.isArray(parsed.completedItinerary) ? parsed.completedItinerary : []
              );
              setFlightWindows(
                Array.isArray(parsed.flightWindows) ? (parsed.flightWindows as FlightWindow[]) : []
              );
              setTrackedFlights(
                Array.isArray(parsed.trackedFlights)
                  ? (parsed.trackedFlights as FlightTrackerEntry[])
                  : []
              );
              setPackingItems(
                Array.isArray(parsed.packingItems) ? (parsed.packingItems as PackingItem[]) : []
              );
              setPackedItems(Array.isArray(parsed.packedItems) ? parsed.packedItems : []);
              setBudgetItems(
                Array.isArray(parsed.budgetItems) ? (parsed.budgetItems as BudgetItem[]) : []
              );
              setClosedBudgetTrips(
                Array.isArray(parsed.closedBudgetTrips) ? parsed.closedBudgetTrips : []
              );
              setInitialized(true);
            });
            return;
          }

          const blankWorkspace = buildDefaultData("blank");
          startTransition(() => {
            setConnections(mergeConnections(blankWorkspace.connections, sharedConnections));
            setJournalEntries(blankWorkspace.journalEntries);
            setTimeCapsules(blankWorkspace.timeCapsules);
            setCalendarEvents(blankWorkspace.calendarEvents);
            setMessages(blankWorkspace.messages);
            setCheckInPrompts(blankWorkspace.checkInPrompts);
            setVisitPlans(blankWorkspace.visitPlans);
            setItineraryItems(blankWorkspace.itineraryItems);
            setCompletedItinerary(blankWorkspace.completedItinerary);
            setFlightWindows(blankWorkspace.flightWindows);
            setTrackedFlights(blankWorkspace.trackedFlights);
            setPackingItems(blankWorkspace.packingItems);
            setPackedItems(blankWorkspace.packedItems);
            setBudgetItems(blankWorkspace.budgetItems);
            setClosedBudgetTrips(blankWorkspace.closedBudgetTrips);
            setInitialized(true);
          });
          return;
        }

        if (storageKey) {
          const savedValue = await AsyncStorage.getItem(storageKey);

          if (savedValue) {
            const parsed = JSON.parse(savedValue) as Partial<StoredAppData>;
            startTransition(() => {
              setConnections(Array.isArray(parsed.connections) ? parsed.connections : []);
              setJournalEntries(
                Array.isArray(parsed.journalEntries) ? parsed.journalEntries : []
              );
              setTimeCapsules(Array.isArray(parsed.timeCapsules) ? parsed.timeCapsules : []);
              setCalendarEvents(
                Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : []
              );
              setMessages(Array.isArray(parsed.messages) ? parsed.messages : []);
              setCheckInPrompts(
                Array.isArray(parsed.checkInPrompts) ? parsed.checkInPrompts : []
              );
              setVisitPlans(Array.isArray(parsed.visitPlans) ? parsed.visitPlans : []);
              setItineraryItems(
                Array.isArray(parsed.itineraryItems) ? parsed.itineraryItems : []
              );
              setCompletedItinerary(
                Array.isArray(parsed.completedItinerary) ? parsed.completedItinerary : []
              );
              setFlightWindows(
                Array.isArray(parsed.flightWindows) ? parsed.flightWindows : []
              );
              setTrackedFlights(
                Array.isArray(parsed.trackedFlights) ? parsed.trackedFlights : []
              );
              setPackingItems(
                Array.isArray(parsed.packingItems) ? parsed.packingItems : []
              );
              setPackedItems(Array.isArray(parsed.packedItems) ? parsed.packedItems : []);
              setBudgetItems(Array.isArray(parsed.budgetItems) ? parsed.budgetItems : []);
              setClosedBudgetTrips(
                Array.isArray(parsed.closedBudgetTrips) ? parsed.closedBudgetTrips : []
              );
              setInitialized(true);
            });
            return;
          }
        }
      } catch {
        // Fall through to empty defaults below.
      }

      const nextData =
        previewMode === "filled" || (isDemoMode && !previewMode)
          ? buildDefaultData("filled")
          : buildDefaultData("blank");

      startTransition(() => {
        setConnections(nextData.connections);
        setJournalEntries(nextData.journalEntries);
        setTimeCapsules(nextData.timeCapsules);
        setCalendarEvents(nextData.calendarEvents);
        setMessages(nextData.messages);
        setCheckInPrompts(nextData.checkInPrompts);
        setVisitPlans(nextData.visitPlans);
        setItineraryItems(nextData.itineraryItems);
        setCompletedItinerary(nextData.completedItinerary);
        setFlightWindows(nextData.flightWindows);
        setTrackedFlights(nextData.trackedFlights);
        setPackingItems(nextData.packingItems);
        setPackedItems(nextData.packedItems);
        setBudgetItems(nextData.budgetItems);
        setClosedBudgetTrips(nextData.closedBudgetTrips);
        setInitialized(true);
      });
    };

    void loadData();
  }, [isDemoMode, previewMode, shouldUseSupabaseState, storageKey, user?.id, userEmail]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    const payload: StoredAppData = {
      connections: withoutSharedConnections(connections),
      journalEntries,
      timeCapsules,
      calendarEvents,
      messages,
      checkInPrompts,
      visitPlans,
      itineraryItems,
      completedItinerary,
      flightWindows,
      trackedFlights,
      packingItems,
      packedItems,
      budgetItems,
      closedBudgetTrips,
    };

    if (shouldUseSupabaseState && user?.id) {
      void saveWorkspaceAppData(user.id, payload).catch(() => {
        // Keep the UI responsive; local fallback still exists for demos.
      });
      return;
    }

    if (!storageKey) {
      return;
    }

    void AsyncStorage.setItem(storageKey, JSON.stringify(payload));
  }, [
    calendarEvents,
    checkInPrompts,
    connections,
    itineraryItems,
    completedItinerary,
    flightWindows,
    trackedFlights,
    packingItems,
    packedItems,
    budgetItems,
    closedBudgetTrips,
    initialized,
    journalEntries,
    messages,
    shouldUseSupabaseState,
    storageKey,
    timeCapsules,
    user?.id,
    visitPlans,
  ]);

  const value = useMemo<AppDataContextValue>(
    () => ({
      initialized,
      connections,
      setConnections,
      journalEntries,
      setJournalEntries,
      timeCapsules,
      setTimeCapsules,
      calendarEvents,
      setCalendarEvents,
      messages,
      setMessages,
      checkInPrompts,
      setCheckInPrompts,
      visitPlans,
      setVisitPlans,
      itineraryItems,
      setItineraryItems,
      completedItinerary,
      setCompletedItinerary,
      flightWindows,
      setFlightWindows,
      trackedFlights,
      setTrackedFlights,
      packingItems,
      setPackingItems,
      packedItems,
      setPackedItems,
      budgetItems,
      setBudgetItems,
      closedBudgetTrips,
      setClosedBudgetTrips,
    }),
    [
      budgetItems,
      calendarEvents,
      checkInPrompts,
      closedBudgetTrips,
      completedItinerary,
      connections,
      flightWindows,
      initialized,
      itineraryItems,
      journalEntries,
      messages,
      packedItems,
      packingItems,
      timeCapsules,
      trackedFlights,
      visitPlans,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const value = useContext(AppDataContext);

  if (!value) {
    throw new Error("useAppData must be used inside AppDataProvider");
  }

  return value;
}
