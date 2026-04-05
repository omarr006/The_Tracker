-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  ai_query_count INT DEFAULT 0,
  ai_query_limit INT DEFAULT 10,
  last_query_reset TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_profile JSONB
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own data" ON users
  FOR ALL USING (auth.uid() = id);

-- Workouts table
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workout_date DATE NOT NULL,
  workout_type TEXT,
  duration_minutes INT,
  notes TEXT,
  raw_input_data JSONB,
  ai_processed BOOLEAN DEFAULT FALSE,
  ai_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, workout_date DESC);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own workouts" ON workouts
  FOR ALL USING (auth.uid() = user_id);

-- Exercises table
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  sets INT,
  reps INT[],
  weight_lbs NUMERIC[],
  distance_miles NUMERIC,
  time_seconds INT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_exercises_workout ON exercises(workout_id);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own exercises" ON exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM workouts 
      WHERE workouts.id = exercises.workout_id 
      AND workouts.user_id = auth.uid()
    )
  );
