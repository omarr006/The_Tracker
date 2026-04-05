# The Tracker - AI Workout Coach App
## Comprehensive Implementation Plan

---

## 1. Product Summary

**The Tracker** is an intelligent workout tracking mobile application that transforms raw user fitness data into actionable insights through autonomous AI agents. Users can seamlessly import workout data via multiple formats (text, images, voice recordings, CSV/JSON files), and the AI orchestration layer automatically processes, structures, and visualizes this information using Python-generated charts, statistics, and progress dashboards. The app eliminates manual data entry friction by accepting any input format and converting it into structured workout sessions, exercise logs, and performance metrics.

Beyond passive tracking, the AI functions as a proactive fitness coach that monitors progress, generates predictive analytics, creates personalized workout plans, and provides real-time adjustments based on user goals and historical performance. The system operates on a freemium model with limited free AI queries, encouraging power users to subscribe for unlimited AI coaching, advanced analytics, and priority processing. All AI computation happens server-side via Supabase Edge Functions (Deno runtime) to protect API keys, while the React Native frontend provides a seamless cross-platform experience with real-time updates.

---

## 2. Architecture & Security Flow

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     React Native + Expo                      │
│                      (TypeScript)                            │
│  - UI/UX Layer                                               │
│  - Chart Rendering (images from backend)                    │
│  - Session Management (Supabase Auth tokens)                │
└──────────────────┬──────────────────────────────────────────┘
                   │ HTTPS (TLS 1.3)
                   │ Auth: Bearer JWT
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      Supabase Cloud                          │
│  ┌────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │  PostgreSQL    │  │  Auth (GoTrue)   │  │  Storage    │ │
│  │  Database      │  │  JWT Validation  │  │  (S3-like)  │ │
│  └────────────────┘  └──────────────────┘  └─────────────┘ │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           Supabase Edge Functions (Deno)             │   │
│  │  - /process-workout → OpenAI + Python chart gen      │   │
│  │  - /ai-coach → GPT-4 with workout context            │   │
│  │  - /import-data → Multi-format parser                │   │
│  │  Environment Vars: OPENAI_API_KEY (hidden)           │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      RevenueCat SDK                          │
│  - Subscription State Sync                                   │
│  - Apple/Google IAP Handling                                │
│  - Webhook → Supabase (update user tier)                    │
└─────────────────────────────────────────────────────────────┘
```

### Security Flow

1. **Authentication:**
   - User signs up/logs in via Supabase Auth (email/password or social OAuth)
   - Supabase issues JWT token with `user_id` and `role`
   - React Native stores token securely (Expo SecureStore)

2. **API Requests:**
   - All frontend requests include `Authorization: Bearer <JWT>` header
   - Edge Functions validate JWT via `createClient(supabaseUrl, supabaseAnonKey)`
   - Row-Level Security (RLS) policies enforce data isolation per user

3. **AI Processing:**
   - Edge Functions receive structured requests (e.g., workout data)
   - OpenAI API key lives only in Edge Function environment variables
   - Python subprocess executes in Deno sandbox for chart generation
   - Results stored in Supabase Storage with signed URLs (expiration)

4. **Subscription Validation:**
   - RevenueCat webhook updates `users.subscription_tier` in Supabase
   - Edge Functions check `users.ai_query_count` against tier limits
   - Atomic counters prevent race conditions

---

## 3. Database Schema

### Supabase Tables

#### `users` (extends Supabase auth.users)
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  subscription_tier TEXT DEFAULT 'free', -- 'free', 'pro', 'elite'
  ai_query_count INT DEFAULT 0,
  ai_query_limit INT DEFAULT 10, -- resets monthly
  last_query_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_profile JSONB -- {name, age, fitness_level, goals[]}
);

-- RLS Policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own data" ON users
  FOR ALL USING (auth.uid() = id);
```

**C/C++ Mental Model:**
```c
struct User {
    uuid_t id;               // 16 bytes
    time_t created_at;       // 8 bytes
    char email[256];
    char subscription_tier[16]; // enum: free/pro/elite
    int32_t ai_query_count;
    int32_t ai_query_limit;
    time_t last_query_reset;
    json_t* user_profile;    // Flexible struct
};
```

---

#### `workouts`
```sql
CREATE TABLE public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workout_date DATE NOT NULL,
  workout_type TEXT, -- 'strength', 'cardio', 'flexibility', 'mixed'
  duration_minutes INT,
  notes TEXT,
  raw_input_data JSONB, -- Original user input before AI processing
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_summary TEXT -- AI-generated summary
);

CREATE INDEX idx_workouts_user_date ON workouts(user_id, workout_date DESC);

-- RLS Policy
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own workouts" ON workouts
  FOR ALL USING (auth.uid() = user_id);
```

