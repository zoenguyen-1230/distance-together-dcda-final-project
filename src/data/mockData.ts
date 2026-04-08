import {
  BudgetItem,
  CalendarEvent,
  CallWindow,
  CheckInPrompt,
  Connection,
  FlightWindow,
  FlightTrackerEntry,
  ItineraryItem,
  JournalEntry,
  Message,
  MoodUpdate,
  PackingItem,
  SocialPlatform,
  TimeCapsule,
  TripToolkitItem,
  VisitPlan,
  WeatherForecast,
} from "../types";

export const socialPlatforms: SocialPlatform[] = [
  "Instagram",
  "Spotify",
  "TikTok",
  "Facebook",
  "X",
  "BeReal",
];

export const connections: Connection[] = [
  {
    id: "conn-1",
    name: "Sean",
    relationshipType: "partner",
    location: "San Francisco, CA",
    note: "Sends a good morning text every morning before class.",
    timezone: "PT",
    photoLabel: "Museum fit photo",
    accent: "#FFD4D8",
    linkedSocials: ["Instagram", "Spotify"],
    accountStatus: "Synced profile + shared playlist",
    photoUri: undefined,
  },
  {
    id: "conn-2",
    name: "Trang",
    relationshipType: "friend",
    location: "Hanoi, VN",
    note: "Plays Buzzfeed and listens to GREY D's latest album release.",
    timezone: "ICT",
    photoLabel: "Cafe and playlist profile photo",
    accent: "#DFF3FF",
    linkedSocials: ["Spotify", "TikTok"],
    accountStatus: "Synced music + short-form profile",
    photoUri: undefined,
  },
  {
    id: "conn-4",
    name: "Phuc",
    relationshipType: "friend",
    location: "Washington, DC",
    note: "Fall trip to DC",
    timezone: "ET",
    photoLabel: "Monument walk photo",
    accent: "#E8F8F2",
    linkedSocials: ["Instagram"],
    accountStatus: "Synced photo profile",
    photoUri: undefined,
  },
  {
    id: "conn-5",
    name: "Julie",
    relationshipType: "friend",
    location: "New York, NY",
    note: "Catches up with Julie during NYC April trip.",
    timezone: "ET",
    photoLabel: "NYC rooftop photo",
    accent: "#F4E7FF",
    linkedSocials: ["Instagram", "Facebook"],
    accountStatus: "Synced profile + family graph",
    photoUri: undefined,
  },
  {
    id: "conn-3",
    name: "Hien",
    relationshipType: "family",
    location: "Hanoi, VN",
    note: "Calls Mom for daily updates at 7 pm.",
    timezone: "ICT",
    photoLabel: "Family dinner photo",
    accent: "#FFF1E7",
    linkedSocials: ["Facebook"],
    accountStatus: "Synced family updates",
    photoUri: undefined,
  },
];

export const conversations: Message[] = [
  {
    id: "msg-1",
    connectionId: "conn-1",
    author: "connection",
    type: "Text",
    body: "Happy Tue's Day Tuesday",
    sentAt: "8:12 AM",
  },
  {
    id: "msg-2",
    connectionId: "conn-1",
    author: "self",
    type: "Text",
    body: "Saving that spot for our Austin trip. I also added Wednesday FaceTime to the shared calendar.",
    sentAt: "8:25 AM",
  },
  {
    id: "msg-3",
    connectionId: "conn-1",
    author: "connection",
    type: "Photo",
    body: "Photo drop: Yogurt bowl and banana for breakfast baby",
    sentAt: "8:31 AM",
  },
  {
    id: "msg-4",
    connectionId: "conn-1",
    author: "self",
    type: "Video message",
    body: "Recorded a quick update from Dallas so it feels like you were here.",
    sentAt: "9:04 AM",
  },
];

export const promptDeck = [
  "What made you feel most seen today?",
  "How was your day, really?",
  "What's one small thing I can do for you from afar this week?",
  "What memory are you replaying lately?",
];

