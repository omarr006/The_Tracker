import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase client to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Extract JWT from Bearer token
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request body
    const { raw_text, workout_date, workout_type } = await req.json()

    if (!raw_text) {
      return new Response(
        JSON.stringify({ error: 'raw_text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get OpenAI API key from environment
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured')
    }

    // Call OpenAI to parse workout
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using GPT-4o mini for cost efficiency
        messages: [
          {
            role: 'system',
            content: `You are a workout parser. Parse the user's workout description into structured JSON.
Return ONLY valid JSON with this exact structure:
{
  "workout_date": "YYYY-MM-DD",
  "workout_type": "strength|cardio|flexibility|mixed",
  "duration_minutes": number,
  "exercises": [
    {
      "exercise_name": "string",
      "sets": number,
      "reps": [number array],
      "weight_lbs": [number array]
    }
  ],
  "ai_summary": "Brief coaching insight (1-2 sentences)"
}

Rules:
- Use today's date if not specified
- Extract all exercises mentioned
- If sets/reps/weight unclear, make reasonable assumptions
- Keep exercise names simple (e.g., "Squat" not "Back Squat")
- ai_summary should give one actionable tip`
          },
          {
            role: 'user',
            content: raw_text
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text()
      throw new Error(`OpenAI API error: ${error}`)
    }

    const openaiData = await openaiResponse.json()
    const parsedContent = openaiData.choices[0].message.content

    // Parse the JSON response from OpenAI
    let parsedWorkout
    try {
      parsedWorkout = JSON.parse(parsedContent)
    } catch (e) {
      throw new Error(`Failed to parse OpenAI response as JSON: ${parsedContent}`)
    }

    // Override date if provided
    if (workout_date) {
      parsedWorkout.workout_date = workout_date
    }

    // Override type if provided
    if (workout_type) {
      parsedWorkout.workout_type = workout_type
    }

    // Validate structure
    if (!parsedWorkout.exercises || !Array.isArray(parsedWorkout.exercises)) {
      throw new Error('Invalid parsed structure: missing exercises array')
    }

    // Return parsed workout
    return new Response(
      JSON.stringify(parsedWorkout),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