**C/C++ Mental Model:**
```c
struct Workout {
    uuid_t id;
    uuid_t user_id;          // Foreign key
    time_t created_at;
    date_t workout_date;
    char workout_type[32];
    int32_t duration_minutes;
    char notes[1024];
    json_t* raw_input_data;  // Dynamic array of exercises
    bool ai_processed;
    char ai_summary[2048];
};
```

---

#### `exercises`
```sql
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INT,
  reps INT[],              -- Array: [12, 10, 8] for progressive sets
  weight_lbs NUMERIC[],    -- Array: [135, 155, 165]
  distance_miles NUMERIC,  -- For cardio
  time_seconds INT,        -- For timed exercises
  notes TEXT
);

CREATE INDEX idx_exercises_workout ON exercises(workout_id);

-- RLS Policy (inherits from workouts)
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access exercises via workouts" ON exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workouts WHERE workouts.id = exercises.workout_id 
      AND workouts.user_id = auth.uid()
    )
  );
```

**C/C++ Mental Model:**
```c
struct Exercise {
    uuid_t id;
    uuid_t workout_id;       // Foreign key to Workout
    char exercise_name[128]; // "Bench Press"
    int32_t sets;
    int32_t reps[10];        // Variable-length array
    float weight_lbs[10];    // Parallel array
    float distance_miles;
    int32_t time_seconds;
    char notes[512];
};
```

---

#### `ai_generations`
```sql
CREATE TABLE public.ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_type TEXT NOT NULL, -- 'chart', 'workout_plan', 'question_answer', 'prediction'
  input_prompt TEXT,
  output_data JSONB,             -- Structured AI response
  chart_url TEXT,                -- Supabase Storage signed URL
  token_count INT,
  processing_time_ms INT,
  model_used TEXT DEFAULT 'gpt-4o'
);

CREATE INDEX idx_ai_generations_user ON ai_generations(user_id, created_at DESC);

-- RLS Policy
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own AI generations" ON ai_generations
  FOR ALL USING (auth.uid() = user_id);
```

**C/C++ Mental Model:**
```c
struct AIGeneration {
    uuid_t id;
    uuid_t user_id;
    time_t created_at;
    char generation_type[32];
    char input_prompt[4096];
    json_t* output_data;     // Complex nested structure
    char chart_url[512];     // Storage URL
    int32_t token_count;
    int32_t processing_time_ms;
    char model_used[32];
};
```

---

#### `workout_plans` (AI-generated plans)
```sql
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  plan_name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  goal TEXT,                     -- 'muscle_gain', 'fat_loss', 'endurance', 'strength'
  plan_structure JSONB,          -- Weekly schedule with exercises
  ai_generated BOOLEAN DEFAULT TRUE,
  status TEXT DEFAULT 'active'   -- 'active', 'completed', 'paused'
);

-- RLS Policy
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own plans" ON workout_plans
  FOR ALL USING (auth.uid() = user_id);
```

---

#### `user_imports` (Track import history)
```sql
CREATE TABLE public.user_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  import_type TEXT NOT NULL, -- 'text', 'image', 'voice', 'csv', 'json'
  file_url TEXT,             -- Supabase Storage URL
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  extracted_data JSONB,
  error_message TEXT
);

CREATE INDEX idx_user_imports_user_status ON user_imports(user_id, processing_status);

-- RLS Policy
ALTER TABLE user_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own imports" ON user_imports
  FOR ALL USING (auth.uid() = user_id);
```

---

### Additional Indexes for Performance

```sql
-- Full-text search on exercises (for "find all bench press workouts")
CREATE INDEX idx_exercises_name_fulltext ON exercises USING GIN(to_tsvector('english', exercise_name));

-- Date range queries for progress tracking
CREATE INDEX idx_workouts_date_range ON workouts(user_id, workout_date) WHERE ai_processed = TRUE;
```

---

## 4. Phased Implementation Plan

### **Phase 1: MVP - Core Data Flow + Basic AI Visualization** (Weeks 1-3)

**Goal:** Prove the core concept: User inputs workout data → AI processes it → Visual output

