# Collaboration Guide

This project is set up for lightweight prototype collaboration between teammates working in GitHub and reviewing changes through the public Expo web draft.

## Working Agreement

- Keep `main` stable and shareable.
- Make changes in short focused batches.
- Pull before starting work.
- Push often enough that nobody drifts too far apart.
- Use the public draft URL for review checkpoints, not for every tiny experiment.

## Daily Workflow

### 1. Sync before editing

```bash
git checkout main
git pull origin main
```

### 2. Create a branch for your work

Use a short branch name that explains the feature or polish pass.

```bash
git checkout -b your-name/feature-name
```

Examples:

- `zoe/trips-calendar-picker`
- `teammate/people-edit-flow`
- `zoe/journal-photo-upload`

### 3. Run the app locally

```bash
npm start
```

For web review:

```bash
npm run web
```

### 4. Typecheck before pushing

```bash
npm run typecheck
```

### 5. Commit clearly

```bash
git add .
git commit -m "Add compact trip calendar picker"
```

### 6. Push your branch

```bash
git push -u origin your-name/feature-name
```

### 7. Merge carefully

Before merging into `main`:

- make sure the feature works locally
- run `npm run typecheck`
- pull the latest `main`
- resolve any conflicts carefully

Then either:

- open a pull request in GitHub, or
- if you are intentionally working directly together on `main`, coordinate first so only one person lands changes at a time

## Fast Review Flow

### Local review

Use the local web preview while building:

- `http://localhost:19007`

### Shared review

Publish a draft when you want feedback from your partner, friends, or collaborator:

```bash
npm run publish:draft
```

Stable draft URL:

- `https://same-time-web-draft--draft.expo.app`

## Editing the Same Area

If both collaborators need to touch the same screen:

- decide who owns the main structural change
- let the other person wait or work in a different file
- merge one branch first
- have the second person pull latest `main` before finishing

This project currently has high-churn files like:

- `src/screens/app/TripsScreen.tsx`
- `src/screens/app/ConnectionsScreen.tsx`
- `src/data/mockData.ts`
- `src/types.ts`

Try not to make unrelated edits in those files during the same pass.

## Good Division of Work

A simple way to avoid collisions:

- one person owns `UI polish`
- one person owns `data flow / interactions`
- one person owns `copy / seed content`

Or split by page:

- `Home + Shared`
- `People + Chat`
- `Connect + Trips`

## If Something Breaks

1. Run:

```bash
npm run typecheck
```

2. Check what changed:

```bash
git status
git diff
```

3. Pull latest `main` if you have been away from the repo.
4. If conflicts show up, resolve them file by file instead of force resetting.

## Recommended Team Rhythm

- Use local preview for active building.
- Publish to the draft URL for milestone reviews.
- Push to GitHub at the end of each focused session.
- Keep commit messages clear enough that the other person can understand what changed quickly.