export const checkInPrompts: CheckInPrompt[] = [
  {
    id: "prompt-1",
    connectionId: "conn-1",
    promptText: "How was your day, really?",
    sentAt: "Sent by Sean • 1 hr ago",
    direction: "incoming",
  },
  {
    id: "prompt-2",
    connectionId: "conn-3",
    promptText: "What's one small thing I can do for you from afar this week?",
    sentAt: "Sent by Hien • This morning",
    direction: "incoming",
  },
  {
    id: "prompt-3",
    connectionId: "conn-5",
    promptText: "What memory are you replaying lately?",
    sentAt: "Sent by Julie • Yesterday",
    direction: "incoming",
  },
];

export const journalEntries: JournalEntry[] = [
  {
    id: "journal-1",
    date: "March 29",
    title: "Homecook Night",
    body: "We cooked sisig and Vietnamese thit rang chay canh at home while playing music and watching You've Got Mail.",
    photos: [
      { id: "journal-1-photo-1", label: "sisig plating" },
      { id: "journal-1-photo-2", label: "thit rang canh" },
      { id: "journal-1-photo-3", label: "movie night setup" },
    ],
    participantIds: ["conn-1"],
  },
  {
    id: "journal-2",
    date: "March 28",
    title: "Fort Worth Date",
    body: "We grabbed coffee at Ampersand, walked to Kimbell Art Museum and discussed about art, life, and future. Then we had lunch at Terry Black's Barbecue, did window shopping at Urban Outfitters, strolled around Fort Worth Botanic Garden, did grocery shopping at Target, and ended the night with sashimi and handrolls at Hatsuyuki Handroll Bar.",
    photos: [
      { id: "journal-2-photo-1", label: "Ampersand coffee" },
      { id: "journal-2-photo-2", label: "Kimbell walk" },
      { id: "journal-2-photo-3", label: "Hatsuyuki handrolls" },
    ],
    participantIds: ["conn-1"],
  },
];

export const moodUpdates: MoodUpdate[] = [
  {
    id: "mood-1",
    name: "Sean",
    mood: "hopeful",
    energy: "steady",
    health: "slept well",
    updatedAt: "Updated 20 min ago",
    color: "#FFD8DE",
  },
  {
    id: "mood-2",
    name: "Trang",
    mood: "stretched thin",
    energy: "low",
    health: "needs a break",
    updatedAt: "Updated 1 hr ago",
    color: "#DDF2FF",
  },
  {
    id: "mood-3",
    name: "Julie",
    mood: "curious",
    energy: "steady",
    health: "feeling grounded",
    updatedAt: "Updated 2 hr ago",
    color: "#F3E4FF",
  },
  {
    id: "mood-4",
    name: "Hien",
    mood: "warm",
    energy: "gentle",
    health: "resting at home",
    updatedAt: "Updated 3 hr ago",
    color: "#FFF0E2",
  },
  {
    id: "mood-5",
    name: "Phuc",
    mood: "excited",
    energy: "high",
    health: "out and about",
    updatedAt: "Updated 4 hr ago",
    color: "#E7F8EE",
  },
];

export const timeCapsules: TimeCapsule[] = [
  {
    id: "capsule-1",
    title: "Open this on our 6 month mark",
    from: "You",
    body: "I hope future us still finds ways to make distance feel smaller. I love how intentional we are becoming.",
    unlockMode: "date",
    unlockDate: "September 17, 2026",
    participantIds: ["conn-1"],
  },
  {
    id: "capsule-2",
    title: "For the next hard day",
    from: "Sean",
    body: "Open when you miss me and need a reminder that we are building something real, even from far away.",
    unlockMode: "anytime",
    unlockDate: "Unlock anytime with permission",
    participantIds: ["conn-1"],
  },
];

