# ParkAtlas

ParkAtlas helps users track visits, hikes, camps, and road-trip stops across all 63 U.S. National Parks.

## Tech Stack

- Expo + React Native
- Expo Router
- TypeScript

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npx expo start
   ```

3. Open on iOS Simulator, Android Emulator, or Expo Go from the terminal menu.

## Project Structure

- `app/` route screens and navigation
- `components/` reusable UI components
- `hooks/` auth, activity, and visit state
- `data/` static park data
- `utils/` search, matching, and helper functions

## Notes

- Sign in is optional for browsing core park content.
- Account features are available when a user signs in.
