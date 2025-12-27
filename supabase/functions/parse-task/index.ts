import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Schema for validating AI response
const taskSchema = z.object({
  title: z.string().min(1).max(500),
  due_ts: z.string().optional().nullable(),
  est_min: z.number().int().positive().max(480).optional().nullable(),
  priority: z.enum(["p1", "p2", "p3", "p4"]).optional().nullable(),
  energy: z.enum(["low", "medium", "high"]).optional().nullable(),
  preferred_window: z.enum(["morning", "afternoon", "evening", "any"]).optional().nullable(),
  hard_deadline: z.boolean().optional().nullable(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user before processing
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const input = body?.input;
    
    // Input validation
    if (!input || typeof input !== 'string') {
      return new Response(
        JSON.stringify({ error: "Invalid input: must be a non-empty string" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Limit input length to prevent abuse
    const MAX_INPUT_LENGTH = 2000;
    if (input.length > MAX_INPUT_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Input too long: max ${MAX_INPUT_LENGTH} characters` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY is not configured");
    }

    const today = new Date().toISOString().split('T')[0];
    const prompt = `You are a task parsing assistant. Today's date is ${today}.

Parse the following natural language task input and return a JSON object with these fields:
- title (required): Clean, concise task title
- due_ts (optional): ISO 8601 datetime string. Convert relative dates like 'tomorrow', 'next Monday', 'in 2 hours' to absolute dates.
- est_min (optional): Estimated duration in minutes. Parse from phrases like '1 hour' (60), '30 minutes' (30), '2 hours' (120).
- priority (optional): One of "p1", "p2", "p3", "p4". Infer from urgency words: 'urgent'/'critical' = p1, 'important'/'high priority' = p2, default = p3, 'low priority'/'whenever' = p4
- energy (optional): One of "low", "medium", "high". 'quick'/'easy'/'simple' = low, 'deep work'/'focus'/'complex' = high, default = medium
- preferred_window (optional): One of "morning", "afternoon", "evening", "any". Parse from time mentions: before noon = morning, noon-5pm = afternoon, after 5pm = evening, no preference = any
- hard_deadline (optional): boolean. True if words like 'must', 'hard deadline', 'cannot miss' are used.

Return ONLY valid JSON, no markdown formatting or additional text.

User input: "${input}"`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          topK: 1,
          topP: 0.95,
          maxOutputTokens: 512,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Google Gemini API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Google Gemini API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract text from Gemini response
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) {
      throw new Error("No content in Gemini response");
    }

    // Parse JSON from response (remove markdown code blocks if present)
    let cleanedText = textContent.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    const parsedTask = JSON.parse(cleanedText);
    
    // Validate AI response against schema
    const validationResult = taskSchema.safeParse(parsedTask);
    if (!validationResult.success) {
      console.error("AI returned invalid task format:", validationResult.error.message);
      // Return a sanitized version with just the title if validation fails
      return new Response(JSON.stringify({ 
        parsed: { 
          title: typeof parsedTask.title === 'string' ? parsedTask.title.slice(0, 500) : "Untitled Task"
        } 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    console.log("Task parsed and validated successfully");

    return new Response(JSON.stringify({ parsed: validationResult.data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse task error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