**Scope:**
- ✅ Supabase project setup (Auth + Database)
- ✅ React Native + Expo initialized
- ✅ User registration/login flow (email/password only)
- ✅ Single input method: **Plain text workout entry** (e.g., "Did 3 sets of 10 bench press at 185 lbs")
- ✅ Edge Function: Parse text → Call OpenAI → Save to `workouts` + `exercises` tables
- ✅ Edge Function: Generate simple chart (Python matplotlib) → Return as base64 image
- ✅ Simple dashboard: Display last 7 days of workouts as a bar chart
- ✅ AI query counter (enforce free tier limit of 10/month)
- ❌ No RevenueCat yet (Phase 2)
- ❌ No multi-format import (Phase 2)
- ❌ No AI coach chat (Phase 3)

**Success Criteria:**
- User can log "Squatted 225 lbs for 5 reps" in plain text
- AI extracts exercise data and saves to database
- User sees a chart showing squat volume over last 7 days
- Free tier limit enforced (shows "9 queries remaining")

---

### **Phase 2: Multi-Format Import + Subscription System** (Weeks 4-6)

**Goal:** Enable flexible data input and monetize with subscriptions

**Scope:**
- ✅ Image upload → OCR (Tesseract via Edge Function) → Extract workout data
- ✅ Voice recording → Whisper API transcription → Parse text
- ✅ CSV/JSON file upload → Direct parsing
- ✅ RevenueCat SDK integration
  - Apple App Store IAP setup
  - Google Play Billing setup
  - Webhook → Sync subscription status to Supabase
- ✅ Subscription tiers:
  - **Free:** 10 AI queries/month, basic charts
  - **Pro ($9.99/mo):** Unlimited AI queries, advanced charts, priority processing
  - **Elite ($19.99/mo):** Everything + custom workout plans + predictive analytics
- ✅ Paywall UI (show when free limit reached)

**Success Criteria:**
- User uploads photo of handwritten workout log → AI extracts data
- User records voice "I did cardio for 30 minutes" → Converts to structured workout
- User subscribes to Pro → AI query limit removed
- RevenueCat webhook successfully updates `users.subscription_tier`

---

### **Phase 3: AI Fitness Coach + Conversational Interface** (Weeks 7-9)

**Goal:** Make AI proactive - answering questions, making suggestions, planning workouts

**Scope:**
- ✅ "Ask Mode" - Chat interface for fitness questions
  - Context-aware: AI has access to user's workout history
  - Examples: "Why am I not seeing progress in bench press?" → AI analyzes trends
- ✅ AI-generated workout plans
  - User sets goal (e.g., "Build muscle, 3 days/week")
  - AI creates structured 12-week plan → Saved to `workout_plans` table
- ✅ Proactive suggestions (server-side cron job via Supabase)
  - Weekly digest: "You haven't trained legs in 10 days, here's a suggested routine"
  - Adjustment prompts: "Your squat volume is down 15%, want to adjust your plan?"
- ✅ Require user confirmation before making changes to active plans

**Success Criteria:**
- User asks "Should I do cardio before or after weights?" → Gets personalized answer
- User clicks "Generate Plan" → Receives 12-week strength program
- User receives notification: "Your bench press plateau detected - suggestion available"

---

### **Phase 4: Advanced Analytics + Predictions** (Weeks 10-12)

**Goal:** Showcase AI's analytical power - trends, predictions, comparisons

**Scope:**
- ✅ Historical trend analysis
  - Chart types: Progress curves, volume heatmaps, PR timelines
  - Comparative views: "This month vs last month"
- ✅ Predictive analytics
  - Estimated 1RM (one-rep max) calculator
  - "At current rate, you'll hit 315 lb squat in 8 weeks"
  - Injury risk indicators (volume spikes, recovery time)
- ✅ Advanced Python visualizations
  - Matplotlib/Seaborn complex charts
  - Cached chart generation (store in `ai_generations` for reuse)
- ✅ Export reports (PDF generation via Edge Function)

**Success Criteria:**
- User views "Muscle Group Distribution" pie chart over last month
- User sees "Predicted bench press 1RM: 285 lbs (current: 225 lbs × 10 reps)"
- User downloads PDF progress report with charts and AI commentary

---

### **Phase 5: Social + Gamification + Refinements** (Weeks 13-16)

**Goal:** Increase engagement and retention through community features

**Scope:**
- ✅ Achievements system
  - Badges: "100 Workouts", "Consistency Streak - 30 Days", "PR Breaker"
  - Stored in new table: `user_achievements`
- ✅ Social features (optional)
  - Share workout summaries (anonymized or public)
  - Leaderboards (opt-in)
- ✅ Push notifications
  - Workout reminders (based on plan schedule)
  - Milestone celebrations ("New PR detected!")
