import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { CalendarRangePicker } from "../../components/ui/CalendarRangePicker";
import { FilterChip } from "../../components/ui/FilterChip";
import { MultiSelectDropdown } from "../../components/ui/MultiSelectDropdown";
import { ScreenSurface } from "../../components/ui/ScreenSurface";
import { SectionCard } from "../../components/ui/SectionCard";
import { hasSupabaseCredentials } from "../../config/env";
import {
  budgetSuggestions,
  cityWeatherForecasts,
  tripToolkit,
} from "../../data/mockData";
import { locationDirectory } from "../../data/locationDirectory";
import {
  formatDateRange,
  buildDateRangeValues,
  inputValueToDisplayDate,
  getMonthNames,
  parseDateValue,
} from "../../lib/dateHelpers";
import { isSharedConnection } from "../../lib/sharedRelationships";
import { deleteSharedVisitPlan, saveSharedVisitPlan } from "../../lib/sharedTrips";
import { useAppData } from "../../providers/AppDataProvider";
import { useAuth } from "../../providers/AuthProvider";
import { useProfile } from "../../providers/ProfileProvider";
import { BudgetItem, FlightLeg, ItineraryItem, VisitPlan } from "../../types";
import { palette } from "../../theme/palette";
import { typography } from "../../theme/typography";

const budgetCategories = [
  "Food",
  "Transport",
  "Activities",
  "Stay",
  "Shopping",
  "Gifts",
  "Other",
];

const monthNames = getMonthNames();
type ToolkitSectionKey = "flightDates" | "weather" | "packing" | "budget";
type BudgetStarterIdea = {
  id: string;
  label: string;
  category: string;
  helper: string;
};
type ParsedItineraryEvent = {
  item: ItineraryItem;
  startMinutes: number;
  endMinutes: number;
};

const toolkitSectionById: Record<string, ToolkitSectionKey> = {
  "toolkit-1": "flightDates",
  "toolkit-2": "weather",
  "toolkit-3": "packing",
  "toolkit-4": "budget",
};

function buildTimeOptions() {
  const options: string[] = [];

  for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const suffix = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    options.push(`${hours12}:${String(mins).padStart(2, "0")} ${suffix}`);
  }

  return options;
}

const itineraryTimeOptions = buildTimeOptions();

function getDaysAway(dateValue: string) {
  const tripDate = new Date(`${dateValue}T12:00:00`);
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    12,
    0,
    0
  );

  return Math.max(
    0,
    Math.ceil((tripDate.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24))
  );
}

function getTemperatureDisplay(
  temperatureRange: string,
  unit: "fahrenheit" | "celsius"
) {
  const [range = "0-0"] = temperatureRange.trim().split(" ");
  const [lowText = "0", highText = "0"] = range.split("-");
  const lowFahrenheit = Number.parseInt(lowText, 10);
  const highFahrenheit = Number.parseInt(highText, 10);

  if (Number.isNaN(lowFahrenheit) || Number.isNaN(highFahrenheit)) {
    return temperatureRange;
  }

  if (unit === "celsius") {
    const lowCelsius = Math.round(((lowFahrenheit - 32) * 5) / 9);
    const highCelsius = Math.round(((highFahrenheit - 32) * 5) / 9);

    return `${lowCelsius}-${highCelsius}\u00B0C`;
  }

  return `${lowFahrenheit}-${highFahrenheit}\u00B0F`;
}

function buildFallbackForecast(city: string) {
  const normalizedCity = city.toLowerCase();

  if (normalizedCity.includes("texas") || normalizedCity.includes("dallas") || normalizedCity.includes("fort worth") || normalizedCity.includes("austin")) {
    return {
      icon: "⛅",
      summary: "Warm days with room for one breezy or rainy shift.",
      temperatureRange: "68-84 F",
      packingNote: "Bring light layers and one flexible weather layer.",
    };
  }

  if (normalizedCity.includes("san francisco") || normalizedCity.includes("san diego") || normalizedCity.includes("los angeles") || normalizedCity.includes("california")) {
    return {
      icon: "🌤",
      summary: "Coastal swings between sunny stretches and cooler evenings.",
      temperatureRange: "58-72 F",
      packingNote: "Pack a light jacket for the evening and comfortable shoes.",
    };
  }

  if (normalizedCity.includes("new york") || normalizedCity.includes("washington") || normalizedCity.includes("chicago") || normalizedCity.includes("boston")) {
    return {
      icon: "🌥",
      summary: "Mild daytime weather with a cooler breeze after sunset.",
      temperatureRange: "55-74 F",
      packingNote: "Layer for transit, evening walks, and indoor-outdoor plans.",
    };
  }

  if (normalizedCity.includes("hanoi") || normalizedCity.includes("ho chi minh") || normalizedCity.includes("singapore") || normalizedCity.includes("bangkok")) {
    return {
      icon: "🌦",
      summary: "Warm, humid weather with a chance of quick rain later in the day.",
      temperatureRange: "76-91 F",
      packingNote: "Bring breathable outfits, a compact umbrella, and easy shoes.",
    };
  }

  return {
    icon: "🌤",
    summary: "A balanced forecast placeholder while you keep refining the trip details.",
    temperatureRange: "60-78 F",
    packingNote: "Pack one light layer and build from the trip plan as needed.",
  };
}

function getParticipantNamesFromConnections(
  connections: Array<{ id: string; name: string }>,
  participantIds: string[]
) {
  return connections
    .filter((connection) => participantIds.includes(connection.id))
    .map((connection) => connection.name);
}

function parseClockValue(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2] ?? "0", 10);
  const suffix = match[3].toLowerCase();

  if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
    return null;
  }

  const normalizedHours = hours % 12 + (suffix === "pm" ? 12 : 0);
  return normalizedHours * 60 + minutes;
}

function inferTimeWindow(
  rawValue: string,
  title: string,
  detail: string
): { startMinutes: number; endMinutes: number } | null {
  const value = rawValue.trim().toLowerCase();
  const combined = `${value} ${title.toLowerCase()} ${detail.toLowerCase()}`;

  if (combined.includes("breakfast") || combined.includes("coffee")) {
    return { startMinutes: 9 * 60, endMinutes: 10 * 60 + 30 };
  }

  if (combined.includes("brunch")) {
    return { startMinutes: 10 * 60 + 30, endMinutes: 12 * 60 };
  }

  if (combined.includes("lunch") || combined.includes("noon")) {
    return { startMinutes: 12 * 60, endMinutes: 13 * 60 + 30 };
  }

  if (combined.includes("afternoon")) {
    return { startMinutes: 14 * 60, endMinutes: 16 * 60 + 30 };
  }

  if (combined.includes("sunset") || combined.includes("golden hour")) {
    return { startMinutes: 18 * 60, endMinutes: 19 * 60 + 30 };
  }

  if (combined.includes("dinner") || combined.includes("evening")) {
    return { startMinutes: 18 * 60 + 30, endMinutes: 20 * 60 + 30 };
  }

  if (combined.includes("night")) {
    return { startMinutes: 20 * 60, endMinutes: 22 * 60 };
  }

  if (combined.includes("morning")) {
    return { startMinutes: 9 * 60, endMinutes: 11 * 60 };
  }

  return null;
}

function parseItineraryEvent(item: ItineraryItem) {
  if (item.startTime) {
    const parsedStart = parseClockValue(item.startTime);
    const parsedEnd = item.endTime ? parseClockValue(item.endTime) : null;

    if (parsedStart !== null) {
      return {
        startMinutes: parsedStart,
        endMinutes: parsedEnd !== null && parsedEnd > parsedStart ? parsedEnd : parsedStart + 90,
      };
    }
  }

  const timeLabel = item.time;
  const title = item.title;
  const detail = item.detail;
  const normalized = timeLabel.replace(/\u2013/g, "-").replace(/\s+to\s+/gi, "-");
  const [startText, endText] = normalized.split("-").map((part) => part.trim());
  const parsedStart = startText ? parseClockValue(startText) : null;
  const parsedEnd = endText ? parseClockValue(endText) : null;

  if (parsedStart !== null) {
    const endMinutes =
      parsedEnd !== null && parsedEnd > parsedStart ? parsedEnd : parsedStart + 90;

    return {
      startMinutes: parsedStart,
      endMinutes,
    };
  }

  return inferTimeWindow(timeLabel, title, detail);
}

function formatTimelineHour(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;

  return `${normalizedHour} ${suffix}`;
}

