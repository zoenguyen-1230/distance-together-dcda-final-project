# Same Time

`Same Time` is a mobile app concept for long-distance relationships across the full spectrum: romantic partners, close friends, siblings, parents, and chosen family. The name comes from the feeling behind “same time next week?”:

- distance does not have to end the ritual
- life can still be shared, updated, and planned together
- connection can stay active through memory, routine, anticipation, and care

The core idea is that staying close is not only about messaging. It also comes from ritual, emotional visibility, shared memory, and planning future time together.

This starter repo now gives you a structured Expo + React Native foundation with:

- authentication entry flow
- Supabase-ready auth wiring with a demo fallback when env keys are missing
- React Navigation tab-based app shell
- linked social profile selections
- people management for partners, friends, and family
- chat UI for text, photos, voice memos, and video messages
- daily check-in prompts
- mood and wellness sharing
- shared journal and memory log
- time capsule messages
- shared calendar
- next-visit countdown
- trip editor with calendar selection
- trip toolkit for flights, weather, packing, and budget
- date-night idea generator

## Product Framework

### 1. Core experience pillars

- `Presence`: chat, media messages, mood updates, quick daily prompts
- `Ritual`: check-ins, shared routines, recurring prompts, calendar moments
- `Memory`: journal entries, saved photos, voice notes, time capsules
- `Anticipation`: visit countdowns, planning boards, date-night ideas

### 2. Primary app sections

- `Home`: overview of connection health, prompt of the day, mood updates, countdown
- `People`: add and manage friends, family, and partners, plus social profile context
- `Chat`: asynchronous messaging with rich media but no live calling
- `Shared`: journal, time capsule, and calendar views
- `Connect`: smart call scheduling and date-night ideas
- `Trips`: countdowns, travel planning, flights, weather, packing, and budget

### 3. Suggested backend model later

When you are ready to make this real, these are the first backend collections/tables to design:

- `users`
- `profiles`
- `relationships`
- `relationship_members`
- `conversations`
- `messages`
- `media_assets`
- `checkin_prompts`
- `checkin_responses`
- `journal_entries`
- `time_capsules`
- `calendar_events`
- `visit_plans`
- `mood_updates`

### 4. Good MVP boundary

If we want a realistic first version, I would build it in this order:

1. Auth + profile creation
2. Add connections and invite flow
3. Chat with text, photos, and voice notes
4. Daily prompts + mood sharing
5. Shared journal + countdown
6. Calendar + time capsule
7. Date generator polish and recommendations

## Architecture

The app is organized into a few clear layers:

- `src/providers`: auth state and session lifecycle
- `src/navigation`: root stack and bottom tabs
- `src/screens`: auth and feature screens
- `src/components/ui`: shared presentation building blocks
- `src/lib`: backend clients
- `src/config`: environment configuration

## Supabase Setup

Create a Supabase project, then copy `.env.example` to `.env` and fill in:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

With those keys present, the auth screen uses real Supabase email sign-up and sign-in. Without them, the app runs in a local demo mode so you can keep designing and iterating.

To bootstrap the database, open the Supabase SQL editor and run:

`supabase/schema.sql`

That script creates the core tables, a profile-creation trigger for new auth users, and starter row-level security policies for shared relationship spaces.

## Local Development

### Install

```bash
npm install
```

### Run

```bash
npm start
```

Then open the Expo app on a simulator or device.

## Current Foundation

This repo now includes:

- a real navigation structure instead of a single-screen prototype
- an auth provider with sign-in, sign-up, session handling, and sign-out
- a Supabase client using AsyncStorage-backed session persistence
- modular feature screens for Home, People, Chat, Shared, and Plans
- a demo-safe fallback so the app still opens before backend credentials are added

## Web Draft

The current shareable draft URL is:

- `https://same-time-web-draft--draft.expo.app`

To publish updates to that same draft URL:

```bash
npm run publish:draft
```

Or split it into two steps:

```bash
npm run export:web
npm run deploy:draft
```

Expo Hosting uses immutable deployments plus aliases. The `draft` alias will always point at the latest deployment you publish with `npm run deploy:draft`.

## GitHub

This repo is currently connected to GitHub. If you rename the repository to match the product brand, update this section and the local `origin` remote to the new URL.

The recommended collaboration workflow is:

1. Pull latest `main`
2. Create a short feature branch
3. Make changes and run `npm run typecheck`
4. Push your branch
5. Merge after review or coordination

See:

- `CONTRIBUTING.md`

## Custom Domain Later

Expo Hosting supports custom domains on the production deployment. The current `draft` URL is a preview alias, which is ideal for sharing prototypes.

When you want a custom domain later:

1. Promote a deployment to production.
2. Open the Expo Hosting settings.
3. Add your domain and follow the DNS verification steps.

Expo notes that custom domains are tied to the production deployment and are a paid-plan feature.

## Recommended Next Step

The best next move is to choose one of these directions:

1. Turn this into a real multi-screen app with Expo Router or React Navigation.
2. Add Firebase or Supabase for real auth, storage, and syncing.
3. Design the real data model and API contracts before backend implementation.
4. Refine the visual identity and brand voice around `Same Time`: warmth, continuity, and “same time next week?” energy.

If you want, I can take the next pass and turn this into a production-minded starter with real navigation, reusable components, and a backend setup.
