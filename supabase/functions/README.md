# Supabase Edge Functions

Edge Functions deployment for The Tracker.

## Functions

### process-workout
- **Path**: `/process-workout`
- **Method**: POST
- **Auth**: Required (JWT)
- **Input**: `{ raw_text: string, workout_date?: string, workout_type?: string }`
- **Output**: Parsed workout JSON with exercises, sets, reps, AI summary

## Setup

1. Install Supabase CLI:
```bash
brew install supabase/tap/supabase
```

2. Login to Supabase:
```bash
supabase login
```

3. Link to your project:
```bash
supabase link --project-ref wdoruanbyftqdauvaaqw
```

4. Set OpenAI API key secret:
```bash
supabase secrets set OPENAI_API_KEY=your_openai_key_here
```

5. Deploy function:
```bash
supabase functions deploy process-workout
```

## Testing locally

```bash
supabase functions serve process-workout
```

Then call with:
```bash
curl -X POST http://localhost:54321/functions/v1/process-workout \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"raw_text":"3x10 squats at 135lbs, 4x8 bench at 185lbs"}'
```

## Environment Variables

Set in Supabase dashboard under Edge Functions → Secrets:
- `OPENAI_API_KEY` - Your OpenAI API key