export const calendarEvents: CalendarEvent[] = [
  {
    id: "event-1",
    month: "APR",
    day: "12",
    title: "Sunday check-in ritual",
    detail: "9:00 PM CT | Big Sur trip/NFL in Dallas updates + photo recap + mood share",
    dateValue: "2026-04-12",
    participantIds: ["conn-1"],
  },
  {
    id: "event-2",
    month: "APR",
    day: "24",
    title: "Weekend trip to Austin, TX",
    detail: "Austin | Try new cuisine + picnic date + sightseeing",
    dateValue: "2026-04-24",
    participantIds: ["conn-1"],
  },
  {
    id: "event-3",
    month: "MAY",
    day: "18",
    title: "Family visit to San Francisco, CA",
    detail: "San Francisco | Family dinner",
    dateValue: "2026-05-18",
    participantIds: ["conn-3"],
  },
];

export const nextVisit: VisitPlan = {
  id: "visit-1",
  title: "Fort Worth time together",
  date: "April 20, 2026",
  startDate: "2026-04-20",
  location: "Fort Worth, TX",
  daysAway: 13,
  plan: "Shared checklist: arrival details set, favorite spots saved, and time together protected.",
  participantIds: ["conn-1"],
};

export const upcomingVisits: VisitPlan[] = [
  nextVisit,
  {
    id: "visit-2",
    title: "San Francisco time together",
    date: "May 18, 2026",
    startDate: "2026-05-18",
    location: "San Francisco, CA",
    daysAway: 41,
    plan: "Shared checklist: museum, family dinner, airport drop-off, Yosemite weekend trip.",
    participantIds: ["conn-1", "conn-3"],
  },
  {
    id: "visit-3",
    title: "New York City time together",
    date: "June 12, 2026",
    startDate: "2026-06-12",
    location: "New York, NY",
    daysAway: 66,
    plan: "Shared checklist: IKEA date, boat rowing date at Central Park, Chinatown food crawl, West Village date.",
    participantIds: ["conn-1"],
  },
];

export const nextVisitItinerary: ItineraryItem[] = [
  {
    id: "itinerary-1",
    visitTitle: "Fort Worth time together",
    time: "Fri PM",
    title: "Arrival + reset evening",
    detail: "Airport pickup, unpack, cozy dinner, and low-key catch-up time.",
  },
  {
    id: "itinerary-2",
    visitTitle: "Fort Worth time together",
    time: "Sat AM",
    title: "Coffee + museum block",
    detail: "Slow morning coffee, one intentional activity, and photo moments for the journal.",
  },
  {
    id: "itinerary-3",
    visitTitle: "Fort Worth time together",
    time: "Sat PM",
    title: "Dinner date + neighborhood walk",
    detail: "Try one saved restaurant, then do a no-rush walk and memory log recap.",
  },
  {
    id: "itinerary-4",
    visitTitle: "Fort Worth time together",
    time: "Sun",
    title: "Buffer time before goodbye",
    detail: "Leave room for grocery run, packing, and one final relaxed meal together.",
  },
  {
    id: "itinerary-5",
    visitTitle: "San Francisco time together",
    time: "Day 1",
    title: "Family dinner landing night",
    detail: "Keep the first evening easy with a family meal and early reset.",
  },
  {
    id: "itinerary-6",
    visitTitle: "San Francisco time together",
    time: "Day 2",
    title: "Museum + city wandering",
    detail: "Build in one museum block, a favorite bakery stop, and time to browse without rushing.",
  },
  {
    id: "itinerary-7",
    visitTitle: "New York City time together",
    time: "Morning",
    title: "IKEA date start",
    detail: "Start with coffee, then do the IKEA date before heading back into the city.",
  },
  {
    id: "itinerary-8",
    visitTitle: "New York City time together",
    time: "Afternoon",
    title: "Chinatown crawl + West Village",
    detail: "Keep this block open for flexible food stops and one slower neighborhood walk.",
  },
];