function formatTripDayLabel(dateValue: string) {
  const date = parseDateValue(dateValue);

  if (!date) {
    return dateValue;
  }

  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function TripsScreen() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { width } = useWindowDimensions();
  const {
    connections,
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
  } = useAppData();
  const liveConnections = connections;
  const trips = visitPlans;
  const activeTrips = useMemo(() => trips.filter((trip) => !trip.archived), [trips]);
  const archivedTrips = useMemo(() => trips.filter((trip) => trip.archived), [trips]);
  const orderedActiveTrips = useMemo(
    () =>
      [...activeTrips].sort((left, right) => {
        const leftDate = parseDateValue(left.startDate);
        const rightDate = parseDateValue(right.startDate);

        if (!leftDate || !rightDate) {
          return left.title.localeCompare(right.title);
        }

        return leftDate.getTime() - rightDate.getTime();
      }),
    [activeTrips]
  );
  const initialTrips = trips;
  const initialSelectedTrip = initialTrips[0];
  const [selectedTripId, setSelectedTripId] = useState(initialTrips[0]?.id ?? "");
  const [isCreatingTrip, setIsCreatingTrip] = useState(!initialSelectedTrip);
  const [tripEditorVisible, setTripEditorVisible] = useState(!initialSelectedTrip);
  const [tripDraftTitle, setTripDraftTitle] = useState(initialTrips[0]?.title ?? "");
  const [tripDraftLocation, setTripDraftLocation] = useState(initialTrips[0]?.location ?? "");
  const [tripDraftStartDate, setTripDraftStartDate] = useState(
    initialTrips[0]?.startDate ?? ""
  );
  const [tripDraftEndDate, setTripDraftEndDate] = useState(
    initialTrips[0]?.endDate ?? ""
  );
  const [tripDraftPlan, setTripDraftPlan] = useState(initialTrips[0]?.plan ?? "");
  const [tripDraftParticipantIds, setTripDraftParticipantIds] = useState<string[]>(
    initialTrips[0]?.participantIds ?? []
  );
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const initialDate = parseDateValue(initialTrips[0]?.startDate ?? "");

    return initialDate
      ? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12, 0, 0)
      : new Date();
  });
  const [selectedFlightTrip, setSelectedFlightTrip] = useState(
    initialTrips[0]?.location ?? ""
  );
  const [draftFlightStartDate, setDraftFlightStartDate] = useState("");
  const [draftFlightEndDate, setDraftFlightEndDate] = useState("");
  const [flightCalendarMonth, setFlightCalendarMonth] = useState(() => {
    const initialDate = parseDateValue(initialTrips[0]?.startDate ?? "");

    return initialDate
      ? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12, 0, 0)
      : new Date();
  });
  const [draftFlightPrice, setDraftFlightPrice] = useState("");
  const [draftFlightNote, setDraftFlightNote] = useState("");
  const [selectedTrackedFlightTrip, setSelectedTrackedFlightTrip] = useState(
    initialTrips[0]?.location ?? ""
  );
  const [draftTrackedFlightConnectionId, setDraftTrackedFlightConnectionId] = useState(
    liveConnections[0]?.id ?? ""
  );
  const [draftTrackedFlightDirection, setDraftTrackedFlightDirection] = useState<
    "arrival" | "departure"
  >("arrival");
  const [draftTrackedFlightDate, setDraftTrackedFlightDate] = useState("");
  const [trackerCalendarMonth, setTrackerCalendarMonth] = useState(() => {
    const initialDate = parseDateValue(initialTrips[0]?.startDate ?? "");

    return initialDate
      ? new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 12, 0, 0)
      : new Date();
  });
  const [draftTrackedFlightCode, setDraftTrackedFlightCode] = useState("");
  const [draftTrackedFlightRouteNote, setDraftTrackedFlightRouteNote] = useState("");
  const [draftTrackedFlightLegs, setDraftTrackedFlightLegs] = useState<FlightLeg[]>([]);
  const [openTrackedFlightPersonMenu, setOpenTrackedFlightPersonMenu] = useState(false);
  const [openTrackedFlightDirectionMenu, setOpenTrackedFlightDirectionMenu] = useState(false);
  const [selectedVisitTitle, setSelectedVisitTitle] = useState(initialTrips[0]?.title ?? "");
  const [selectedItineraryDate, setSelectedItineraryDate] = useState(
    initialTrips[0]?.startDate ?? ""
  );
  const [draftItineraryStartTime, setDraftItineraryStartTime] = useState("9:00 AM");
  const [draftItineraryEndTime, setDraftItineraryEndTime] = useState("10:30 AM");
  const [openItineraryStartTimeMenu, setOpenItineraryStartTimeMenu] = useState(false);
  const [openItineraryEndTimeMenu, setOpenItineraryEndTimeMenu] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDetail, setDraftDetail] = useState("");
  const [selectedPackingTrip, setSelectedPackingTrip] = useState(
    initialTrips[0]?.location ?? "Any trip"
  );
  const [draftPackingLabel, setDraftPackingLabel] = useState("");
  const [selectedBudgetTrip, setSelectedBudgetTrip] = useState(
    initialTrips[0]?.location ?? ""
  );
  const [draftBudgetLabel, setDraftBudgetLabel] = useState("");
  const [draftBudgetCategory, setDraftBudgetCategory] = useState("");
  const [draftBudgetPayer, setDraftBudgetPayer] = useState("");
  const [draftBudgetAmount, setDraftBudgetAmount] = useState("");
  const [openBudgetCategoryMenu, setOpenBudgetCategoryMenu] = useState<string | null>(null);
  const [openBudgetPayerMenu, setOpenBudgetPayerMenu] = useState<string | null>(null);
  const [temperatureUnit, setTemperatureUnit] = useState<"fahrenheit" | "celsius">(
    "fahrenheit"
  );
  const tripsScrollRef = useRef<ScrollView | null>(null);
  const toolkitSectionOffsets = useRef<Partial<Record<ToolkitSectionKey, number>>>({});
  const toolkitCardOffset = useRef(0);
  const toolkitBodyOffset = useRef(0);
  const [openCalendarPicker, setOpenCalendarPicker] = useState<
    "trip" | "flight" | "tracker" | null
  >(null);
  const [openTripParticipantMenu, setOpenTripParticipantMenu] = useState(false);

  const isEditingExistingTrip = !isCreatingTrip && selectedTripId !== "";
  const isWideLayout = width >= 1080;

  const registerToolkitSection = (section: ToolkitSectionKey, y: number) => {
    toolkitSectionOffsets.current[section] = y;
  };

  const jumpToToolkitSection = (section: ToolkitSectionKey) => {
    const localOffset = toolkitSectionOffsets.current[section];

    if (typeof localOffset !== "number") {
      return;
    }

    const offset = toolkitCardOffset.current + toolkitBodyOffset.current + localOffset;

    tripsScrollRef.current?.scrollTo({
      y: Math.max(offset - 28, 0),
      animated: true,
    });
  };
  const tripLocationSuggestions = useMemo(() => {
    const query = tripDraftLocation.trim().toLowerCase();

    if (!query) {
      return [];
    }

    return locationDirectory
      .filter((location) => location.label.toLowerCase().includes(query))
      .slice(0, 6);
  }, [tripDraftLocation]);

  const tripLocationMatch = useMemo(
    () =>
      locationDirectory.find(
        (location) => location.label.toLowerCase() === tripDraftLocation.trim().toLowerCase()
      ),
    [tripDraftLocation]
  );
  const tripDraftDateSummary = useMemo(
    () =>
      tripDraftStartDate
        ? formatDateRange(tripDraftStartDate, tripDraftEndDate)
        : "Choose a trip date from the calendar",
    [tripDraftEndDate, tripDraftStartDate]
  );
  const draftFlightDateSummary = useMemo(
    () =>
      draftFlightStartDate
        ? formatDateRange(draftFlightStartDate, draftFlightEndDate)
        : "Choose a flexible fare window",
    [draftFlightEndDate, draftFlightStartDate]
  );
  const draftTrackedFlightDateSummary = useMemo(
    () =>
      draftTrackedFlightDate
        ? formatDateRange(draftTrackedFlightDate)
        : "Choose a flight day from the calendar",
    [draftTrackedFlightDate]
  );

  const visibleItinerary = useMemo(
    () => itineraryItems.filter((item) => item.visitTitle === selectedVisitTitle),
    [itineraryItems, selectedVisitTitle]
  );
  const selectedVisitPlan = useMemo(
    () => orderedActiveTrips.find((trip) => trip.title === selectedVisitTitle) ?? null,
    [orderedActiveTrips, selectedVisitTitle]
  );
  const itineraryDateOptions = useMemo(
    () =>
      selectedVisitPlan
        ? buildDateRangeValues(selectedVisitPlan.startDate, selectedVisitPlan.endDate)
        : [],
    [selectedVisitPlan]
  );
  const activeItineraryDate =
    selectedItineraryDate || itineraryDateOptions[0] || selectedVisitPlan?.startDate || "";
  const parsedItinerary = useMemo(() => {
    const scheduled: ParsedItineraryEvent[] = [];
    const unscheduled: typeof visibleItinerary = [];

    visibleItinerary
      .filter((item) => {
        if (!activeItineraryDate) {
          return true;
        }

        return (item.dateValue ?? selectedVisitPlan?.startDate ?? "") === activeItineraryDate;
      })
      .forEach((item) => {
      const parsed = parseItineraryEvent(item);

      if (!parsed) {
        unscheduled.push(item);
        return;
      }

      scheduled.push({
        item,
        startMinutes: parsed.startMinutes,
        endMinutes: parsed.endMinutes,
      });
    });

    scheduled.sort((left, right) => left.startMinutes - right.startMinutes);

    const defaultStartHour = 8;
    const defaultEndHour = 22;
    const earliestHour = scheduled.length
      ? Math.max(defaultStartHour, Math.floor(scheduled[0].startMinutes / 60) - 1)
      : defaultStartHour;
    const latestMinutes = scheduled.length
      ? Math.max(...scheduled.map((entry) => entry.endMinutes))
      : defaultEndHour * 60;
    const latestHour = Math.max(defaultEndHour, Math.ceil(latestMinutes / 60) + 1);
    const hours = Array.from(
      { length: latestHour - earliestHour + 1 },
      (_, index) => earliestHour + index
    );

    return {
      scheduled,
      unscheduled,
      earliestHour,
      latestHour,
      hours,
    };
  }, [activeItineraryDate, selectedVisitPlan?.startDate, visibleItinerary]);

  const visiblePackingItems = useMemo(
    () => packingItems.filter((item) => item.trip === selectedPackingTrip),
    [packingItems, selectedPackingTrip]
  );

  const visibleFlightWindows = useMemo(
    () => flightWindows.filter((item) => item.trip === selectedFlightTrip),
    [flightWindows, selectedFlightTrip]
  );
  const visibleTrackedFlights = useMemo(
    () => trackedFlights.filter((item) => item.trip === selectedTrackedFlightTrip),
    [trackedFlights, selectedTrackedFlightTrip]
  );

  const visibleBudgetItems = useMemo(
    () => budgetItems.filter((item) => item.trip === selectedBudgetTrip),
    [budgetItems, selectedBudgetTrip]
  );

  const budgetTotal = useMemo(
    () =>
      visibleBudgetItems.reduce(
        (total, item) => total + (Number.isFinite(item.amount) ? item.amount : 0),
        0
      ),
    [visibleBudgetItems]
  );

  const visibleBudgetSuggestions = useMemo(
    () => budgetSuggestions.filter((item) => item.trip === selectedBudgetTrip),
    [selectedBudgetTrip]
  );
  const selectedBudgetPlan = useMemo(
    () => orderedActiveTrips.find((trip) => trip.location === selectedBudgetTrip) ?? null,
    [orderedActiveTrips, selectedBudgetTrip]
  );
  const budgetPayerOptions = useMemo(() => {
    const participantNames = selectedBudgetPlan
      ? getParticipantNamesFromConnections(liveConnections, selectedBudgetPlan.participantIds)
      : [];

    return Array.from(
      new Set([
        "You",
        ...participantNames,
        "Split",
      ].filter(Boolean))
    );
  }, [selectedBudgetPlan, liveConnections]);
  const budgetStarterIdeas = useMemo<BudgetStarterIdea[]>(() => {
    const cityName = selectedBudgetTrip.split(",")[0] || "Trip";
    const normalizedTrip = `${selectedBudgetTrip} ${selectedBudgetPlan?.title ?? ""} ${
      selectedBudgetPlan?.plan ?? ""
    }`.toLowerCase();

    if (normalizedTrip.includes("yosemite")) {
      return [
        {
          id: "starter-yosemite-gas",
          label: "Yosemite gas split",
          category: "Transport",
          helper: "Useful for longer drives, park routes, or shared rental mileage.",
        },
        {
          id: "starter-yosemite-entry",
          label: "Park entry or day-use fee",
          category: "Activities",
          helper: "Good for entry fees, shuttle add-ons, or scenic stops.",
        },
        {
          id: "starter-yosemite-groceries",
          label: "Cabin groceries and snacks",
          category: "Food",
          helper: "Helpful for breakfast runs, trail snacks, and shared meals.",
        },
        {
          id: "starter-yosemite-coffee",
          label: "Coffee and road-trip treats",
          category: "Food",
          helper: "A good catch-all for cafe stops on the drive in or out.",
        },
      ];
    }

    if (normalizedTrip.includes("new york")) {
      return [
        {
          id: "starter-nyc-subway",
          label: "Subway or transit taps",
          category: "Transport",
          helper: "Perfect for train rides, ferries, or getting across neighborhoods.",
        },
        {
          id: "starter-nyc-snacks",
          label: "Chinatown snack crawl",
          category: "Food",
          helper: "Great for food crawls, pastries, boba, or casual bites.",
        },
        {
          id: "starter-nyc-activity",
          label: "Museum or date tickets",
          category: "Activities",
          helper: "Works for galleries, rowing, comedy, or ticketed plans.",
        },
        {
          id: "starter-nyc-home",
          label: "Home supplies or IKEA stop",
          category: "Shopping",
          helper: "Useful for design-store runs, gifts, or little apartment things.",
        },
      ];
    }

    if (normalizedTrip.includes("san francisco")) {
      return [
        {
          id: "starter-sf-coffee",
          label: "Bakery or coffee run",
          category: "Food",
          helper: "Good for a slow morning together or a quick neighborhood stop.",
        },
        {
          id: "starter-sf-muni",
          label: "Muni, rideshare, or parking",
          category: "Transport",
          helper: "Helpful for city transit, airport rides, or bridge parking.",
        },
        {
          id: "starter-sf-family",
          label: "Family dinner share",
          category: "Food",
          helper: "Great for splitting a bigger meal or picking up dessert on the way.",
        },
        {
          id: "starter-sf-weekend",
          label: "Weekend activity tickets",
          category: "Activities",
          helper: "Use for museums, ferries, local events, or Yosemite planning.",
        },
      ];
    }

    if (normalizedTrip.includes("austin")) {
      return [
        {
          id: "starter-austin-brunch",
          label: "Brunch or taco stop",
          category: "Food",
          helper: "Good for coffee, breakfast tacos, or late lunch together.",
        },
        {
          id: "starter-austin-parking",
          label: "Parking or rideshare",
          category: "Transport",
          helper: "Helpful for downtown parking, airport rides, or long-distance pickups.",
        },
        {
          id: "starter-austin-music",
          label: "Live music or cover fee",
          category: "Activities",
          helper: "Works for shows, small venues, or casual date-night plans.",
        },
        {
          id: "starter-austin-snacks",
          label: "Late-night snacks",
          category: "Food",
          helper: "Nice for dessert runs, food trucks, or after-dinner cravings.",
        },
      ];
    }

    if (normalizedTrip.includes("fort worth")) {
      return [
        {
          id: "starter-fw-coffee",
          label: `${cityName} coffee date`,
          category: "Food",
          helper: "A natural catch-all for slow starts, pastries, or cafe hangs.",
        },
        {
          id: "starter-fw-museum",
          label: "Museum tickets",
          category: "Activities",
          helper: "Perfect for Kimbell, exhibits, or other ticketed art plans.",
        },
        {
          id: "starter-fw-garden",
          label: "Garden or parking fee",
          category: "Transport",
          helper: "Helpful for parking, entry, or the little logistics around a day out.",
        },
        {
          id: "starter-fw-dinner",
          label: "Dinner or handroll stop",
          category: "Food",
          helper: "Use for barbecue, sashimi, dessert, or a nicer dinner plan.",
        },
      ];
    }

    return [
      {
        id: "starter-coffee",
        label: `${cityName} coffee stop`,
        category: "Food",
        helper: "Good for small cafe runs, snacks, or dessert.",
      },
      {
        id: "starter-transport",
        label: "Ride share or parking",
        category: "Transport",
        helper: "Use this for airport rides, gas, tolls, or parking.",
      },
      {
        id: "starter-activity",
        label: "Museum or activity tickets",
        category: "Activities",
        helper: "Helpful for galleries, tours, games, or event tickets.",
      },
      {
        id: "starter-groceries",
        label: "Groceries for the trip",
        category: "Food",
        helper: "Works well for snacks, breakfast runs, or shared home meals.",
      },
    ];
  }, [selectedBudgetPlan, selectedBudgetTrip]);

  const visibleWeatherForecasts = useMemo(
    () =>
      Array.from(new Set(activeTrips.map((trip) => trip.location)))
        .filter(Boolean)
        .map((city) => {
          const seedForecast = cityWeatherForecasts.find((forecast) => forecast.city === city);

          if (seedForecast) {
            return seedForecast;
          }

          const fallback = buildFallbackForecast(city);
          return {
            id: `weather-${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            city,
            ...fallback,
          };
        }),
    [activeTrips]
  );

  const isBudgetClosed = closedBudgetTrips.includes(selectedBudgetTrip);
  const trackedFlightPersonName =
    liveConnections.find((connection) => connection.id === draftTrackedFlightConnectionId)?.name ??
    "Choose person";
  const selectedTrip = trips.find((trip) => trip.id === selectedTripId) ?? null;
  const isSharedTrip = Boolean(selectedTrip?.id.startsWith("remote-visit-"));
  const hasSharedTripParticipant = (participantIds: string[]) =>
    participantIds.some((participantId) => isSharedConnection(participantId));

  const persistSharedTripToolkit = async (input: {
    tripId?: string;
    tripTitle?: string;
    tripLocation?: string;
    itineraryItems?: typeof itineraryItems;
    completedItinerary?: typeof completedItinerary;
    flightWindows?: typeof flightWindows;
    packingItems?: typeof packingItems;
    packedItems?: typeof packedItems;
    budgetItems?: typeof budgetItems;
    closedBudgetTrips?: typeof closedBudgetTrips;
  }) => {
    if (!user?.id || !hasSupabaseCredentials) {
      return;
    }

    const sharedTrip =
      (input.tripId
        ? trips.find((trip) => trip.id === input.tripId)
        : null) ??
      trips.find(
        (trip) =>
          trip.id.startsWith("remote-visit-") &&
          ((input.tripTitle && trip.title === input.tripTitle) ||
            (input.tripLocation && trip.location === input.tripLocation))
      );

    if (!sharedTrip || !sharedTrip.id.startsWith("remote-visit-")) {
      return;
    }

    const nextItineraryItems = input.itineraryItems ?? itineraryItems;
    const nextCompletedItinerary = input.completedItinerary ?? completedItinerary;
    const nextFlightWindows = input.flightWindows ?? flightWindows;
    const nextPackingItems = input.packingItems ?? packingItems;
    const nextPackedItems = input.packedItems ?? packedItems;
    const nextBudgetItems = input.budgetItems ?? budgetItems;
    const nextClosedBudgetTrips = input.closedBudgetTrips ?? closedBudgetTrips;
    const relevantItineraryItems = nextItineraryItems.filter(
      (item) => item.visitTitle === sharedTrip.title
    );
    const relevantItineraryIds = new Set(relevantItineraryItems.map((item) => item.id));
    const relevantPackingItems = nextPackingItems.filter(
      (item) => item.trip === sharedTrip.location
    );
    const relevantPackingIds = new Set(relevantPackingItems.map((item) => item.id));

    await saveSharedVisitPlan({
      userId: user.id,
      trip: sharedTrip,
      itineraryItems: relevantItineraryItems,
      completedItinerary: nextCompletedItinerary.filter((id) =>
        relevantItineraryIds.has(id)
      ),
      flightWindows: nextFlightWindows.filter((item) => item.trip === sharedTrip.location),
      packingItems: relevantPackingItems,
      packedItems: nextPackedItems.filter((id) => relevantPackingIds.has(id)),
      budgetItems: nextBudgetItems.filter((item) => item.trip === sharedTrip.location),
      budgetClosed: nextClosedBudgetTrips.includes(sharedTrip.location),
    });
  };

  const toggleItinerary = (id: string) => {
    const nextCompletedItinerary = completedItinerary.includes(id)
      ? completedItinerary.filter((item) => item !== id)
      : [...completedItinerary, id];

    setCompletedItinerary(nextCompletedItinerary);
    void persistSharedTripToolkit({
      tripTitle: selectedVisitTitle,
      completedItinerary: nextCompletedItinerary,
    });
  };

  const addItineraryItem = () => {
    const title = draftTitle.trim();
    const detail = draftDetail.trim();
    const startTime = draftItineraryStartTime.trim();
    const endTime = draftItineraryEndTime.trim();
    const selectedDate = activeItineraryDate.trim();
    const startMinutes = parseClockValue(startTime);
    const endMinutes = parseClockValue(endTime);

    if (!selectedDate || !title || startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      return;
    }

    const time = `${startTime} - ${endTime}`;

    const nextItineraryItems = [
      ...itineraryItems,
      {
        id: `itinerary-${Date.now()}`,
        visitTitle: selectedVisitTitle,
        dateValue: selectedDate,
        startTime,
        endTime,
        time,
        title,
        detail,
      },
    ];

    setItineraryItems(nextItineraryItems);
    setDraftTitle("");
    setDraftDetail("");
    void persistSharedTripToolkit({
      tripTitle: selectedVisitTitle,
      itineraryItems: nextItineraryItems,
    });
  };

  const removeItineraryItem = (id: string) => {
    const nextItineraryItems = itineraryItems.filter((item) => item.id !== id);
    const nextCompletedItinerary = completedItinerary.filter((item) => item !== id);

    setItineraryItems(nextItineraryItems);
    setCompletedItinerary(nextCompletedItinerary);
    void persistSharedTripToolkit({
      tripTitle: selectedVisitTitle,
      itineraryItems: nextItineraryItems,
      completedItinerary: nextCompletedItinerary,
    });
  };

  const togglePackedItem = (id: string) => {
    const nextPackedItems = packedItems.includes(id)
      ? packedItems.filter((item) => item !== id)
      : [...packedItems, id];

    setPackedItems(nextPackedItems);
    void persistSharedTripToolkit({
      tripLocation: selectedPackingTrip,
      packedItems: nextPackedItems,
    });
  };

  const addPackingItem = () => {
    const label = draftPackingLabel.trim();

    if (!label) {
      return;
    }

    const nextPackingItems = [
      ...packingItems,
      { id: `packing-${Date.now()}`, label, trip: selectedPackingTrip },
    ];

    setPackingItems(nextPackingItems);
    setDraftPackingLabel("");
    void persistSharedTripToolkit({
      tripLocation: selectedPackingTrip,
      packingItems: nextPackingItems,
    });
  };

  const updatePackingItem = (id: string, value: string) => {
    const nextPackingItems = packingItems.map((item) =>
      item.id === id ? { ...item, label: value } : item
    );

    setPackingItems(nextPackingItems);
    void persistSharedTripToolkit({
      tripLocation: selectedPackingTrip,
      packingItems: nextPackingItems,
    });
  };

  const removePackingItem = (id: string) => {
    const nextPackingItems = packingItems.filter((item) => item.id !== id);
    const nextPackedItems = packedItems.filter((item) => item !== id);

    setPackingItems(nextPackingItems);
    setPackedItems(nextPackedItems);
    void persistSharedTripToolkit({
      tripLocation: selectedPackingTrip,
      packingItems: nextPackingItems,
      packedItems: nextPackedItems,
    });
  };

  const addFlightWindow = () => {
    const startDate = draftFlightStartDate.trim();
    const endDate = draftFlightEndDate.trim();
    const note = draftFlightNote.trim();
    const price = draftFlightPrice.trim() ? Number.parseFloat(draftFlightPrice) : undefined;

    if (!startDate) {
      return;
    }

    if (draftFlightPrice.trim() && typeof price === "number" && Number.isNaN(price)) {
      return;
    }

    const nextFlightWindows = [
      ...flightWindows,
      {
        id: `flight-${Date.now()}`,
        trip: selectedFlightTrip,
        startDate,
        endDate: endDate || undefined,
        price,
        note: note || undefined,
      },
    ];

    setFlightWindows(nextFlightWindows);
    setDraftFlightStartDate("");
    setDraftFlightEndDate("");
    setDraftFlightPrice("");
    setDraftFlightNote("");
    void persistSharedTripToolkit({
      tripLocation: selectedFlightTrip,
      flightWindows: nextFlightWindows,
    });
  };

  const removeFlightWindow = (id: string) => {
    const nextFlightWindows = flightWindows.filter((item) => item.id !== id);

    setFlightWindows(nextFlightWindows);
    void persistSharedTripToolkit({
      tripLocation: selectedFlightTrip,
      flightWindows: nextFlightWindows,
    });
  };

  const addTrackedFlightLeg = () => {
    const flightCode = draftTrackedFlightCode.trim();
    const routeNote = draftTrackedFlightRouteNote.trim();

    if (!flightCode || !routeNote) {
      return;
    }

    setDraftTrackedFlightLegs((current) => [
      ...current,
      {
        id: `flight-leg-${Date.now()}`,
        flightCode,
        routeNote,
      },
    ]);
    setDraftTrackedFlightCode("");
    setDraftTrackedFlightRouteNote("");
  };

  const removeTrackedFlightLeg = (legId: string) => {
    setDraftTrackedFlightLegs((current) => current.filter((leg) => leg.id !== legId));
  };

  const addTrackedFlight = () => {
    const travelDate = draftTrackedFlightDate.trim();
    const flightCode = draftTrackedFlightCode.trim();
    const routeNote = draftTrackedFlightRouteNote.trim();
    const legs =
      flightCode && routeNote
        ? [
            ...draftTrackedFlightLegs,
            {
              id: `flight-leg-${Date.now()}`,
              flightCode,
              routeNote,
            },
          ]
        : draftTrackedFlightLegs;

    if (!draftTrackedFlightConnectionId || !travelDate || !legs.length) {
      return;
    }

    setTrackedFlights((current) => [
      ...current,
      {
        id: `tracked-flight-${Date.now()}`,
        trip: selectedTrackedFlightTrip,
        connectionId: draftTrackedFlightConnectionId,
        direction: draftTrackedFlightDirection,
        travelDate,
        legs,
      },
    ]);
    setDraftTrackedFlightDate("");
    setDraftTrackedFlightCode("");
    setDraftTrackedFlightRouteNote("");
    setDraftTrackedFlightLegs([]);
  };

  const removeTrackedFlight = (id: string) => {
    setTrackedFlights((current) => current.filter((item) => item.id !== id));
  };

  const addBudgetItem = (item: BudgetItem) => {
    const nextBudgetItems = budgetItems.some((entry) => entry.id === item.id)
      ? budgetItems
      : [...budgetItems, item];

    setBudgetItems(nextBudgetItems);
    void persistSharedTripToolkit({
      tripLocation: selectedBudgetTrip,
      budgetItems: nextBudgetItems,
    });
  };

  const addCustomBudgetItem = () => {
    const label = draftBudgetLabel.trim();
    const category = draftBudgetCategory.trim();
    const payer = draftBudgetPayer.trim();
    const amount = Number.parseFloat(draftBudgetAmount);

    if (!label || !category || !payer || Number.isNaN(amount)) {
      return;
    }

    const nextBudgetItems = [
      ...budgetItems,
      {
        id: `budget-${Date.now()}`,
        label,
        category,
        payer,
        amount,
        trip: selectedBudgetTrip,
      },
    ];

    setBudgetItems(nextBudgetItems);
    setDraftBudgetLabel("");
    setDraftBudgetCategory("");
    setDraftBudgetPayer("");
    setDraftBudgetAmount("");
    void persistSharedTripToolkit({
      tripLocation: selectedBudgetTrip,
      budgetItems: nextBudgetItems,
    });
  };

  const applyBudgetStarterIdea = (idea: BudgetStarterIdea) => {
    setDraftBudgetLabel(idea.label);
    setDraftBudgetCategory(idea.category);
    if (!draftBudgetPayer) {
      setDraftBudgetPayer(budgetPayerOptions[0] ?? "You");
    }
    setOpenBudgetCategoryMenu(null);
    setOpenBudgetPayerMenu(null);
  };

  const updateBudgetItem = (
    id: string,
    field: "label" | "category" | "payer" | "amount",
    value: string
  ) => {
    const nextBudgetItems = budgetItems.map((item) => {
      if (item.id !== id) {
        return item;
      }

      if (field === "amount") {
        const numericValue = Number.parseFloat(value);
        return { ...item, amount: Number.isNaN(numericValue) ? 0 : numericValue };
      }

      return { ...item, [field]: value };
    });

    setBudgetItems(nextBudgetItems);
    void persistSharedTripToolkit({
      tripLocation: selectedBudgetTrip,
      budgetItems: nextBudgetItems,
    });
  };

  const removeBudgetItem = (id: string) => {
    const nextBudgetItems = budgetItems.filter((item) => item.id !== id);

    setBudgetItems(nextBudgetItems);
    void persistSharedTripToolkit({
      tripLocation: selectedBudgetTrip,
      budgetItems: nextBudgetItems,
    });
  };

  const closeBudgetTrip = () => {
    const nextClosedBudgetTrips = closedBudgetTrips.includes(selectedBudgetTrip)
      ? closedBudgetTrips
      : [...closedBudgetTrips, selectedBudgetTrip];

    setClosedBudgetTrips(nextClosedBudgetTrips);
    void persistSharedTripToolkit({
      tripLocation: selectedBudgetTrip,
      closedBudgetTrips: nextClosedBudgetTrips,
    });
  };

  const reopenBudgetTrip = () => {
    const nextClosedBudgetTrips = closedBudgetTrips.filter(
      (trip) => trip !== selectedBudgetTrip
    );

    setClosedBudgetTrips(nextClosedBudgetTrips);
    void persistSharedTripToolkit({
      tripLocation: selectedBudgetTrip,
      closedBudgetTrips: nextClosedBudgetTrips,
    });
  };

  const loadTripIntoEditor = (tripId: string, options?: { openEditor?: boolean }) => {
    const trip = trips.find((item) => item.id === tripId);

    if (!trip) {
      return;
    }

    setIsCreatingTrip(false);
    setSelectedTripId(tripId);
    if (options?.openEditor !== false) {
      setTripEditorVisible(true);
    }
    setTripDraftTitle(trip.title);
    setTripDraftLocation(trip.location);
    setTripDraftStartDate(trip.startDate);
    setTripDraftEndDate(trip.endDate ?? "");
    setTripDraftPlan(trip.plan);
    setTripDraftParticipantIds(trip.participantIds);
    const tripStart = parseDateValue(trip.startDate);
    if (tripStart) {
      setCalendarMonth(new Date(tripStart.getFullYear(), tripStart.getMonth(), 1, 12, 0, 0));
    }
    setOpenTripParticipantMenu(false);
  };

  const saveTrip = async () => {
    const title = tripDraftTitle.trim();
    const location = tripDraftLocation.trim();
    const startDate = tripDraftStartDate.trim();
    const endDate = tripDraftEndDate.trim();
    const plan = tripDraftPlan.trim();

    if (!title || !location || !startDate || !plan) {
      return;
    }

    const formattedDate = formatDateRange(startDate, endDate);
    if (!formattedDate) {
      return;
    }

    const existingTrip = trips.find((trip) => trip.id === selectedTripId);
    const nextTrip: VisitPlan = {
      id: existingTrip?.id ?? `visit-${Date.now()}`,
      title,
      location,
      date: formattedDate,
      startDate,
      endDate: endDate || undefined,
      daysAway: getDaysAway(startDate),
      plan,
      participantIds: tripDraftParticipantIds,
      archived: existingTrip?.archived ?? false,
    };

    const shouldSaveSharedTrip =
      Boolean(user?.id) &&
      hasSupabaseCredentials &&
      hasSharedTripParticipant(nextTrip.participantIds);

    if (shouldSaveSharedTrip && user?.id) {
      const nextItineraryItems = existingTrip
        ? itineraryItems.map((item) =>
            item.visitTitle === existingTrip.title
              ? { ...item, visitTitle: nextTrip.title }
              : item
          )
        : itineraryItems;
      const nextPackingItems = existingTrip
        ? packingItems.map((item) =>
            item.trip === existingTrip.location ? { ...item, trip: nextTrip.location } : item
          )
        : packingItems;
      const nextFlightWindows = existingTrip
        ? flightWindows.map((item) =>
            item.trip === existingTrip.location ? { ...item, trip: nextTrip.location } : item
          )
        : flightWindows;
      const nextBudgetItems = existingTrip
        ? budgetItems.map((item) =>
            item.trip === existingTrip.location ? { ...item, trip: nextTrip.location } : item
          )
        : budgetItems;
      const nextClosedBudgetTrips = existingTrip
        ? closedBudgetTrips.map((trip) =>
            trip === existingTrip.location ? nextTrip.location : trip
          )
        : closedBudgetTrips;
      const relevantItineraryItems = nextItineraryItems.filter(
        (item) => item.visitTitle === nextTrip.title
      );
      const relevantItineraryIds = new Set(relevantItineraryItems.map((item) => item.id));
      const relevantPackingItems = nextPackingItems.filter(
        (item) => item.trip === nextTrip.location
      );
      const relevantPackingIds = new Set(relevantPackingItems.map((item) => item.id));
      const savedTrip = await saveSharedVisitPlan({
        userId: user.id,
        trip: nextTrip,
        itineraryItems: relevantItineraryItems,
        completedItinerary: completedItinerary.filter((id) => relevantItineraryIds.has(id)),
        flightWindows: nextFlightWindows.filter((item) => item.trip === nextTrip.location),
        packingItems: relevantPackingItems,
        packedItems: packedItems.filter((id) => relevantPackingIds.has(id)),
        budgetItems: nextBudgetItems.filter((item) => item.trip === nextTrip.location),
        budgetClosed: nextClosedBudgetTrips.includes(nextTrip.location),
      });

      if (!savedTrip) {
        return;
      }

      if (existingTrip) {
        setItineraryItems(nextItineraryItems);
        setPackingItems(nextPackingItems);
        setFlightWindows(nextFlightWindows);
        setBudgetItems(nextBudgetItems);
        setClosedBudgetTrips(nextClosedBudgetTrips);
      }

      if (existingTrip) {
        setVisitPlans((current) =>
          current.map((trip) => (trip.id === existingTrip.id ? savedTrip : trip))
        );
        setSelectedTripId(savedTrip.id);
      } else {
        setVisitPlans((current) => [...current, savedTrip]);
        setIsCreatingTrip(false);
        setSelectedTripId(savedTrip.id);
      }

      setSelectedVisitTitle(savedTrip.title);
      setSelectedPackingTrip(savedTrip.location);
      setSelectedFlightTrip(savedTrip.location);
      setSelectedTrackedFlightTrip(savedTrip.location);
      setSelectedBudgetTrip(savedTrip.location);
      setOpenTripParticipantMenu(false);
      setTripEditorVisible(false);
      return;
    }

    if (existingTrip) {
      setVisitPlans((current) =>
        current.map((trip) => (trip.id === existingTrip.id ? nextTrip : trip))
      );
      setItineraryItems((current) =>
        current.map((item) =>
          item.visitTitle === existingTrip.title
            ? { ...item, visitTitle: nextTrip.title }
            : item
        )
      );
      setPackingItems((current) =>
        current.map((item) =>
          item.trip === existingTrip.location ? { ...item, trip: nextTrip.location } : item
        )
      );
      setFlightWindows((current) =>
        current.map((item) =>
          item.trip === existingTrip.location ? { ...item, trip: nextTrip.location } : item
        )
      );
      setTrackedFlights((current) =>
        current.map((item) =>
          item.trip === existingTrip.location ? { ...item, trip: nextTrip.location } : item
        )
      );
      setBudgetItems((current) =>
        current.map((item) =>
          item.trip === existingTrip.location ? { ...item, trip: nextTrip.location } : item
        )
      );
      setClosedBudgetTrips((current) =>
        current.map((trip) => (trip === existingTrip.location ? nextTrip.location : trip))
      );
      setSelectedVisitTitle((current) =>
        current === existingTrip.title ? nextTrip.title : current
      );
      setSelectedPackingTrip((current) =>
        current === existingTrip.location ? nextTrip.location : current
      );
      setSelectedFlightTrip((current) =>
        current === existingTrip.location ? nextTrip.location : current
      );
      setSelectedTrackedFlightTrip((current) =>
        current === existingTrip.location ? nextTrip.location : current
      );
      setSelectedBudgetTrip((current) =>
        current === existingTrip.location ? nextTrip.location : current
      );
      setSelectedTripId(existingTrip.id);
    } else {
      setVisitPlans((current) => [...current, nextTrip]);
      setIsCreatingTrip(false);
      setSelectedTripId(nextTrip.id);
      setSelectedVisitTitle(nextTrip.title);
      setSelectedPackingTrip(nextTrip.location);
      setSelectedFlightTrip(nextTrip.location);
      setSelectedTrackedFlightTrip(nextTrip.location);
      setSelectedBudgetTrip(nextTrip.location);
    }

    if (existingTrip) {
      setIsCreatingTrip(false);
    }

    setOpenTripParticipantMenu(false);
    setTripEditorVisible(false);
  };

  const startNewTrip = () => {
    setIsCreatingTrip(true);
    setTripEditorVisible(true);
    setSelectedTripId("");
    setTripDraftTitle("");
    setTripDraftLocation("");
    setTripDraftStartDate("");
    setTripDraftEndDate("");
    setTripDraftPlan("");
    setTripDraftParticipantIds([]);
    setCalendarMonth(new Date());
    setOpenTripParticipantMenu(false);
  };

  const archiveTrip = () => {
    if (!selectedTripId) {
      return;
    }

    const archivedTrip = trips.find((trip) => trip.id === selectedTripId);

    if (!archivedTrip || archivedTrip.id.startsWith("remote-visit-")) {
      return;
    }

    setVisitPlans((current) =>
      current.map((trip) =>
        trip.id === selectedTripId ? { ...trip, archived: true } : trip
      )
    );

    const remainingTrips = orderedActiveTrips.filter((trip) => trip.id !== selectedTripId);

    if (remainingTrips.length) {
      loadTripIntoEditor(remainingTrips[0].id);
      setSelectedVisitTitle(remainingTrips[0].title);
      setSelectedPackingTrip(remainingTrips[0].location);
      setSelectedFlightTrip(remainingTrips[0].location);
      setSelectedTrackedFlightTrip(remainingTrips[0].location);
      setSelectedBudgetTrip(remainingTrips[0].location);
    } else {
      startNewTrip();
      setSelectedVisitTitle("");
      setSelectedPackingTrip("Any trip");
      setSelectedFlightTrip("");
      setSelectedTrackedFlightTrip("");
      setSelectedBudgetTrip("");
    }
  };

  const reopenTrip = (tripId: string) => {
    setVisitPlans((current) =>
      current.map((trip) => (trip.id === tripId ? { ...trip, archived: false } : trip))
    );
    setIsCreatingTrip(false);
    setTripEditorVisible(true);
    loadTripIntoEditor(tripId);
  };

  const deleteTrip = async () => {
    if (!selectedTripId) {
      return;
    }

    const tripToDelete = trips.find((trip) => trip.id === selectedTripId);

    if (!tripToDelete) {
      return;
    }

    if (tripToDelete.id.startsWith("remote-visit-")) {
      await deleteSharedVisitPlan(tripToDelete.id);
    }

    setVisitPlans((current) => current.filter((trip) => trip.id !== selectedTripId));
    setItineraryItems((current) =>
      current.filter((item) => item.visitTitle !== tripToDelete.title)
    );
    setCompletedItinerary((current) =>
      current.filter((id) =>
        itineraryItems.some(
          (item) => item.id === id && item.visitTitle !== tripToDelete.title
        )
      )
    );
    setFlightWindows((current) =>
      current.filter((item) => item.trip !== tripToDelete.location)
    );
    setTrackedFlights((current) =>
      current.filter((item) => item.trip !== tripToDelete.location)
    );
    setPackingItems((current) =>
      current.filter((item) => item.trip !== tripToDelete.location)
    );
    setPackedItems((current) =>
      current.filter((id) =>
        packingItems.some(
          (item) => item.id === id && item.trip !== tripToDelete.location
        )
      )
    );
    setBudgetItems((current) =>
      current.filter((item) => item.trip !== tripToDelete.location)
    );
    setClosedBudgetTrips((current) =>
      current.filter((trip) => trip !== tripToDelete.location)
    );

    const remainingTrips = orderedActiveTrips.filter((trip) => trip.id !== selectedTripId);

    if (remainingTrips.length) {
      loadTripIntoEditor(remainingTrips[0].id);
      setSelectedVisitTitle(remainingTrips[0].title);
      setSelectedPackingTrip(remainingTrips[0].location);
      setSelectedFlightTrip(remainingTrips[0].location);
      setSelectedTrackedFlightTrip(remainingTrips[0].location);
      setSelectedBudgetTrip(remainingTrips[0].location);
    } else {
      startNewTrip();
      setSelectedVisitTitle("");
      setSelectedPackingTrip("Any trip");
      setSelectedFlightTrip("");
      setSelectedTrackedFlightTrip("");
      setSelectedBudgetTrip("");
    }
  };

  const toggleTripParticipant = (connectionId: string) => {
    setTripDraftParticipantIds((current) =>
      current.includes(connectionId)
        ? current.filter((item) => item !== connectionId)
        : [...current, connectionId]
    );
  };

  const getParticipantNames = (participantIds: string[]) =>
    getParticipantNamesFromConnections(liveConnections, participantIds);

  const applyTripLocationSuggestion = (locationLabel: string) => {
    setTripDraftLocation(locationLabel);
  };

  const shiftCalendarMonth = (offset: number) => {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0)
    );
  };

  const selectTripDate = (dateValue: string) => {
    if (!tripDraftStartDate || tripDraftEndDate) {
      setTripDraftStartDate(dateValue);
      setTripDraftEndDate("");
      return;
    }

    if (dateValue < tripDraftStartDate) {
      setTripDraftStartDate(dateValue);
      return;
    }

    if (dateValue === tripDraftStartDate) {
      setTripDraftEndDate("");
      return;
    }

    setTripDraftEndDate(dateValue);
  };

  const shiftFlightCalendarMonth = (offset: number) => {
    setFlightCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0)
    );
  };

  const selectFlightWindowDate = (dateValue: string) => {
    if (!draftFlightStartDate || draftFlightEndDate) {
      setDraftFlightStartDate(dateValue);
      setDraftFlightEndDate("");
      return;
    }

    if (dateValue < draftFlightStartDate) {
      setDraftFlightStartDate(dateValue);
      return;
    }

    if (dateValue === draftFlightStartDate) {
      setDraftFlightEndDate("");
      return;
    }

    setDraftFlightEndDate(dateValue);
  };

  const shiftTrackerCalendarMonth = (offset: number) => {
    setTrackerCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12, 0, 0)
    );
  };

  const selectTrackedFlightDate = (dateValue: string) => {
    setDraftTrackedFlightDate(dateValue);
  };

  const getConnectionName = (connectionId: string) =>
    liveConnections.find((connection) => connection.id === connectionId)?.name ?? "Your person";

  useEffect(() => {
    if (isCreatingTrip) {
      return;
    }

    if (!orderedActiveTrips.length) {
      if (selectedTripId) {
        startNewTrip();
      }
      return;
    }

    const selectedTrip =
      orderedActiveTrips.find((trip) => trip.id === selectedTripId) ?? orderedActiveTrips[0];

    if (
      !selectedTripId ||
      !orderedActiveTrips.some((trip) => trip.id === selectedTripId)
    ) {
      loadTripIntoEditor(selectedTrip.id, { openEditor: false });
      return;
    }

    if (
      !selectedVisitTitle ||
      !orderedActiveTrips.some((trip) => trip.title === selectedVisitTitle)
    ) {
      setSelectedVisitTitle(selectedTrip.title);
    }

    if (
      !selectedPackingTrip ||
      !orderedActiveTrips.some((trip) => trip.location === selectedPackingTrip)
    ) {
      setSelectedPackingTrip(selectedTrip.location);
    }

    if (
      !selectedFlightTrip ||
      !orderedActiveTrips.some((trip) => trip.location === selectedFlightTrip)
    ) {
      setSelectedFlightTrip(selectedTrip.location);
    }

    if (
      !selectedTrackedFlightTrip ||
      !orderedActiveTrips.some((trip) => trip.location === selectedTrackedFlightTrip)
    ) {
      setSelectedTrackedFlightTrip(selectedTrip.location);
    }

    if (
      !selectedBudgetTrip ||
      !orderedActiveTrips.some((trip) => trip.location === selectedBudgetTrip)
    ) {
    setSelectedBudgetTrip(selectedTrip.location);
    }
  }, [
    isCreatingTrip,
    orderedActiveTrips,
    selectedBudgetTrip,
    selectedFlightTrip,
    selectedPackingTrip,
    selectedTrackedFlightTrip,
    selectedTripId,
    selectedVisitTitle,
  ]);

  useEffect(() => {
    if (!itineraryDateOptions.length) {
      if (selectedItineraryDate) {
        setSelectedItineraryDate("");
      }
      return;
    }

    if (!selectedItineraryDate || !itineraryDateOptions.includes(selectedItineraryDate)) {
      setSelectedItineraryDate(itineraryDateOptions[0]);
    }
  }, [itineraryDateOptions, selectedItineraryDate]);

  return (
    <ScreenSurface ref={tripsScrollRef}>
      <SectionCard
        title="Trip editor"
        subtitle="Add or update visits together so countdowns, packing, itinerary, and budget stay aligned"
        variant="travel"
      >
        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Choose a trip to edit</Text>
          <View style={styles.chipWrap}>
            {orderedActiveTrips.map((trip) => (
              <FilterChip
                key={trip.id}
                label={trip.location}
                active={selectedTripId === trip.id}
                onPress={() => loadTripIntoEditor(trip.id)}
              />
            ))}
            <FilterChip label="New trip" active={isCreatingTrip} onPress={startNewTrip} />
          </View>
        </View>

        {tripEditorVisible ? (
          <View style={styles.editorCard}>
            <Text style={styles.subsectionTitle}>
              {isEditingExistingTrip ? "Edit selected trip" : "Add a new trip"}
            </Text>
            <View style={styles.inputStack}>
              <Text style={styles.fieldLabel}>
                Trip name <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput value={tripDraftTitle} onChangeText={setTripDraftTitle} placeholder="Trip name" placeholderTextColor="#A08F89" style={styles.textInput} />
              <Text style={styles.fieldLabel}>
                Location <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput value={tripDraftLocation} onChangeText={setTripDraftLocation} placeholder="Location, ex: Austin, TX" placeholderTextColor="#A08F89" style={styles.textInput} />
              {tripLocationSuggestions.length ? (
                <View style={styles.suggestionList}>
                  {tripLocationSuggestions.map((location) => (
                    <TouchableOpacity
                      key={location.label}
                      style={styles.suggestionRow}
                      onPress={() => applyTripLocationSuggestion(location.label)}
                    >
                      <Text style={styles.suggestionTitle}>{location.label}</Text>
                      <Text style={styles.suggestionMeta}>{location.timezone}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
              {tripLocationMatch ? (
                <Text style={styles.helperMeta}>
                  Suggested timezone: {tripLocationMatch.timezone}
                </Text>
              ) : null}
              <Text style={styles.fieldLabel}>
                Trip dates <Text style={styles.requiredMark}>*</Text>
              </Text>
              <CalendarRangePicker
                title="Trip dates"
                summary={tripDraftDateSummary}
                monthDate={calendarMonth}
                startDate={tripDraftStartDate}
                endDate={tripDraftEndDate}
                isOpen={openCalendarPicker === "trip"}
                onToggle={() =>
                  setOpenCalendarPicker((current) => (current === "trip" ? null : "trip"))
                }
                onShiftMonth={shiftCalendarMonth}
                onSelectDate={selectTripDate}
                onClear={() => {
                  setTripDraftStartDate("");
                  setTripDraftEndDate("");
                }}
                helperText="Tap once for a single-day trip. Tap a second later date to turn it into a multi-day trip."
              />
              <Text style={styles.fieldLabel}>
                Description or checklist <Text style={styles.requiredMark}>*</Text>
              </Text>
              <TextInput value={tripDraftPlan} onChangeText={setTripDraftPlan} placeholder="Description or shared checklist" placeholderTextColor="#A08F89" style={[styles.textInput, styles.detailInput]} multiline />
              <MultiSelectDropdown
                label="Who is this trip with?"
                selectedLabels={getParticipantNames(tripDraftParticipantIds)}
                options={liveConnections.map((connection) => ({
                  id: connection.id,
                  label: connection.name,
                }))}
                isOpen={openTripParticipantMenu}
                onToggleOpen={() => setOpenTripParticipantMenu((current) => !current)}
                onToggleOption={toggleTripParticipant}
                emptyHelper="Add people in `People` first, then link this trip to whoever is joining you."
              />
            </View>
            <View style={styles.rowMeta}>
              <Text style={styles.helperMeta}>
                Countdown preview: {tripDraftStartDate ? `${getDaysAway(tripDraftStartDate)} days away` : "add a date"}
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={saveTrip}>
                <Text style={styles.primaryButtonText}>
                  {isEditingExistingTrip ? "Save trip" : "Add trip"}
                </Text>
              </TouchableOpacity>
            </View>
            {isEditingExistingTrip ? (
              <View style={styles.rowMeta}>
                {isSharedTrip ? (
                  <Text style={styles.helperMeta}>
                    Shared trips stay active for both people.
                  </Text>
                ) : (
                  <TouchableOpacity style={styles.secondaryAction} onPress={archiveTrip}>
                    <Text style={styles.secondaryActionText}>Archive trip</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.removeButton} onPress={deleteTrip}>
                  <Text style={styles.removeButtonText}>Delete trip</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.closedSummaryCard}>
            <Text style={styles.feedTitle}>
              {isEditingExistingTrip ? "Trip saved" : "Trip added"}
            </Text>
            <Text style={styles.feedMeta}>
              {tripDraftTitle || "Your trip"} • {tripDraftDateSummary}
            </Text>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => setTripEditorVisible(true)}
            >
              <Text style={styles.secondaryActionText}>Reopen editor</Text>
            </TouchableOpacity>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Next visit countdown"
        subtitle="Make time together feel tangible"
        variant="travel"
      >
        {orderedActiveTrips.length ? (
          orderedActiveTrips.map((visit) => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitBadge}>
                <Text style={styles.visitNumber}>{visit.daysAway}</Text>
                <Text style={styles.visitBadgeLabel}>Days</Text>
              </View>
              <View style={styles.visitCopy}>
                <Text style={styles.feedTitle}>{visit.title}</Text>
                <Text style={styles.feedMeta}>{visit.date} | {visit.location}</Text>
                <Text style={styles.helperMeta}>
                  With {getParticipantNames(visit.participantIds).join(", ") || "your people"}
                </Text>
                <Text style={styles.feedMeta}>{visit.plan}</Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.feedTitle}>No trips yet</Text>
            <Text style={styles.feedMeta}>
              Start with a definite plan, or even a maybe worth holding onto.
            </Text>
          </View>
        )}
      </SectionCard>

      {archivedTrips.length ? (
        <SectionCard
          title="Archived trips"
          subtitle="Past or finished trips stay here so you can reopen them without losing the planning details"
          variant="travel"
        >
          {archivedTrips.map((trip) => (
            <View key={trip.id} style={styles.closedSummaryCard}>
              <Text style={styles.feedTitle}>{trip.title}</Text>
              <Text style={styles.feedMeta}>
                {trip.date} | {trip.location}
              </Text>
              <Text style={styles.helperMeta}>{trip.plan}</Text>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => reopenTrip(trip.id)}
              >
                <Text style={styles.secondaryActionText}>Reopen trip</Text>
              </TouchableOpacity>
            </View>
          ))}
        </SectionCard>
      ) : null}

      <SectionCard
        title="Visit itinerary"
        subtitle="Plan the next trip together so time feels intentional before you even arrive"
        variant="travel"
      >
        {orderedActiveTrips.length ? (
          <>
            <View style={styles.controlGroup}>
              <Text style={styles.controlLabel}>Which visit are you planning?</Text>
              <View style={styles.chipWrap}>
                {orderedActiveTrips.map((visit) => (
                  <FilterChip
                    key={visit.id}
                    label={visit.location}
                    active={selectedVisitTitle === visit.title}
                    onPress={() => setSelectedVisitTitle(visit.title)}
                  />
                ))}
              </View>
            </View>

            <View style={[styles.itineraryShell, isWideLayout && styles.itineraryShellWide]}>
              <View
                style={[
                  styles.itineraryComposerPane,
                  isWideLayout && styles.itineraryComposerPaneWide,
                ]}
              >
                <View style={styles.editorCard}>
                  <Text style={styles.subsectionTitle}>Add an itinerary item</Text>
                  <View style={styles.inputStack}>
                    <Text style={styles.fieldLabel}>
                      Trip day <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <View style={styles.itineraryDatePicker}>
                      {itineraryDateOptions.map((dateValue) => (
                        <TouchableOpacity
                          key={`itinerary-date-${dateValue}`}
                          style={[
                            styles.itineraryDateChip,
                            activeItineraryDate === dateValue && styles.itineraryDateChipActive,
                          ]}
                          onPress={() => setSelectedItineraryDate(dateValue)}
                          activeOpacity={0.9}
                        >
                          <Text
                            style={[
                              styles.itineraryDateChipWeekday,
                              activeItineraryDate === dateValue &&
                                styles.itineraryDateChipWeekdayActive,
                            ]}
                          >
                            {formatTripDayLabel(dateValue).split(" ")[0]}
                          </Text>
                          <Text
                            style={[
                              styles.itineraryDateChipDay,
                              activeItineraryDate === dateValue &&
                                styles.itineraryDateChipDayActive,
                            ]}
                          >
                            {formatTripDayLabel(dateValue).split(" ").slice(1).join(" ")}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.fieldLabel}>
                      Time range <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <View style={styles.itineraryTimeRow}>
                      <View style={[styles.selectWrap, styles.metaInput]}>
                        <TouchableOpacity
                          style={styles.selectButton}
                          onPress={() =>
                            setOpenItineraryStartTimeMenu((current) => !current)
                          }
                        >
                          <Text style={styles.selectButtonText}>{draftItineraryStartTime}</Text>
                          <Text style={styles.selectChevron}>
                            {openItineraryStartTimeMenu ? "▲" : "▼"}
                          </Text>
                        </TouchableOpacity>
                        {openItineraryStartTimeMenu ? (
                          <View style={styles.optionList}>
                            <ScrollView
                              style={styles.scrollOptionList}
                              nestedScrollEnabled
                              showsVerticalScrollIndicator
                            >
                              {itineraryTimeOptions.map((timeOption) => (
                                <TouchableOpacity
                                  key={`start-${timeOption}`}
                                  style={styles.optionRow}
                                  onPress={() => {
                                    setDraftItineraryStartTime(timeOption);
                                    setOpenItineraryStartTimeMenu(false);
                                  }}
                                >
                                  <Text style={styles.optionText}>{timeOption}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        ) : null}
                      </View>
                      <View style={[styles.selectWrap, styles.metaInput]}>
                        <TouchableOpacity
                          style={styles.selectButton}
                          onPress={() =>
                            setOpenItineraryEndTimeMenu((current) => !current)
                          }
                        >
                          <Text style={styles.selectButtonText}>{draftItineraryEndTime}</Text>
                          <Text style={styles.selectChevron}>
                            {openItineraryEndTimeMenu ? "▲" : "▼"}
                          </Text>
                        </TouchableOpacity>
                        {openItineraryEndTimeMenu ? (
                          <View style={styles.optionList}>
                            <ScrollView
                              style={styles.scrollOptionList}
                              nestedScrollEnabled
                              showsVerticalScrollIndicator
                            >
                              {itineraryTimeOptions.map((timeOption) => (
                                <TouchableOpacity
                                  key={`end-${timeOption}`}
                                  style={styles.optionRow}
                                  onPress={() => {
                                    setDraftItineraryEndTime(timeOption);
                                    setOpenItineraryEndTimeMenu(false);
                                  }}
                                >
                                  <Text style={styles.optionText}>{timeOption}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Text style={styles.fieldLabel}>
                      Title <Text style={styles.requiredMark}>*</Text>
                    </Text>
                    <TextInput value={draftTitle} onChangeText={setDraftTitle} placeholder="Title, ex: Botanical Garden date" placeholderTextColor="#A08F89" style={styles.textInput} />
                    <Text style={styles.fieldLabel}>
                      Details
                    </Text>
                    <TextInput value={draftDetail} onChangeText={setDraftDetail} placeholder="Optional details, ex: bring camera + stop for coffee after" placeholderTextColor="#A08F89" style={[styles.textInput, styles.detailInput]} multiline />
                  </View>
                  <TouchableOpacity style={styles.primaryButton} onPress={addItineraryItem}>
                    <Text style={styles.primaryButtonText}>Add to {selectedVisitTitle}</Text>
                  </TouchableOpacity>
                </View>

                {visibleItinerary.length ? (
                  <View style={styles.itineraryList}>
                    {visibleItinerary.map((item) => (
                      <TouchableOpacity key={item.id} style={styles.toolCard} onPress={() => toggleItinerary(item.id)} activeOpacity={0.9}>
                        <View style={[styles.toolBadge, completedItinerary.includes(item.id) && styles.toolBadgeComplete]}>
                          <Text style={styles.toolBadgeLabel}>{item.time}</Text>
                        </View>
                        <View style={styles.toolCopy}>
                          <Text style={styles.feedTitle}>{item.title}</Text>
                          <Text style={styles.feedMeta}>
                            {[item.dateValue ? inputValueToDisplayDate(item.dateValue) : "", item.detail]
                              .filter(Boolean)
                              .join(" • ") || "No extra notes yet."}
                          </Text>
                          <View style={styles.rowMeta}>
                            <Text style={styles.helperMeta}>
                              {completedItinerary.includes(item.id) ? "Marked as planned together" : "Tap to mark this part of the trip as planned"}
                            </Text>
                            <TouchableOpacity onPress={() => removeItineraryItem(item.id)}>
                              <Text style={styles.removeText}>Remove</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.feedMeta}>Nothing is mapped out yet. Add one small anchor and let the rest grow around it.</Text>
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.itineraryTimelinePane,
                  isWideLayout && styles.itineraryTimelinePaneWide,
                ]}
              >
                <View style={styles.itineraryTimelineCard}>
                  <View style={styles.itineraryTimelineHeader}>
                    <View style={styles.itineraryTimelineHeaderCopy}>
                      <Text style={styles.subsectionTitle}>Day view</Text>
                      <Text style={styles.feedMeta}>
                        {activeItineraryDate
                          ? inputValueToDisplayDate(activeItineraryDate)
                          : selectedVisitPlan?.date || "Add trip dates to anchor the day"}
                      </Text>
                    </View>
                    <Text style={styles.helperMeta}>
                      {selectedVisitPlan?.location || "Trip timeline"}
                    </Text>
                  </View>
                  {itineraryDateOptions.length > 1 ? (
                    <View style={styles.itineraryTimelineDateRow}>
                      {itineraryDateOptions.map((dateValue) => (
                        <TouchableOpacity
                          key={`timeline-date-${dateValue}`}
                          style={[
                            styles.itineraryTimelineDateChip,
                            activeItineraryDate === dateValue &&
                              styles.itineraryTimelineDateChipActive,
                          ]}
                          onPress={() => setSelectedItineraryDate(dateValue)}
                          activeOpacity={0.9}
                        >
                          <Text
                            style={[
                              styles.itineraryTimelineDateChipText,
                              activeItineraryDate === dateValue &&
                                styles.itineraryTimelineDateChipTextActive,
                            ]}
                          >
                            {formatTripDayLabel(dateValue)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : null}

                  {parsedItinerary.scheduled.length ? (
                    <View style={styles.timelineShell}>
                      <View style={styles.timelineLabels}>
                        {parsedItinerary.hours.map((hour) => (
                          <View key={`label-${hour}`} style={styles.timelineHourLabelWrap}>
                            <Text style={styles.timelineHourLabel}>{formatTimelineHour(hour)}</Text>
                          </View>
                        ))}
                      </View>
                      <View
                        style={[
                          styles.timelineTrack,
                          { height: parsedItinerary.hours.length * 72 },
                        ]}
                      >
                        {parsedItinerary.hours.map((hour, index) => (
                          <View
                            key={`line-${hour}`}
                            style={[
                              styles.timelineHourLine,
                              { top: index * 72 },
                            ]}
                          />
                        ))}
                        {parsedItinerary.scheduled.map((entry) => {
                          const top =
                            ((entry.startMinutes - parsedItinerary.earliestHour * 60) / 60) * 72;
                          const height = Math.max(
                            54,
                            ((entry.endMinutes - entry.startMinutes) / 60) * 72 - 6
                          );

                          return (
                            <View
                              key={`timeline-${entry.item.id}`}
                              style={[styles.timelineEvent, { top, height }]}
                            >
                              <Text style={styles.timelineEventTime}>{entry.item.time}</Text>
                              <Text style={styles.timelineEventTitle}>{entry.item.title}</Text>
                              <Text style={styles.timelineEventDetail} numberOfLines={3}>
                                {entry.item.detail}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.feedMeta}>
                        Add itinerary items with time ranges and they will stack here like a day planner.
                      </Text>
                    </View>
                  )}

                  {parsedItinerary.unscheduled.length ? (
                    <View style={styles.unscheduledCard}>
                      <Text style={styles.controlLabel}>Flexible plans</Text>
                      {parsedItinerary.unscheduled.map((item) => (
                        <View key={`unscheduled-${item.id}`} style={styles.unscheduledRow}>
                          <Text style={styles.feedTitle}>{item.title}</Text>
                          <Text style={styles.feedMeta}>
                            {item.time} • add a more exact time to place it in the day view
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.feedTitle}>No itinerary yet</Text>
            <Text style={styles.feedMeta}>
              Add a trip first, then start sketching the shape of time together.
            </Text>
          </View>
        )}
      </SectionCard>

      <SectionCard
        title="Trip toolkit"
        subtitle="Flights, weather, packing, and budgeting in one shared planning space"
        variant="travel"
        onLayout={(event) => {
          toolkitCardOffset.current = event.nativeEvent.layout.y;
        }}
        bodyOnLayout={(event) => {
          toolkitBodyOffset.current = event.nativeEvent.layout.y;
        }}
      >
        {tripToolkit.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.toolIntroCard}
            activeOpacity={0.88}
            onPress={() => jumpToToolkitSection(toolkitSectionById[item.id])}
          >
            <View style={styles.toolIntroBadge}>
              <Text style={styles.toolIntroBadgeLabel}>{item.title}</Text>
            </View>
            <View style={styles.toolIntroCopy}>
              <Text style={styles.toolIntroDetail}>{item.detail}</Text>
              <Text style={styles.toolIntroHint}>Jump to section</Text>
            </View>
          </TouchableOpacity>
        ))}

        <View
          style={styles.subsectionBlock}
          onLayout={(event) =>
            registerToolkitSection("flightDates", event.nativeEvent.layout.y)
          }
        >
          <Text style={styles.subsectionTitle}>Cheap flight date windows</Text>
          {orderedActiveTrips.length ? (
            <>
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Choose a trip or city</Text>
                <View style={styles.chipWrap}>
                  {orderedActiveTrips.map((visit) => (
                    <FilterChip
                      key={`flight-${visit.id}`}
                      label={visit.location}
                      active={selectedFlightTrip === visit.location}
                      onPress={() => setSelectedFlightTrip(visit.location)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.editorCard}>
                <Text style={styles.subsectionTitle}>Add a cheap-flight window</Text>
                <View style={styles.inputStack}>
                  <Text style={styles.fieldLabel}>
                    Flexible dates <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <CalendarRangePicker
                    title="Flexible dates"
                    summary={draftFlightDateSummary}
                    monthDate={flightCalendarMonth}
                    startDate={draftFlightStartDate}
                    endDate={draftFlightEndDate}
                    isOpen={openCalendarPicker === "flight"}
                    onToggle={() =>
                      setOpenCalendarPicker((current) => (current === "flight" ? null : "flight"))
                    }
                    onShiftMonth={shiftFlightCalendarMonth}
                    onSelectDate={selectFlightWindowDate}
                    onClear={() => {
                      setDraftFlightStartDate("");
                      setDraftFlightEndDate("");
                    }}
                    helperText="Pick a start day, then an end day to compare a cheaper travel window."
                  />
                  <Text style={styles.fieldLabel}>
                    Estimated fare
                  </Text>
                  <TextInput
                    value={draftFlightPrice}
                    onChangeText={setDraftFlightPrice}
                    placeholder="Optional fare, ex: 214"
                    placeholderTextColor="#A08F89"
                    style={styles.textInput}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.fieldLabel}>
                    Note
                  </Text>
                  <TextInput
                    value={draftFlightNote}
                    onChangeText={setDraftFlightNote}
                    placeholder="Optional note, ex: easier return day"
                    placeholderTextColor="#A08F89"
                    style={[styles.textInput, styles.detailInput]}
                    multiline
                  />
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={addFlightWindow}>
                  <Text style={styles.primaryButtonText}>Add flight window</Text>
                </TouchableOpacity>
              </View>

              {visibleFlightWindows.map((item) => (
                <View key={item.id} style={styles.tripSummaryCard}>
                    <View style={styles.summaryHeader}>
                      <View style={styles.summaryBadge}>
                        <Text style={styles.summaryValue}>
                          {typeof item.price === "number" ? `$${item.price}` : "Dates"}
                        </Text>
                        <Text style={styles.summaryLabel}>
                          {typeof item.price === "number" ? "Est. fare" : "Window"}
                        </Text>
                      </View>
                      <View style={styles.toolCopy}>
                        <Text style={styles.feedTitle}>
                          {formatDateRange(item.startDate, item.endDate)}
                        </Text>
                        <Text style={styles.feedMeta}>
                          {item.note || "Saved as a flexible travel window to compare later."}
                        </Text>
                      </View>
                    </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => removeFlightWindow(item.id)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {!visibleFlightWindows.length ? (
                <View style={styles.emptyState}>
                  <Text style={styles.feedMeta}>
                    No fare windows saved yet. Start with dates first, then compare what feels lighter.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.feedMeta}>
                Add a place first, and flexible flight windows can gather here around it.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.subsectionBlock}>
          <Text style={styles.subsectionTitle}>Tracked arrivals and departures</Text>
          {orderedActiveTrips.length ? (
            <>
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Choose a trip or city</Text>
                <View style={styles.chipWrap}>
                  {orderedActiveTrips.map((visit) => (
                    <FilterChip
                      key={`tracked-${visit.id}`}
                      label={visit.location}
                      active={selectedTrackedFlightTrip === visit.location}
                      onPress={() => setSelectedTrackedFlightTrip(visit.location)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.editorCard}>
                <Text style={styles.subsectionTitle}>Add a coming-or-going flight</Text>
                <View style={styles.inputStack}>
                  <Text style={styles.fieldLabel}>
                    Person <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={styles.selectWrap}>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() =>
                        setOpenTrackedFlightPersonMenu((current) => !current)
                      }
                    >
                      <Text style={styles.selectButtonText}>{trackedFlightPersonName}</Text>
                      <Text style={styles.selectChevron}>
                        {openTrackedFlightPersonMenu ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>
                    {openTrackedFlightPersonMenu ? (
                      <View style={styles.optionList}>
                        {liveConnections.map((connection) => (
                          <TouchableOpacity
                            key={`tracked-person-${connection.id}`}
                            style={styles.optionRow}
                            onPress={() => {
                              setDraftTrackedFlightConnectionId(connection.id);
                              setOpenTrackedFlightPersonMenu(false);
                            }}
                          >
                            <Text style={styles.optionText}>{connection.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.fieldLabel}>
                    Direction <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <View style={styles.selectWrap}>
                    <TouchableOpacity
                      style={styles.selectButton}
                      onPress={() =>
                        setOpenTrackedFlightDirectionMenu((current) => !current)
                      }
                    >
                      <Text style={styles.selectButtonText}>
                        {draftTrackedFlightDirection === "arrival" ? "Arrival" : "Departure"}
                      </Text>
                      <Text style={styles.selectChevron}>
                        {openTrackedFlightDirectionMenu ? "▲" : "▼"}
                      </Text>
                    </TouchableOpacity>
                    {openTrackedFlightDirectionMenu ? (
                      <View style={styles.optionList}>
                        {["arrival", "departure"].map((direction) => (
                          <TouchableOpacity
                            key={`tracked-direction-${direction}`}
                            style={styles.optionRow}
                            onPress={() => {
                              setDraftTrackedFlightDirection(direction as "arrival" | "departure");
                              setOpenTrackedFlightDirectionMenu(false);
                            }}
                          >
                            <Text style={styles.optionText}>
                              {direction === "arrival" ? "Arrival" : "Departure"}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.fieldLabel}>
                    Flight day <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <CalendarRangePicker
                    title="Flight day"
                    summary={draftTrackedFlightDateSummary}
                    monthDate={trackerCalendarMonth}
                    startDate={draftTrackedFlightDate}
                    isOpen={openCalendarPicker === "tracker"}
                    onToggle={() =>
                      setOpenCalendarPicker((current) => (current === "tracker" ? null : "tracker"))
                    }
                    onShiftMonth={shiftTrackerCalendarMonth}
                    onSelectDate={selectTrackedFlightDate}
                    onClear={() => setDraftTrackedFlightDate("")}
                    helperText="Use one date to track when someone arrives or heads home."
                  />
                  <Text style={styles.fieldLabel}>
                    Flight code <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    value={draftTrackedFlightCode}
                    onChangeText={setDraftTrackedFlightCode}
                    placeholder="Flight code, ex: AA 1472"
                    placeholderTextColor="#A08F89"
                    style={styles.textInput}
                  />
                  <Text style={styles.fieldLabel}>
                    Route note <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    value={draftTrackedFlightRouteNote}
                    onChangeText={setDraftTrackedFlightRouteNote}
                    placeholder="Arrival or departure note"
                    placeholderTextColor="#A08F89"
                    style={[styles.textInput, styles.detailInput]}
                    multiline
                  />
                  <TouchableOpacity style={styles.secondaryAction} onPress={addTrackedFlightLeg}>
                    <Text style={styles.secondaryActionText}>Add this flight leg</Text>
                  </TouchableOpacity>
                  {draftTrackedFlightLegs.length ? (
                    <View style={styles.inputStack}>
                      {draftTrackedFlightLegs.map((leg, index) => (
                        <View key={leg.id} style={styles.tripSummaryCard}>
                          <View style={styles.summaryHeader}>
                            <View style={styles.summaryBadge}>
                              <Text style={styles.summaryValue}>{index + 1}</Text>
                              <Text style={styles.summaryLabel}>Leg</Text>
                            </View>
                            <View style={styles.toolCopy}>
                              <Text style={styles.feedTitle}>{leg.flightCode}</Text>
                              <Text style={styles.feedMeta}>{leg.routeNote}</Text>
                            </View>
                          </View>
                          <TouchableOpacity
                            style={styles.removeButton}
                            onPress={() => removeTrackedFlightLeg(leg.id)}
                          >
                            <Text style={styles.removeButtonText}>Remove</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text style={styles.helperMeta}>
                    Add one or more flight legs here for layovers or connected segments, then save the full arrival or departure.
                  </Text>
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={addTrackedFlight}>
                  <Text style={styles.primaryButtonText}>Add tracked flight</Text>
                </TouchableOpacity>
              </View>

              {visibleTrackedFlights.map((item) => (
                <View key={item.id} style={styles.tripSummaryCard}>
                  <View style={styles.summaryHeader}>
                    <View style={styles.summaryBadge}>
                      <Text style={styles.summaryValue}>
                        {item.direction === "arrival" ? "IN" : "OUT"}
                      </Text>
                      <Text style={styles.summaryLabel}>
                        {item.direction === "arrival" ? "Arrival" : "Departure"}
                      </Text>
                    </View>
                    <View style={styles.toolCopy}>
                      <Text style={styles.feedTitle}>
                        {getConnectionName(item.connectionId)} • {item.legs.length} flight
                        {item.legs.length === 1 ? "" : "s"}
                      </Text>
                      <Text style={styles.feedMeta}>{formatDateRange(item.travelDate)}</Text>
                      {item.legs.map((leg, index) => (
                        <Text key={leg.id} style={styles.feedMeta}>
                          {index + 1}. {leg.flightCode} - {leg.routeNote}
                        </Text>
                      ))}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeTrackedFlight(item.id)}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {!visibleTrackedFlights.length ? (
                <View style={styles.emptyState}>
                  <Text style={styles.feedMeta}>
                    No arrivals or departures saved yet. Add one so pickups, hellos, and goodbyes feel easier to hold.
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.feedMeta}>
                Add a trip first, then the coming-and-going details can live here.
              </Text>
            </View>
          )}
        </View>

        <View
          style={styles.subsectionBlock}
          onLayout={(event) => registerToolkitSection("weather", event.nativeEvent.layout.y)}
        >
          <View style={styles.rowMeta}>
            <Text style={styles.subsectionTitle}>Weather forecast by city</Text>
            <View style={styles.chipWrap}>
              <FilterChip
                label="°F"
                active={temperatureUnit === "fahrenheit"}
                onPress={() => setTemperatureUnit("fahrenheit")}
              />
              <FilterChip
                label="°C"
                active={temperatureUnit === "celsius"}
                onPress={() => setTemperatureUnit("celsius")}
              />
            </View>
          </View>
          {visibleWeatherForecasts.map((forecast) => (
            <View key={forecast.id} style={styles.weatherCard}>
              <View style={styles.summaryHeader}>
                <View style={styles.weatherBadge}>
                  <Text style={styles.weatherIcon}>{forecast.icon}</Text>
                  <Text style={styles.weatherTemperature}>
                    {getTemperatureDisplay(forecast.temperatureRange, temperatureUnit)}
                  </Text>
                  <Text style={styles.summaryLabel}>Forecast</Text>
                </View>
                <View style={styles.toolCopy}>
                  <Text style={styles.feedTitle}>{forecast.city}</Text>
                  <Text style={styles.feedMeta}>{forecast.summary}</Text>
                  <Text style={styles.helperMeta}>{forecast.packingNote}</Text>
                </View>
              </View>
            </View>
          ))}
          {!visibleWeatherForecasts.length ? (
            <View style={styles.emptyState}>
              <Text style={styles.feedMeta}>
                Add a destination, and the forecast will meet you there.
              </Text>
            </View>
          ) : null}
        </View>

        <View
          style={styles.subsectionBlock}
          onLayout={(event) => registerToolkitSection("packing", event.nativeEvent.layout.y)}
        >
          <Text style={styles.subsectionTitle}>Packing checklist</Text>
          {orderedActiveTrips.length ? (
            <>
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Choose a trip or city</Text>
                <View style={styles.chipWrap}>
                  {[...orderedActiveTrips.map((visit) => visit.location), "Any trip"].map((trip) => (
                    <FilterChip
                      key={trip}
                      label={trip}
                      active={selectedPackingTrip === trip}
                      onPress={() => setSelectedPackingTrip(trip)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.editorCard}>
                <Text style={styles.subsectionTitle}>Add a packing item</Text>
                <View style={styles.inputStack}>
                  <Text style={styles.fieldLabel}>
                    Packing item <Text style={styles.requiredMark}>*</Text>
                  </Text>
                  <TextInput
                    value={draftPackingLabel}
                    onChangeText={setDraftPackingLabel}
                    placeholder={`Add an item for ${selectedPackingTrip}`}
                    placeholderTextColor="#A08F89"
                    style={styles.textInput}
                  />
                </View>
                <TouchableOpacity style={styles.primaryButton} onPress={addPackingItem}>
                  <Text style={styles.primaryButtonText}>Add item</Text>
                </TouchableOpacity>
              </View>

              {visiblePackingItems.map((item) => (
                <View key={item.id} style={styles.checkEditorRow}>
                  <TouchableOpacity style={styles.checkToggle} onPress={() => togglePackedItem(item.id)} activeOpacity={0.9}>
                    <View style={[styles.checkCircle, packedItems.includes(item.id) && styles.checkCircleActive]}>
                      {packedItems.includes(item.id) ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.toolCopy}>
                    <TextInput value={item.label} onChangeText={(value) => updatePackingItem(item.id, value)} placeholder="Packing item" placeholderTextColor="#A08F89" style={styles.textInput} />
                    <Text style={styles.helperMeta}>{packedItems.includes(item.id) ? "Packed" : "Tap circle when packed"}</Text>
                  </View>
                  <TouchableOpacity style={styles.removeButton} onPress={() => removePackingItem(item.id)}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {!visiblePackingItems.length ? (
                <View style={styles.emptyState}>
                  <Text style={styles.feedMeta}>Nothing packed yet. Start with one thing you would hate to forget.</Text>
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.feedMeta}>
                Add a trip first, then start building the little list that makes leaving feel easier.
              </Text>
            </View>
          )}
        </View>

        <View
          style={styles.subsectionBlock}
          onLayout={(event) => registerToolkitSection("budget", event.nativeEvent.layout.y)}
        >
          <Text style={styles.subsectionTitle}>Shared trip budget</Text>
          {orderedActiveTrips.length ? (
            <>
              <View style={styles.controlGroup}>
                <Text style={styles.controlLabel}>Choose a trip or city</Text>
                <View style={styles.chipWrap}>
                  {orderedActiveTrips.map((visit) => (
                    <FilterChip
                      key={visit.id}
                      label={visit.location}
                      active={selectedBudgetTrip === visit.location}
                      onPress={() => setSelectedBudgetTrip(visit.location)}
                    />
                  ))}
                </View>
              </View>

              <View style={[styles.budgetShell, isWideLayout && styles.budgetShellWide]}>
                <View
                  style={[styles.budgetComposerPane, isWideLayout && styles.budgetComposerPaneWide]}
                >
                  <View style={styles.totalCard}>
                    <Text style={styles.totalLabel}>Current shared total</Text>
                    <Text style={styles.totalValue}>${budgetTotal.toFixed(2)}</Text>
                  </View>

                  {isBudgetClosed ? (
                    <View style={styles.closedSummaryCard}>
                      <Text style={styles.feedTitle}>{selectedBudgetTrip} budget closed</Text>
                      <Text style={styles.feedMeta}>
                        {visibleBudgetItems.length} expenses recorded and reconciled for this trip.
                      </Text>
                      <TouchableOpacity style={styles.secondaryAction} onPress={reopenBudgetTrip}>
                        <Text style={styles.secondaryActionText}>Reopen budget</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.editorCard}>
                        <Text style={styles.subsectionTitle}>Add a custom expense</Text>
                        <View style={styles.inputStack}>
                          <Text style={styles.fieldLabel}>
                            Expense item <Text style={styles.requiredMark}>*</Text>
                          </Text>
                          <TextInput value={draftBudgetLabel} onChangeText={setDraftBudgetLabel} placeholder="Expense item, ex: dinner reservation" placeholderTextColor="#A08F89" style={styles.textInput} />
                          <Text style={styles.fieldLabel}>
                            Category <Text style={styles.requiredMark}>*</Text>
                          </Text>
                          <View style={styles.selectWrap}>
                            <TouchableOpacity style={styles.selectButton} onPress={() => setOpenBudgetCategoryMenu((current) => (current === "new" ? null : "new"))}>
                              <Text style={[styles.selectButtonText, !draftBudgetCategory && styles.selectPlaceholder]}>
                                {draftBudgetCategory || "Choose category"}
                              </Text>
                              <Text style={styles.selectChevron}>{openBudgetCategoryMenu === "new" ? "▲" : "▼"}</Text>
                            </TouchableOpacity>
                            {openBudgetCategoryMenu === "new" ? (
                              <View style={styles.optionList}>
                                {budgetCategories.map((category) => (
                                  <TouchableOpacity key={category} style={styles.optionRow} onPress={() => { setDraftBudgetCategory(category); setOpenBudgetCategoryMenu(null); }}>
                                    <Text style={styles.optionText}>{category}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.fieldLabel}>
                            Who paid <Text style={styles.requiredMark}>*</Text>
                          </Text>
                          <View style={styles.selectWrap}>
                            <TouchableOpacity style={styles.selectButton} onPress={() => setOpenBudgetPayerMenu((current) => (current === "new" ? null : "new"))}>
                              <Text style={[styles.selectButtonText, !draftBudgetPayer && styles.selectPlaceholder]}>
                                {draftBudgetPayer || "Who paid?"}
                              </Text>
                              <Text style={styles.selectChevron}>{openBudgetPayerMenu === "new" ? "▲" : "▼"}</Text>
                            </TouchableOpacity>
                            {openBudgetPayerMenu === "new" ? (
                              <View style={styles.optionList}>
                                {budgetPayerOptions.map((payer) => (
                                  <TouchableOpacity key={payer} style={styles.optionRow} onPress={() => { setDraftBudgetPayer(payer); setOpenBudgetPayerMenu(null); }}>
                                    <Text style={styles.optionText}>{payer}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.fieldLabel}>
                            Amount <Text style={styles.requiredMark}>*</Text>
                          </Text>
                          <TextInput value={draftBudgetAmount} onChangeText={setDraftBudgetAmount} placeholder="Amount, ex: 42" placeholderTextColor="#A08F89" style={styles.textInput} keyboardType="decimal-pad" />
                        </View>
                        <TouchableOpacity style={styles.primaryButton} onPress={addCustomBudgetItem}>
                          <Text style={styles.primaryButtonText}>Add expense</Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.budgetQuickAddCard}>
                        <Text style={styles.controlLabel}>
                          {visibleBudgetSuggestions.length
                            ? "Quick add shared expenses"
                            : "Starter ideas"}
                        </Text>
                        {visibleBudgetSuggestions.length ? (
                          <View style={styles.budgetQuickAddList}>
                            {visibleBudgetSuggestions.map((item) => {
                              const alreadyAdded = budgetItems.some((entry) => entry.id === item.id);

                              return (
                                <TouchableOpacity key={item.id} style={[styles.budgetRow, alreadyAdded && styles.budgetRowDisabled]} onPress={() => addBudgetItem(item)} disabled={alreadyAdded} activeOpacity={0.9}>
                                  <View style={styles.toolCopy}>
                                    <Text style={styles.feedMeta}>{item.label}</Text>
                                    <Text style={styles.helperMeta}>
                                      {item.category} | {item.payer} paid | ${item.amount.toFixed(2)}
                                    </Text>
                                  </View>
                                  <Text style={styles.addBudgetText}>{alreadyAdded ? "Added" : "Add"}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : (
                          <>
                            <Text style={styles.feedMeta}>
                              Tap one to prefill the expense form and keep moving.
                            </Text>
                            <View style={styles.budgetStarterGrid}>
                              {budgetStarterIdeas.map((idea) => (
                                <TouchableOpacity
                                  key={idea.id}
                                  style={styles.budgetStarterChip}
                                  activeOpacity={0.9}
                                  onPress={() => applyBudgetStarterIdea(idea)}
                                >
                                  <Text style={styles.budgetStarterTitle}>{idea.label}</Text>
                                  <Text style={styles.budgetStarterMeta}>
                                    {idea.category} • {idea.helper}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </>
                        )}
                      </View>

                      <TouchableOpacity style={styles.secondaryAction} onPress={closeBudgetTrip}>
                        <Text style={styles.secondaryActionText}>Close out this trip budget</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>

                <View style={[styles.budgetLedgerPane, isWideLayout && styles.budgetLedgerPaneWide]}>
                  <View style={styles.budgetLedgerHeader}>
                    <Text style={styles.subsectionTitle}>Recorded expenses</Text>
                    <Text style={styles.helperMeta}>
                      {visibleBudgetItems.length} {visibleBudgetItems.length === 1 ? "item" : "items"}
                    </Text>
                  </View>

                  {visibleBudgetItems.map((item) => (
                    <View key={item.id} style={styles.budgetEditorRow}>
                      <View style={styles.budgetFieldStack}>
                        <TextInput value={item.label} onChangeText={(value) => updateBudgetItem(item.id, "label", value)} placeholder="Expense item" placeholderTextColor="#A08F89" style={styles.textInput} />
                        <View style={styles.budgetMetaRow}>
                          <View style={[styles.selectWrap, styles.metaInput]}>
                            <TouchableOpacity style={styles.selectButton} onPress={() => setOpenBudgetCategoryMenu((current) => (current === item.id ? null : item.id))}>
                              <Text style={styles.selectButtonText}>{item.category}</Text>
                              <Text style={styles.selectChevron}>{openBudgetCategoryMenu === item.id ? "▲" : "▼"}</Text>
                            </TouchableOpacity>
                            {openBudgetCategoryMenu === item.id ? (
                              <View style={styles.optionList}>
                                {budgetCategories.map((category) => (
                                  <TouchableOpacity key={`${item.id}-${category}`} style={styles.optionRow} onPress={() => { updateBudgetItem(item.id, "category", category); setOpenBudgetCategoryMenu(null); }}>
                                    <Text style={styles.optionText}>{category}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            ) : null}
                          </View>
                          <View style={[styles.selectWrap, styles.metaInput]}>
                            <TouchableOpacity style={styles.selectButton} onPress={() => setOpenBudgetPayerMenu((current) => (current === item.id ? null : item.id))}>
                              <Text style={styles.selectButtonText}>{item.payer}</Text>
                              <Text style={styles.selectChevron}>{openBudgetPayerMenu === item.id ? "▲" : "▼"}</Text>
                            </TouchableOpacity>
                            {openBudgetPayerMenu === item.id ? (
                              <View style={styles.optionList}>
                                {budgetPayerOptions.map((payer) => (
                                  <TouchableOpacity key={`${item.id}-${payer}`} style={styles.optionRow} onPress={() => { updateBudgetItem(item.id, "payer", payer); setOpenBudgetPayerMenu(null); }}>
                                    <Text style={styles.optionText}>{payer}</Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            ) : null}
                          </View>
                          <TextInput value={item.amount ? item.amount.toString() : ""} onChangeText={(value) => updateBudgetItem(item.id, "amount", value)} placeholder="0" placeholderTextColor="#A08F89" style={[styles.textInput, styles.amountInput]} keyboardType="decimal-pad" />
                        </View>
                      </View>
                      <TouchableOpacity style={styles.removeButton} onPress={() => removeBudgetItem(item.id)}>
                        <Text style={styles.removeButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}

                  {!visibleBudgetItems.length ? (
                    <View style={styles.emptyState}>
                      <Text style={styles.feedMeta}>No shared costs yet. Add the first one so the trip feels lighter to carry together.</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.feedMeta}>
                Add a trip first, then the budget can slowly fill in around the plans.
              </Text>
            </View>
          )}
        </View>
      </SectionCard>
    </ScreenSurface>
  );
}

const styles = StyleSheet.create({
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  visitCard: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    backgroundColor: palette.softSun,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F1E3C8",
  },
  visitBadge: {
    width: 78,
    minHeight: 78,
    borderRadius: 22,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#EFDDB7",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  visitNumber: {
    color: palette.text,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
    fontFamily: typography.displayFamily,
    letterSpacing: -0.6,
  },
  visitBadgeLabel: {
    color: palette.berry,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    fontFamily: typography.sansFamilyMedium,
  },
  visitCopy: {
    flex: 1,
    gap: 6,
    paddingTop: 2,
  },
  toolCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-start",
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  toolBadge: {
    minWidth: 76,
    borderRadius: 18,
    backgroundColor: "#FFF1E7",
    borderWidth: 1,
    borderColor: "#F4E6DF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  toolBadgeComplete: {
    backgroundColor: palette.mint,
    borderColor: "#CDEBDD",
  },
  toolBadgeLabel: {
    color: palette.berry,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.6,
    fontFamily: typography.sansFamilyMedium,
  },
  toolCopy: {
    flex: 1,
    gap: 4,
    paddingTop: 1,
  },
  toolIntroCard: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toolIntroBadge: {
    minWidth: 132,
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: "#FFF1E7",
    borderWidth: 1,
    borderColor: "#F4E6DF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toolIntroBadgeLabel: {
    color: palette.berry,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.4,
    lineHeight: 15,
    fontFamily: typography.sansFamilyMedium,
  },
  toolIntroCopy: {
    flex: 1,
    justifyContent: "center",
    minHeight: 56,
    gap: 4,
  },
  toolIntroDetail: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
  toolIntroHint: {
    color: palette.berry,
    fontSize: 12,
    fontFamily: typography.sansFamilyMedium,
  },
  controlGroup: {
    gap: 8,
  },
  controlLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
    letterSpacing: 0.2,
  },
  editorCard: {
    gap: 12,
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  inputStack: {
    gap: 10,
  },
  fieldLabel: {
    color: palette.text,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  requiredMark: {
    color: palette.berry,
  },
  calendarWrap: {
    gap: 8,
  },
  calendarTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  calendarCard: {
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    padding: 10,
    width: "100%",
    maxWidth: 320,
    alignSelf: "center",
    shadowColor: "#2A1B18",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  calendarHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  calendarMonthTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
  },
  calendarMonthButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFF8F2",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  calendarMonthButtonText: {
    color: palette.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: typography.sansFamilyMedium,
  },
  calendarWeekHeader: {
    flexDirection: "row",
    gap: 4,
  },
  calendarWeekLabel: {
    flex: 1,
    color: palette.muted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    fontFamily: typography.sansFamilyMedium,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  calendarDay: {
    width: "13.45%",
    aspectRatio: 0.88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3E6DE",
    backgroundColor: "#FFF8F2",
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayBlank: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  calendarDayRange: {
    backgroundColor: "#FDF0E7",
    borderColor: "#F1D8C8",
  },
  calendarDaySelected: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  calendarDayText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  calendarDayTextBlank: {
    color: "transparent",
  },
  calendarDayRangeText: {
    color: palette.berry,
  },
  calendarDaySelectedText: {
    color: "#FFFFFF",
  },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
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
    fontFamily: typography.sansFamily,
  },
  detailInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  helperMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
    lineHeight: 18,
  },
  rowMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },
  removeText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: typography.sansFamilyMedium,
  },
  emptyState: {
    backgroundColor: "#FFF8F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  itineraryShell: {
    gap: 14,
  },
  itineraryShellWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  itineraryComposerPane: {
    gap: 14,
  },
  itineraryComposerPaneWide: {
    width: 430,
    flexShrink: 0,
    position: "sticky" as any,
    top: 24 as any,
  },
  itineraryTimelinePane: {
    gap: 12,
  },
  itineraryTimelinePaneWide: {
    flex: 1,
    minWidth: 0,
  },
  itineraryList: {
    gap: 12,
  },
  itineraryDatePicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  itineraryDateChip: {
    minWidth: 88,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEDDD1",
    backgroundColor: "#FFFCF8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    gap: 2,
  },
  itineraryDateChipActive: {
    backgroundColor: palette.text,
    borderColor: palette.text,
  },
  itineraryDateChipWeekday: {
    color: palette.berry,
    fontSize: 11,
    fontFamily: typography.sansFamilyMedium,
  },
  itineraryDateChipWeekdayActive: {
    color: "#F4C5D4",
  },
  itineraryDateChipDay: {
    color: palette.text,
    fontSize: 14,
    fontFamily: typography.displayFamily,
    fontWeight: "800",
  },
  itineraryDateChipDayActive: {
    color: "#FFFFFF",
  },
  itineraryTimeRow: {
    flexDirection: "row",
    gap: 10,
  },
  itineraryTimelineCard: {
    gap: 14,
    backgroundColor: "#FFF8F2",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  itineraryTimelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },
  itineraryTimelineHeaderCopy: {
    gap: 4,
  },
  itineraryTimelineDateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  itineraryTimelineDateChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E4D1C8",
    backgroundColor: "#FFFDFB",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  itineraryTimelineDateChipActive: {
    backgroundColor: "#FFF1E7",
    borderColor: "#E9B8A9",
  },
  itineraryTimelineDateChipText: {
    color: palette.text,
    fontSize: 12,
    fontFamily: typography.sansFamilyMedium,
  },
  itineraryTimelineDateChipTextActive: {
    color: palette.berry,
  },
  timelineShell: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  timelineLabels: {
    width: 56,
    paddingTop: 2,
  },
  timelineHourLabelWrap: {
    height: 72,
    justifyContent: "flex-start",
  },
  timelineHourLabel: {
    color: palette.muted,
    fontSize: 11,
    fontFamily: typography.sansFamilyMedium,
  },
  timelineTrack: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#FFFCF9",
    borderWidth: 1,
    borderColor: "#EEDDD1",
    position: "relative",
    overflow: "hidden",
  },
  timelineHourLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#F2E5DD",
  },
  timelineEvent: {
    position: "absolute",
    left: 10,
    right: 10,
    borderRadius: 18,
    backgroundColor: palette.softSun,
    borderWidth: 1,
    borderColor: "#EFDDB7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
    shadowColor: "#2A1B18",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  timelineEventTime: {
    color: palette.berry,
    fontSize: 11,
    fontFamily: typography.sansFamilyMedium,
  },
  timelineEventTitle: {
    color: palette.text,
    fontSize: 15,
    fontFamily: typography.displayFamily,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  timelineEventDetail: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: typography.sansFamily,
  },
  unscheduledCard: {
    gap: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEDDD1",
    backgroundColor: "#FFFCF8",
    padding: 12,
  },
  unscheduledRow: {
    gap: 2,
    paddingTop: 2,
  },
  subsectionBlock: {
    gap: 10,
    paddingTop: 4,
  },
  subsectionTitle: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
  },
  checkEditorRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    backgroundColor: "#FFF8F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  checkToggle: {
    paddingTop: 10,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D7C1CF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkCircleActive: {
    backgroundColor: palette.berry,
    borderColor: palette.berry,
  },
  checkMark: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    fontFamily: typography.sansFamilyMedium,
  },
  totalCard: {
    backgroundColor: palette.softSun,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1E3C8",
    padding: 16,
    gap: 4,
  },
  totalLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  totalValue: {
    color: palette.text,
    fontSize: 28,
    fontWeight: "900",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.5,
  },
  closedSummaryCard: {
    gap: 10,
    backgroundColor: palette.softSun,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#F1E3C8",
    padding: 16,
  },
  tripSummaryCard: {
    gap: 10,
    backgroundColor: "#FFF8F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  weatherCard: {
    gap: 6,
    backgroundColor: "#FFF8F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  summaryHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  summaryBadge: {
    width: 88,
    minHeight: 88,
    borderRadius: 22,
    backgroundColor: palette.softSun,
    borderWidth: 1,
    borderColor: "#F1E3C8",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 2,
  },
  weatherBadge: {
    width: 88,
    minHeight: 88,
    borderRadius: 22,
    backgroundColor: palette.softSun,
    borderWidth: 1,
    borderColor: "#F1E3C8",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 2,
  },
  weatherIcon: {
    fontSize: 22,
    lineHeight: 24,
  },
  summaryValue: {
    color: palette.text,
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 28,
    fontFamily: typography.displayFamily,
    letterSpacing: -0.4,
  },
  weatherTemperature: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 21,
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
  },
  summaryLabel: {
    color: palette.berry,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: typography.sansFamilyMedium,
  },
  budgetRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: "#FFF8F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  budgetRowDisabled: {
    opacity: 0.7,
  },
  budgetShell: {
    gap: 14,
  },
  budgetShellWide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  budgetComposerPane: {
    gap: 14,
  },
  budgetComposerPaneWide: {
    width: 420,
    flexShrink: 0,
    position: "sticky" as any,
    top: 24 as any,
  },
  budgetLedgerPane: {
    gap: 12,
  },
  budgetLedgerPaneWide: {
    flex: 1,
    minWidth: 0,
  },
  budgetLedgerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  budgetQuickAddCard: {
    gap: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFF8F2",
    padding: 14,
  },
  budgetQuickAddList: {
    gap: 10,
  },
  budgetStarterGrid: {
    gap: 8,
  },
  budgetStarterChip: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEDDD1",
    backgroundColor: "#FFFCF8",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  budgetStarterTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: typography.sansFamilyMedium,
  },
  budgetStarterMeta: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: typography.sansFamily,
  },
  budgetEditorRow: {
    gap: 10,
    backgroundColor: "#FFF8F2",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
  },
  budgetFieldStack: {
    gap: 10,
  },
  budgetMetaRow: {
    flexDirection: "row",
    gap: 10,
  },
  metaInput: {
    flex: 1,
  },
  amountInput: {
    width: 96,
  },
  selectWrap: {
    gap: 6,
  },
  selectButton: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectButtonText: {
    color: palette.text,
    fontSize: 14,
    flex: 1,
    fontFamily: typography.sansFamily,
  },
  selectPlaceholder: {
    color: "#A08F89",
  },
  selectChevron: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "800",
    fontFamily: typography.sansFamilyMedium,
  },
  optionList: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  scrollOptionList: {
    maxHeight: 240,
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
    fontWeight: "600",
    fontFamily: typography.sansFamilyMedium,
  },
  suggestionList: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  suggestionRow: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F5E8E2",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  suggestionTitle: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    fontFamily: typography.sansFamilyMedium,
  },
  suggestionMeta: {
    color: palette.berry,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.2,
    fontFamily: typography.sansFamilyMedium,
  },
  removeButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#FFF1E7",
    borderWidth: 1,
    borderColor: "#F4E6DF",
  },
  removeButtonText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: typography.sansFamilyMedium,
  },
  secondaryAction: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryActionText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: typography.sansFamilyMedium,
  },
  addBudgetText: {
    color: palette.berry,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
    fontFamily: typography.sansFamilyMedium,
  },
  feedTitle: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "800",
    fontFamily: typography.displayFamily,
    letterSpacing: -0.2,
  },
  feedMeta: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.sansFamily,
  },
});
