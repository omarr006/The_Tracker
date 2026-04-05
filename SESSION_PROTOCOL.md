# The Tracker Project – Session Protocol

## Session Overview
This protocol documents all significant actions, decisions, issues, and resolutions from the Copilot CLI session for The Tracker app. It is intended as a technical log for future reference and onboarding.

---

## 1. Project Initialization
- Initialized Expo project with TypeScript (Expo SDK 54).
- Created essential config files: .gitignore, .env, .env.example, README.md, package.json, tsconfig.json.
- Installed dependencies: Expo, React Navigation, @supabase/supabase-js, and related packages.
- Resolved EMFILE error (too many open files) by increasing ulimit to 10240 for Metro bundler compatibility.
- Upgraded from Expo SDK 51 to 54 using `npx expo install --fix` for latest compatibility.

## 2. Supabase Backend Setup
- Created new Supabase project (https://wdoruanbyftqdauvaaqw.supabase.co).
- Added EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env (excluded from git).
- Implemented src/services/supabase.ts to initialize and export Supabase client.
- Verified backend connectivity using `auth.getSession()` (replaced initial _health table check).

## 3. Authentication Flow
- Developed LoginScreen.tsx with email/password signup and login toggle.
- Developed DashboardScreen.tsx to display user email and provide logout functionality.
- Configured App.tsx with NavigationContainer and stack navigator for screen routing.
- Fixed render error: secureTextEntry prop on TextInput required explicit `{true}` (React Native quirk).
- Disabled email confirmation in Supabase Auth settings for development (users auto-confirmed).
- Auth flow tested: signup, login, dashboard navigation all functional.

## 4. Git Workflow & Structure
- All changes committed with descriptive messages and pushed to GitHub (omarr006/The_Tracker).
- Maintained clean structure: src/screens/, src/services/, root-level config and entry files.
- Main branch used for MVP; plan to branch for major features (AI, refactors).

## 5. Caveman Mode (Communication Style)
- Created caveman-mode.instructions.md in VS Code user prompts folder.
- Activated terse, direct communication style for all Copilot CLI responses.
- Can be deactivated by user request.

## 6. OpenAI Integration Preparation
- User funded OpenAI account with $5 for initial testing.
- Researched GPT-5.4 nano and mini models for cost-effective AI parsing (nano recommended for 90% of requests).
- Calculated $5 covers ~14,000 workout entries at nano pricing.
- API key was exposed in chat by accident; immediately revoked and explained risk.
- Provided guidance: store API key only in Supabase Edge Functions secrets (never in frontend or git).

## 7. Issues & Resolutions
- EMFILE error: Resolved by increasing file watcher limit.
- Expo version mismatch: Fixed by upgrading SDK and dependencies.
- Supabase connection test: Switched from non-existent _health table to auth.getSession().
- Render error: Fixed secureTextEntry prop type.
- Email confirmation: Disabled for dev to streamline testing.
- API key exposure: Revoked immediately, user educated on secret management.

## 8. Next Steps
- User must create new OpenAI API key and add to Supabase Edge Functions secrets.
- Begin implementation of workout entry screen and Edge Function for AI parsing.
- Remaining MVP tasks: chart generation, free tier query limits, error handling, polish.

---

## Notes
- This protocol is a living document for the current session.
- If session is lost, use this file and plan.md to resume work.
- All code and configuration changes are committed to GitHub for version control.