export const smartCallWindows: CallWindow[] = [
  {
    id: "call-1",
    person: "Sean",
    energyFit: "steady",
    title: "Best overlap this week: 8:30 PM CT / 6:30 PM PT",
    detail: "Best for Sean before late-night study time and after your workday wind-down.",
    confidence: "High match",
  },
  {
    id: "call-2",
    person: "Sean",
    energyFit: "low",
    title: "Quick reset slot: 12:15 PM CT / 10:15 AM PT",
    detail: "A lighter midday check-in when you both only have energy for a short call or voice note exchange.",
    confidence: "Low effort",
  },
  {
    id: "call-3",
    person: "Trang",
    energyFit: "steady",
    title: "Trang window: 8:00 PM CT / 8:00 AM ICT",
    detail: "Good for quick check-ins before her day gets busy and while your energy is still solid.",
    confidence: "Good for short calls",
  },
  {
    id: "call-4",
    person: "Hien",
    energyFit: "high",
    title: "Family update window: 6:00 AM CT / 6:00 PM ICT",
    detail: "Lines up well with Hien's 7 PM family update habit and your morning routine.",
    confidence: "Best ritual slot",
  },
];

export const tripToolkit: TripToolkitItem[] = [
  {
    id: "toolkit-1",
    title: "Cheap flight dates",
    detail: "Flag flexible windows around the trip so you can compare midweek vs weekend pricing before booking.",
  },
  {
    id: "toolkit-2",
    title: "Weather forecast",
    detail: "Track the expected temperature range and rain risk for any trip city you add.",
  },
  {
    id: "toolkit-3",
    title: "What to pack",
    detail: "Start shared packing lists by city: layers, date-night outfit, chargers, gifts, and airport essentials.",
  },
  {
    id: "toolkit-4",
    title: "Shared budget",
    detail: "Track flights, meals, museums, groceries, and local transport so the trip feels organized instead of stressful.",
  },
];

export const cheapFlightWindows: FlightWindow[] = [
  {
    id: "flight-1",
    trip: "Fort Worth, TX",
    startDate: "2026-04-18",
    endDate: "2026-04-21",
    price: 214,
    note: "Best fare if you leave early Saturday and return Tuesday morning.",
  },
  {
    id: "flight-2",
    trip: "Fort Worth, TX",
    startDate: "2026-04-19",
    endDate: "2026-04-22",
    price: 246,
    note: "Slightly higher, but gives you a slower Sunday start together.",
  },
  {
    id: "flight-3",
    trip: "San Francisco, CA",
    startDate: "2026-05-16",
    endDate: "2026-05-19",
    price: 188,
    note: "Cheapest midweek-adjacent window for family dinner and museum plans.",
  },
  {
    id: "flight-4",
    trip: "San Francisco, CA",
    startDate: "2026-05-17",
    endDate: "2026-05-20",
    price: 225,
    note: "More relaxed departure timing with slightly higher evening pricing.",
  },
  {
    id: "flight-5",
    trip: "New York, NY",
    startDate: "2026-06-11",
    endDate: "2026-06-14",
    price: 272,
    note: "Strong option if you want the full weekend for Chinatown and West Village.",
  },
  {
    id: "flight-6",
    trip: "New York, NY",
    startDate: "2026-06-12",
    endDate: "2026-06-15",
    price: 301,
    note: "More flexible return day, but the Monday leg is pricier.",
  },
];

export const trackedFlights: FlightTrackerEntry[] = [
  {
    id: "tracked-flight-1",
    trip: "Fort Worth, TX",
    connectionId: "conn-1",
    direction: "arrival",
    travelDate: "2026-04-20",
    legs: [
      {
        id: "tracked-flight-1-leg-1",
        flightCode: "AA 1198",
        routeNote:
          "Sean lands mid-morning from San Francisco so you can start the trip together.",
      },
    ],
  },
  {
    id: "tracked-flight-2",
    trip: "San Francisco, CA",
    connectionId: "conn-3",
    direction: "arrival",
    travelDate: "2026-05-18",
    legs: [
      {
        id: "tracked-flight-2-leg-1",
        flightCode: "UA 201",
        routeNote: "Hien arrives in time for the family dinner block.",
      },
    ],
  },
];

