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
import { readBrowserStorage, writeBrowserStorage } from "../lib/browserStorage";
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
  MoodUpdate,
  PackingItem,
  TimeCapsule,
  VisitPlan,
} from "../types";
import { loadWorkspaceState, saveWorkspaceAppData, type StoredAppData } from "../lib/workspaceState";
import {
  fetchSharedCalendarEvents,
  fetchSharedCheckInPrompts,
  fetchSharedJournalEntries,
  fetchSharedMessages,
  fetchSharedMoodUpdates,
  fetchSharedTimeCapsules,
} from "../lib/sharedContent";
import { fetchSharedConnections, isSharedConnection } from "../lib/sharedRelationships";
import { fetchSharedTripToolkit, fetchSharedVisitPlans } from "../lib/sharedTrips";
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
  moodUpdates: MoodUpdate[];
  setMoodUpdates: React.Dispatch<React.SetStateAction<MoodUpdate[]>>;
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
  persistAppDataNow: (overrides?: Partial<StoredAppData>) => Promise<void>;
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
      moodUpdates: [],
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
    moodUpdates: [],
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

function hasMeaningfulAppData(appData: Partial<StoredAppData> | null | undefined) {
  if (!appData) {
    return false;
  }

  return Boolean(
    appData.connections?.length ||
      appData.journalEntries?.length ||
      appData.timeCapsules?.length ||
      appData.calendarEvents?.length ||
      appData.messages?.length ||
      appData.moodUpdates?.length ||
      appData.checkInPrompts?.length ||
      appData.visitPlans?.length ||
      appData.itineraryItems?.length ||
      appData.completedItinerary?.length ||
      appData.flightWindows?.length ||
      appData.trackedFlights?.length ||
      appData.packingItems?.length ||
      appData.packedItems?.length ||
      appData.budgetItems?.length ||
      appData.closedBudgetTrips?.length
  );
}

function mergeConnections(localConnections: Connection[], sharedConnections: Connection[]) {
  const remainingLocalConnections = [...localConnections];

  sharedConnections.forEach((sharedConnection) => {
    const duplicateLocalIndex = remainingLocalConnections.findIndex(
      (connection) =>
        !isSharedConnection(connection.id) &&
        connection.relationshipType === sharedConnection.relationshipType &&
        connection.name.trim().toLowerCase() === sharedConnection.name.trim().toLowerCase()
    );

    if (duplicateLocalIndex >= 0) {
      remainingLocalConnections.splice(duplicateLocalIndex, 1);
    }
  });

  const byId = new Map<string, Connection>();

  [...remainingLocalConnections, ...sharedConnections].forEach((connection) => {
    byId.set(connection.id, connection);
  });

  return Array.from(byId.values());
}

function withoutSharedConnections(connections: Connection[]) {
  return connections.filter((connection) => !isSharedConnection(connection.id));
}

function mergeById<T extends { id: string }>(localItems: T[], sharedItems: T[]) {
  const byId = new Map<string, T>();
  [...localItems, ...sharedItems].forEach((item) => {
    byId.set(item.id, item);
  });
  return Array.from(byId.values());
}

