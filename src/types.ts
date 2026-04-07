export type RelationshipType = "partner" | "friend" | "family";

export type ConnectionFilter = "all" | RelationshipType;

export type SocialPlatform =
  | "Instagram"
  | "Spotify"
  | "TikTok"
  | "Facebook"
  | "X"
  | "BeReal";

export type AppTabParamList = {
  Home: undefined;
  People: undefined;
  Chat: undefined;
  Shared: undefined;
  Plans: undefined;
  Trips: undefined;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export interface Connection {
  id: string;
  name: string;
  relationshipType: RelationshipType;
  location: string;
  note: string;
  timezone: string;
  photoLabel: string;
  accent: string;
  linkedSocials: SocialPlatform[];
  accountStatus: string;
}

export interface CurrentUserProfile {
  displayName: string;
  location: string;
  timezone: string;
  relationshipFocus: string;
  note: string;
  linkedSocials: SocialPlatform[];
}

export interface Message {
  id: string;
  from: string;
  type: "Text" | "Photo" | "Voice memo" | "Video message";
  body: string;
  sentAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  body: string;
  photos: string[];
}

export interface MoodUpdate {
  id: string;
  name: string;
  mood: string;
  energy: string;
  health: string;
  updatedAt: string;
  color: string;
}

export interface TimeCapsule {
  id: string;
  title: string;
  from: string;
  unlockDate: string;
}

export interface CalendarEvent {
  id: string;
  month: string;
  day: string;
  title: string;
  detail: string;
}

export interface VisitPlan {
  id: string;
  title: string;
  date: string;
  startDate: string;
  endDate?: string;
  location: string;
  daysAway: number;
  plan: string;
  participantIds: string[];
}

export interface ItineraryItem {
  id: string;
  visitTitle: string;
  time: string;
  title: string;
  detail: string;
}

export interface CallWindow {
  id: string;
  person: string;
  energyFit: "low" | "steady" | "high";
  title: string;
  detail: string;
  confidence: string;
}

export interface TripToolkitItem {
  id: string;
  title: string;
  detail: string;
}

export interface FlightWindow {
  id: string;
  trip: string;
  startDate: string;
  endDate?: string;
  price: number;
  note: string;
}

export interface FlightTrackerEntry {
  id: string;
  trip: string;
  connectionId: string;
  direction: "arrival" | "departure";
  travelDate: string;
  flightCode: string;
  routeNote: string;
}

export interface PackingItem {
  id: string;
  label: string;
  trip: string;
}

export interface BudgetItem {
  id: string;
  label: string;
  amount: number;
  category: string;
  payer: string;
  trip: string;
}

export interface WeatherForecast {
  id: string;
  city: string;
  icon: string;
  summary: string;
  temperatureRange: string;
  packingNote: string;
}
