# The Tracker - AI Workout Coach

An intelligent workout tracking mobile app powered by AI agents.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Expo CLI installed globally: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials (coming in next step)
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device/simulator:**
   - **iOS:** Press `i` in terminal or run `npm run ios`
   - **Android:** Press `a` in terminal or run `npm run android`
   - **Web:** Press `w` in terminal or run `npm run web`

## 📱 Current Status

**Step 1 Complete:** ✅ Bare minimum Expo app running  
**Next Step:** Connect to Supabase backend

## 🛠 Tech Stack

- **Frontend:** React Native + Expo (TypeScript)
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **AI:** OpenAI GPT-4
- **Charts:** Python (matplotlib) in Edge Functions
- **Subscriptions:** RevenueCat (coming in Phase 2)

## 📋 Development Progress

See [PLAN.md](./PLAN.md) for complete implementation roadmap.
