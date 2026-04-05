APP STRUCTURE: The Tracker — Functions and Architecture (no visual guidance)

Purpose

Describe how the app should be structured functionally: data model, screens, API endpoints, backend flow, security, subscription handling, sync and error behaviors.

1) High-level modules

- Frontend (Expo React Native, TypeScript)
  - Screens: Login, Dashboard, WorkoutEntry, WorkoutDetail, Settings, Subscription
  - Components: Input, List/Card, Confirm modal, Spinner, Toasts, Network status handler
  - Services: supabase client wrapper, api client for Edge Functions, storage cache
  - State: simple local state per-screen + small global store (Context or Zustand) for auth, user profile, subscription, ai_query_count

- Backend (Supabase)
  - Postgres DB with tables: users (extended), workouts, exercises, ai_generations, user_imports
  - Storage: object storage for chart images and uploaded files
  - Edge Functions (Deno): process-workout, ai-coach, generate-chart, import-data

2) Database schema (essential columns)

- users (id UUID PK -> auth.users.id, subscription_tier, ai_query_count, ai_query_limit, last_query_reset, user_profile JSONB)
- workouts (id, user_id, created_at, workout_date, workout_type, duration_minutes, notes, raw_input_data JSONB, ai_processed BOOL, ai_summary TEXT)
- exercises (id, workout_id, exercise_name, sets INT, reps INT[], weight_lbs NUMERIC[], distance_miles NUMERIC, time_seconds INT, notes TEXT)
- ai_generations (id, user_id, workout_id NULLABLE, prompt TEXT, result JSONB, artifact_url TEXT, model_used TEXT, cost NUMERIC, created_at)
- user_imports (id, user_id, filename, file_type, status, imported_at, raw_payload JSONB)

3) API / Edge Function contracts (paths and behavior)

- POST /process-workout
  - Auth: Bearer via supabase JWT (validate in function)
  - Input: { raw_text: string, workout_date?: ISODate, workout_type?: string }
  - Behavior: call OpenAI to parse → return structured JSON {workout_date, workout_type, duration_minutes, exercises[], ai_summary}
  - Side effects: (optional) save generation to ai_generations; client confirms before final save to workouts

- POST /save-workout
  - Auth: same
  - Input: { parsed_workout: JSON }
  - Behavior: insert into workouts, create exercises rows, increment user's ai_query_count atomically, return workout id

- POST /generate-chart
  - Auth
  - Input: { user_id, metric, date_range }
  - Behavior: generate chart (python or node), save to storage, return url

- POST /ai-coach
  - Auth
  - Input: { context: JSON, prompt: string }
  - Behavior: call OpenAI with context and handle follow-up actions if user approves

- POST /import-data
  - Auth
  - Input: file upload or file url
  - Behavior: identify format, parse, return preview

4) Security + RLS

- Use Row Level Security on all user-owned tables; policies should enforce auth.uid() == user_id
- Store OpenAI key only in Edge Function secrets (Supabase UI). Never in frontend or git.
- Validate inputs server-side (length limits, JSON schema validation for parsed output)
- Rate-limit Edge Functions per-user to prevent abuse (also enforce ai_query_count limits)

5) Subscription & Quotas

- users.ai_query_limit defines monthly allowed AI parses; ai_query_count increments on save-workout (or process-workout if you bill at parse time)
- Add webhook endpoint for RevenueCat to update users.subscription_tier and ai_query_limit accordingly
- Edge Functions check ai_query_count vs ai_query_limit before calling OpenAI and return 402-like response if over limit

6) Offline behavior & sync

- Allow draft saves locally (AsyncStorage). Draft schema: { raw_text, workout_date, workout_type, created_at }
- On reconnect, show pending drafts and allow user to "Process now" or "Discard"
- Handle merge conflicts by storing timestamp; last-write-wins with user confirmation to overwrite server

7) Error handling & retries

- Frontend: user-facing messages for network, parse failure, over-quota, and server errors. Provide retry button and local copy
- Edge Functions: log errors to monitoring, return structured error codes: { code: 'OVER_QUOTA'|'PARSE_FAILED'|'AUTH'|'INVALID_INPUT', message }
- Backoff: exponential retry client-side for transient network errors (max 3 attempts)

8) AI parsing expectations & validation

- The Edge Function must validate parsed workout JSON schema before saving
- Accept variations in exercise names; normalize common synonyms if possible (simple mapping table in Edge Function)
- If parser confidence low (Edge Function heuristic), return confidence score and require user confirmation before saving

9) Storage & artifacts

- Charts generated server-side saved to Supabase Storage (private bucket or signed URLs)
- ai_generations.artifact_url stores chart image or report URL
- Keep artifacts TTL and garbage collection policy for storage costs

10) Observability & cost tracking

- Record model_used and cost per ai_generations row for monthly billing/cost analysis
- Track per-user monthly cost and expose admin endpoint to cap usage if needed

11) Frontend file structure suggestion (functional, not visual)

- src/
  - screens/ (LoginScreen.tsx, DashboardScreen.tsx, WorkoutEntryScreen.tsx, WorkoutDetailScreen.tsx, SettingsScreen.tsx)
  - components/ (FormInput, Card, ConfirmModal, Spinner, Toast)
  - services/ (supabase.ts, api.ts) — api.ts wraps Edge Function calls and handles auth
  - store/ (auth.ts, user.ts) — small global store
  - utils/ (validation.ts, string_normalize.ts, date.ts)

12) Developer notes & environment

- Env vars: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY (frontend); Edge Function secrets: OPENAI_API_KEY
- Tests: unit tests for parsing validation logic; integration tests for Edge Function using mocked OpenAI responses
- Migrations: use SQL scripts in repo for table creation and RLS policies

13) Next actionable steps (developer)

1. Run SQL schema in Supabase (we prepared earlier). Confirm tables exist.
2. Create Edge Function /process-workout that returns validated parsed JSON (do not save yet).
3. Implement WorkoutEntryScreen that calls /process-workout, displays parsed preview, then calls /save-workout on confirm.
4. Implement atomic increment of ai_query_count and handle over-quota response.
5. Add ai_generations logging for each parse.
6. Implement chart generation after save (defer to Phase 2 if needed).

End of structure document. No visual guidance included.