- ✅ Performance optimizations
  - Database query optimization
  - Chart caching strategy
  - Offline mode (local SQLite sync)
- ✅ Polish & bug fixes
  - Animations, loading states, error handling
  - A/B testing subscription paywall copy

**Success Criteria:**
- User earns "Week Warrior" badge after 7 consecutive days
- User shares "Leg Day PR" to Instagram story
- App remains functional without internet (queues AI requests)

---

## 5. Vibe-Coding Prompts for Phase 1 MVP

Use these prompts sequentially to build the MVP step-by-step. Copy/paste each prompt back to me when ready.

---

### **Prompt 1: Project Initialization + Supabase Setup**

```
Initialize a new React Native project with Expo and TypeScript for "The Tracker" workout app.

Requirements:
1. Create Expo project using latest SDK (SDK 51+)
2. Install and configure these dependencies:
   - @supabase/supabase-js (Supabase client)
   - @react-navigation/native (navigation)
   - expo-secure-store (token storage)
   - react-native-paper (UI components)
3. Set up project structure:
   - /src/screens (Login, Dashboard, WorkoutEntry)
   - /src/components (reusable components)
   - /src/services/supabase.ts (Supabase client config)
   - /src/types (TypeScript interfaces)
4. Create .env file with placeholders for SUPABASE_URL and SUPABASE_ANON_KEY
5. Configure TypeScript with strict mode
6. Set up basic navigation (stack navigator with Login → Dashboard)

Output: Complete project structure with all config files and a runnable "Hello World" Expo app.
```

---

### **Prompt 2: Supabase Authentication Flow**

```
Implement complete user authentication using Supabase Auth.

Requirements:
1. Create Supabase tables:
   - Run the SQL from PLAN.md section 3 to create 'users' table with RLS policies
2. Build Login/Register screens:
   - Email/password input fields
   - Form validation (email format, password min 8 chars)
   - Error handling (invalid credentials, network errors)
   - Loading states during auth calls
3. Implement /src/services/auth.ts:
   - signUp(email, password) → Create user in auth.users
   - signIn(email, password) → Get session token
   - signOut() → Clear local session
   - getCurrentUser() → Fetch from auth.users
4. Store JWT securely:
   - Use expo-secure-store to save/retrieve token
   - Auto-login on app restart if valid token exists
5. Protect Dashboard screen:
   - Redirect to Login if not authenticated
   - Show user email in Dashboard header

Test case: User can register, log out, log back in, and see persistent session.
```

---

### **Prompt 3: Workout Entry Screen + Text Parsing Edge Function**

```
Create workout data entry screen and AI-powered text parsing backend.

Frontend Requirements:
1. Build WorkoutEntryScreen.tsx:
   - Large text input: "Describe your workout in plain text"
   - Example prompts: "3 sets of bench press at 185 lbs", "Ran 5 miles in 42 minutes"
   - Submit button → Call Edge Function
   - Loading indicator during processing
   - Success message with extracted data preview
2. Display AI query counter:
   - Fetch from users.ai_query_count
   - Show "X queries remaining this month" banner
   - Disable submit if limit reached (free tier = 10)

Backend Requirements:
1. Create Supabase Edge Function: /functions/process-workout/index.ts
   - Accept: { userId: UUID, workoutText: string, workoutDate: Date }
   - Call OpenAI API (gpt-4o-mini for cost):
     - System prompt: "Extract workout data from text. Return JSON with exercises array."
     - User prompt: workoutText
   - Parse OpenAI response into structured format:
     {
       workout_type: string,
       duration_minutes: number,
       exercises: [{name, sets, reps[], weight_lbs[]}]
     }
   - Save to database:
     - INSERT into workouts table
     - INSERT each exercise into exercises table
   - Increment users.ai_query_count (atomic UPDATE)
   - Return: { success: true, workoutId: UUID, exercises: [...] }
2. Environment setup:
   - Add OPENAI_API_KEY to Edge Function secrets
3. Error handling:
   - Invalid text → Return helpful error
   - API quota exceeded → Graceful message

Test case: Submit "Squatted 225 for 5 reps, then 245 for 3" → See 2 exercises saved in database.
```

---

### **Prompt 4: Python Chart Generation + Dashboard Visualization**