export const packingChecklist: PackingItem[] = [
  {
    id: "packing-1",
    label: "Layers for cool evenings",
    trip: "San Francisco, CA",
  },
  {
    id: "packing-2",
    label: "Date-night outfit",
    trip: "Fort Worth, TX",
  },
  {
    id: "packing-3",
    label: "Portable charger and cords",
    trip: "New York, NY",
  },
  {
    id: "packing-4",
    label: "Small gift and handwritten note",
    trip: "Any trip",
  },
];

export const sharedBudgetSeed: BudgetItem[] = [
  {
    id: "budget-1",
    label: "Fort Worth coffee date",
    amount: 18,
    category: "Food",
    payer: "You",
    trip: "Fort Worth, TX",
  },
  {
    id: "budget-2",
    label: "Museum tickets",
    amount: 32,
    category: "Activities",
    payer: "Sean",
    trip: "Fort Worth, TX",
  },
  {
    id: "budget-6",
    label: "Family dinner reservation",
    amount: 64,
    category: "Food",
    payer: "Sean",
    trip: "San Francisco, CA",
  },
  {
    id: "budget-7",
    label: "Central Park boat rental",
    amount: 25,
    category: "Activities",
    payer: "Split",
    trip: "New York, NY",
  },
];

export const budgetSuggestions: BudgetItem[] = [
  {
    id: "budget-3",
    label: "Airport rideshare",
    amount: 42,
    category: "Transport",
    payer: "You",
    trip: "Fort Worth, TX",
  },
  {
    id: "budget-4",
    label: "Shared grocery run",
    amount: 36,
    category: "Food",
    payer: "Split",
    trip: "San Francisco, CA",
  },
  {
    id: "budget-5",
    label: "Botanic Garden tickets",
    amount: 28,
    category: "Activities",
    payer: "Sean",
    trip: "Fort Worth, TX",
  },
  {
    id: "budget-8",
    label: "Yosemite gas split",
    amount: 48,
    category: "Transport",
    payer: "Split",
    trip: "San Francisco, CA",
  },
  {
    id: "budget-9",
    label: "Chinatown snack crawl",
    amount: 34,
    category: "Food",
    payer: "You",
    trip: "New York, NY",
  },
];

export const cityWeatherForecasts: WeatherForecast[] = [
  {
    id: "weather-1",
    city: "Fort Worth, TX",
    icon: "⛅",
    summary: "Warm afternoons with one possible rainy evening.",
    temperatureRange: "68-84 F",
    packingNote: "Bring light layers and one umbrella.",
  },
  {
    id: "weather-2",
    city: "San Francisco, CA",
    icon: "🌤",
    summary: "Cool mornings, windy evenings, mostly clear.",
    temperatureRange: "54-67 F",
    packingNote: "Pack a jacket and closed-toe shoes.",
  },
  {
    id: "weather-3",
    city: "New York, NY",
    icon: "🌥",
    summary: "Mild daytime weather with cooler nights.",
    temperatureRange: "57-74 F",
    packingNote: "Layer for evening walks and transit.",
  },
];

export const dateIdeas = [
  "Cook the same comfort meal and rate each plate like a tiny food show.",
  "Trade voice memos telling the story behind one old photo each.",
  "Build a shared playlist, then journal one memory each song unlocks.",
  "Plan a dream day in the city you'll visit next and save it to the calendar.",
  "Swap family recipes and compare the stories behind each dish.",
  "Make a tiny two-person book, movie, or documentary club and debrief after one chapter or episode.",
  "Do a friendship photo scavenger hunt and send what you find from your neighborhoods.",
  "Create a shared nostalgia list of songs, snacks, shows, or places you still talk about.",
  "Send each other one life update question and answer it honestly over voice notes.",
  "Build a meme, article, or reel exchange around one theme and rank your favorites.",
  "Do a low-pressure life admin date and help each other finish one task you have both been avoiding.",
  "Take a walk at the same time and compare what your streets, parks, or skies look like.",
];

export const composerActions = [
  "Type a message",
  "Send photo",
  "Voice memo",
  "Video message",
];