function withoutRemoteSharedItems<T extends { id: string }>(items: T[]) {
  return items.filter((item) => !item.id.startsWith("remote-"));
}

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const { user, userEmail, previewMode, isDemoMode } = useAuth();
  const storageKey = getStorageKey(userEmail, previewMode);
  const shouldUseSupabaseState = Boolean(user?.id && hasSupabaseCredentials && !previewMode);
  const currentScopeKey = shouldUseSupabaseState && user?.id ? `cloud:${user.id}` : storageKey ?? "anonymous";
  const [initialized, setInitialized] = useState(false);
  const [hydratedScopeKey, setHydratedScopeKey] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [timeCapsules, setTimeCapsules] = useState<TimeCapsule[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [moodUpdates, setMoodUpdates] = useState<MoodUpdate[]>([]);
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

  const buildPayload = (overrides?: Partial<StoredAppData>): StoredAppData => ({
    connections: overrides?.connections ?? withoutSharedConnections(connections),
    journalEntries: overrides?.journalEntries ?? withoutRemoteSharedItems(journalEntries),
    timeCapsules: overrides?.timeCapsules ?? withoutRemoteSharedItems(timeCapsules),
    calendarEvents: overrides?.calendarEvents ?? withoutRemoteSharedItems(calendarEvents),
    messages: overrides?.messages ?? withoutRemoteSharedItems(messages),
    moodUpdates: overrides?.moodUpdates ?? withoutRemoteSharedItems(moodUpdates),
    checkInPrompts: overrides?.checkInPrompts ?? checkInPrompts,
    visitPlans: overrides?.visitPlans ?? withoutRemoteSharedItems(visitPlans),
    itineraryItems: overrides?.itineraryItems ?? withoutRemoteSharedItems(itineraryItems),
    completedItinerary:
      overrides?.completedItinerary ??
      completedItinerary.filter((itemId) => !itemId.startsWith("remote-")),
    flightWindows: overrides?.flightWindows ?? withoutRemoteSharedItems(flightWindows),
    trackedFlights: overrides?.trackedFlights ?? trackedFlights,
    packingItems: overrides?.packingItems ?? withoutRemoteSharedItems(packingItems),
    packedItems:
      overrides?.packedItems ?? packedItems.filter((itemId) => !itemId.startsWith("remote-")),
    budgetItems: overrides?.budgetItems ?? withoutRemoteSharedItems(budgetItems),
    closedBudgetTrips: overrides?.closedBudgetTrips ?? closedBudgetTrips,
  });

  const persistAppDataNow = async (overrides?: Partial<StoredAppData>) => {
    const payload = buildPayload(overrides);

    if (storageKey) {
      writeBrowserStorage(storageKey, JSON.stringify(payload));
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
    }

    if (shouldUseSupabaseState && user?.id) {
      await saveWorkspaceAppData(user.id, payload);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setHydratedScopeKey(null);
      setInitialized(false);

      try {
        if (shouldUseSupabaseState && user?.id) {
          const [sharedConnections, sharedMessages, sharedJournalEntries, sharedTimeCapsules, sharedCalendarEvents, sharedCheckInPrompts, sharedMoodUpdates, sharedVisitPlans, sharedTripToolkit] =
            await Promise.all([
              fetchSharedConnections(user.id).catch(() => []),
              fetchSharedMessages(user.id).catch(() => []),
              fetchSharedJournalEntries(user.id).catch(() => []),
              fetchSharedTimeCapsules(user.id).catch(() => []),
              fetchSharedCalendarEvents(user.id).catch(() => []),
              fetchSharedCheckInPrompts(user.id).catch(() => []),
              fetchSharedMoodUpdates(user.id).catch(() => []),
              fetchSharedVisitPlans(user.id).catch(() => []),
              fetchSharedTripToolkit(user.id).catch(() => ({
                itineraryItems: [],
                completedItinerary: [],
                flightWindows: [],
                packingItems: [],
                packedItems: [],
                budgetItems: [],
                closedBudgetTrips: [],
              })),
            ]);
          const [workspace, savedValue] = await Promise.all([
            loadWorkspaceState(user.id),
            storageKey ? AsyncStorage.getItem(storageKey) : Promise.resolve(null),
          ]);
          const browserSavedValue = readBrowserStorage(storageKey);
          const localParsed = browserSavedValue
            ? (JSON.parse(browserSavedValue) as Partial<StoredAppData>)
            : savedValue
              ? (JSON.parse(savedValue) as Partial<StoredAppData>)
              : null;
          const parsed = hasMeaningfulAppData(workspace?.app_data)
            ? workspace?.app_data
            : localParsed;

          if (parsed) {
            const localConnections = Array.isArray(parsed.connections)
              ? (parsed.connections as Connection[])
              : [];
            startTransition(() => {
              setConnections(mergeConnections(localConnections, sharedConnections));
              setJournalEntries(
                mergeById(
                  Array.isArray(parsed.journalEntries) ? (parsed.journalEntries as JournalEntry[]) : [],
                  sharedJournalEntries
                )
              );
              setTimeCapsules(
                mergeById(
                  Array.isArray(parsed.timeCapsules) ? (parsed.timeCapsules as TimeCapsule[]) : [],
                  sharedTimeCapsules
                )
              );
              setCalendarEvents(
                mergeById(
                  Array.isArray(parsed.calendarEvents) ? (parsed.calendarEvents as CalendarEvent[]) : [],
                  sharedCalendarEvents
                )
              );
              setMessages(
                mergeById(
                  Array.isArray(parsed.messages) ? (parsed.messages as Message[]) : [],
                  sharedMessages
                )
              );
              setMoodUpdates(
                mergeById(
                  Array.isArray(parsed.moodUpdates) ? (parsed.moodUpdates as MoodUpdate[]) : [],
                  sharedMoodUpdates
                )
              );
              setCheckInPrompts(
                mergeById(
                  Array.isArray(parsed.checkInPrompts)
                    ? (parsed.checkInPrompts as CheckInPrompt[])
                    : [],
                  sharedCheckInPrompts
                )
              );
              setVisitPlans(
                mergeById(
                  Array.isArray(parsed.visitPlans) ? (parsed.visitPlans as VisitPlan[]) : [],
                  sharedVisitPlans
                )
              );
              setItineraryItems(
                mergeById(
                  Array.isArray(parsed.itineraryItems) ? (parsed.itineraryItems as ItineraryItem[]) : [],
                  sharedTripToolkit.itineraryItems
                )
              );
              setCompletedItinerary(
                Array.from(
                  new Set([
                    ...(Array.isArray(parsed.completedItinerary) ? parsed.completedItinerary : []),
                    ...sharedTripToolkit.completedItinerary,
                  ])
                )
              );
              setFlightWindows(
                mergeById(
                  Array.isArray(parsed.flightWindows) ? (parsed.flightWindows as FlightWindow[]) : [],
                  sharedTripToolkit.flightWindows
                )
              );
              setTrackedFlights(
                Array.isArray(parsed.trackedFlights)
                  ? (parsed.trackedFlights as FlightTrackerEntry[])
                  : []
              );
              setPackingItems(
                mergeById(
                  Array.isArray(parsed.packingItems) ? (parsed.packingItems as PackingItem[]) : [],
                  sharedTripToolkit.packingItems
                )
              );
              setPackedItems(
                Array.from(
                  new Set([
                    ...(Array.isArray(parsed.packedItems) ? parsed.packedItems : []),
                    ...sharedTripToolkit.packedItems,
                  ])
                )
              );
              setBudgetItems(
                mergeById(
                  Array.isArray(parsed.budgetItems) ? (parsed.budgetItems as BudgetItem[]) : [],
                  sharedTripToolkit.budgetItems
                )
              );
              setClosedBudgetTrips(
                Array.from(
                  new Set([
                    ...(Array.isArray(parsed.closedBudgetTrips) ? parsed.closedBudgetTrips : []),
                    ...sharedTripToolkit.closedBudgetTrips,
                  ])
                )
              );
              setHydratedScopeKey(currentScopeKey);
              setInitialized(true);
            });
            return;
          }

          const blankWorkspace = buildDefaultData("blank");
          startTransition(() => {
            setConnections(mergeConnections(blankWorkspace.connections, sharedConnections));
            setJournalEntries(mergeById(blankWorkspace.journalEntries, sharedJournalEntries));
            setTimeCapsules(mergeById(blankWorkspace.timeCapsules, sharedTimeCapsules));
            setCalendarEvents(mergeById(blankWorkspace.calendarEvents, sharedCalendarEvents));
            setMessages(mergeById(blankWorkspace.messages, sharedMessages));
            setMoodUpdates(mergeById(blankWorkspace.moodUpdates, sharedMoodUpdates));
            setCheckInPrompts(mergeById(blankWorkspace.checkInPrompts, sharedCheckInPrompts));
            setVisitPlans(mergeById(blankWorkspace.visitPlans, sharedVisitPlans));
            setItineraryItems(mergeById(blankWorkspace.itineraryItems, sharedTripToolkit.itineraryItems));
            setCompletedItinerary(
              Array.from(new Set([...blankWorkspace.completedItinerary, ...sharedTripToolkit.completedItinerary]))
            );
            setFlightWindows(mergeById(blankWorkspace.flightWindows, sharedTripToolkit.flightWindows));
            setTrackedFlights(blankWorkspace.trackedFlights);
            setPackingItems(mergeById(blankWorkspace.packingItems, sharedTripToolkit.packingItems));
            setPackedItems(Array.from(new Set([...blankWorkspace.packedItems, ...sharedTripToolkit.packedItems])));
            setBudgetItems(mergeById(blankWorkspace.budgetItems, sharedTripToolkit.budgetItems));
            setClosedBudgetTrips(
              Array.from(new Set([...blankWorkspace.closedBudgetTrips, ...sharedTripToolkit.closedBudgetTrips]))
            );
            setHydratedScopeKey(currentScopeKey);
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
              setMoodUpdates(Array.isArray(parsed.moodUpdates) ? parsed.moodUpdates : []);
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
              setHydratedScopeKey(currentScopeKey);
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
        setMoodUpdates(nextData.moodUpdates);
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
        setHydratedScopeKey(currentScopeKey);
        setInitialized(true);
      });
    };

    void loadData();
  }, [currentScopeKey, isDemoMode, previewMode, shouldUseSupabaseState, storageKey, user?.id, userEmail]);

  useEffect(() => {
    if (!initialized || hydratedScopeKey !== currentScopeKey) {
      return;
    }

    const payload = buildPayload();

    if (shouldUseSupabaseState && user?.id) {
      if (storageKey) {
        writeBrowserStorage(storageKey, JSON.stringify(payload));
        void AsyncStorage.setItem(storageKey, JSON.stringify(payload));
      }
      void saveWorkspaceAppData(user.id, payload).catch(() => {
        // Keep the UI responsive; local fallback still exists for demos.
      });
      return;
    }

    if (!storageKey) {
      return;
    }

    writeBrowserStorage(storageKey, JSON.stringify(payload));
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
    moodUpdates,
    shouldUseSupabaseState,
    storageKey,
    hydratedScopeKey,
    currentScopeKey,
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
      moodUpdates,
      setMoodUpdates,
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
      persistAppDataNow,
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
      moodUpdates,
      packedItems,
      persistAppDataNow,
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