```
Build AI-powered chart generation and workout dashboard.

Backend Requirements:
1. Create Edge Function: /functions/generate-chart/index.ts
   - Accept: { userId: UUID, chartType: 'volume_7day' | 'exercise_breakdown', exerciseName?: string }
   - Query workout data from last 7 days (JOIN workouts + exercises)
   - Calculate metrics:
     - volume_7day: Sum of (sets × reps × weight) per day
     - exercise_breakdown: Count of each unique exercise
   - Execute Python subprocess (Deno.Command):
     - Script: generate_chart.py
     - Input: JSON data via stdin
     - Uses: matplotlib, pandas (pre-installed in Supabase Edge Functions)
     - Output: Base64-encoded PNG image
   - Return: { chartUrl: "data:image/png;base64,..." }
   - Decrement AI query count
2. Python script (generate_chart.py):
   - Parse JSON input
   - Create matplotlib figure (800×600px)
   - Bar chart for volume_7day (date on X-axis, total volume on Y-axis)
   - Pie chart for exercise_breakdown
   - Convert to base64 string
   - Print to stdout

Frontend Requirements:
1. Create DashboardScreen.tsx:
   - Header: "Welcome back, [user email]"
   - Section 1: Recent workouts (FlatList)
     - Last 5 workouts from database
     - Show date, type, exercise count
   - Section 2: Weekly Volume Chart
     - Button: "Generate Chart" → Call /generate-chart Edge Function
     - Display Image component with base64 data
     - Cache image (store in component state to avoid re-generating)
   - Section 3: Quick Actions
     - "Log New Workout" button → Navigate to WorkoutEntry
   - AI query counter at bottom

Test case: User clicks "Generate Chart" → Sees bar chart of last 7 days' squat volume.
```

---

### **Prompt 5: Free Tier Limits + Polish**

```
Implement subscription limit enforcement and final MVP polish.

Requirements:
1. AI Query Limit Logic:
   - Create database function (PostgreSQL):
     - check_and_increment_query_count(user_id UUID) → RETURNS BOOLEAN
     - Check if ai_query_count < ai_query_limit
     - If true: INCREMENT ai_query_count, return TRUE
     - If false: return FALSE
   - Update Edge Functions to call this function before processing
   - Frontend: Show upgrade prompt when limit reached
2. Monthly Reset (Supabase Cron Job):
   - SQL function: reset_monthly_query_counts()
   - Reset all users.ai_query_count = 0 where last_query_reset < NOW() - INTERVAL '30 days'
   - Schedule via pg_cron (run daily at midnight UTC)
3. Error Handling & UX:
   - Network errors → "Couldn't connect, try again"
   - OpenAI API errors → "AI temporarily unavailable"
   - Invalid input → "Please describe your workout more clearly"
   - Loading skeletons for all data fetches
4. Testing Checklist:
   - [ ] User can register and login
   - [ ] User can submit workout text and see parsed data
   - [ ] User can generate chart after workouts are saved
   - [ ] Free tier limit blocks submissions after 10 queries
   - [ ] App works on iOS simulator
   - [ ] App works on Android emulator
5. Documentation:
   - README.md with setup instructions
   - .env.example file
   - API documentation for Edge Functions

Deliverable: Fully functional MVP ready for TestFlight/internal testing.
```

---

## Next Steps

Once you've reviewed this plan:

1. **Ask me questions** if anything is unclear
2. **Request modifications** to the phases or architecture
3. **Start coding** by sending me **Prompt 1** when ready
4. I'll generate all the code, config files, and SQL scripts step-by-step

When you're ready to implement, just say: **"Start Prompt 1"** and I'll build it for you.

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React Native + Expo (TypeScript) | Cross-platform mobile UI |
| **Backend** | Supabase (PostgreSQL) | Database, Auth, Real-time |
| **AI Processing** | Supabase Edge Functions (Deno) | Serverless API endpoints |
| **AI Models** | OpenAI GPT-4o / GPT-4o-mini | Text parsing, coaching, planning |
| **Charts** | Python (matplotlib) in Edge Functions | Data visualization |
| **Subscriptions** | RevenueCat | IAP management (Phase 2) |
| **Storage** | Supabase Storage | Chart images, uploaded files |
| **Security** | Row-Level Security (RLS) | User data isolation |

---

## Cost Estimates (Monthly for 1,000 Active Users)

- **Supabase:** Free tier up to 500MB DB → $25/mo Pro (2GB + Edge Functions)
- **OpenAI API:** ~$50/mo (assuming 10 queries/user/month @ $0.005/query avg)
- **RevenueCat:** Free up to $10k MRR
- **Total:** ~$75/mo + variable AI costs

**Revenue Model:** 10% conversion to Pro ($9.99/mo) = $999 MRR - $75 = **$924 profit/mo at 1k users**

---

*End of Plan Document*
