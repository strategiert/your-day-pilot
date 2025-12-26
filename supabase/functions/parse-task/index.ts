import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const today = new Date().toISOString().split('T')[0];
    const systemPrompt = `You are a task parsing assistant. Today's date is ${today}. 
Parse the user's natural language task input and extract structured task information.
Use the parse_task tool to return the parsed data.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "parse_task",
              description: "Parse a natural language task description into structured fields",
              parameters: {
                type: "object",
                properties: {
                  title: { 
                    type: "string", 
                    description: "Clean, concise task title extracted from the input" 
                  },
                  due_ts: { 
                    type: "string", 
                    description: "ISO 8601 datetime string for when the task is due. Convert relative dates like 'tomorrow', 'next Monday', 'in 2 hours' to absolute dates based on today's date." 
                  },
                  est_min: { 
                    type: "number", 
                    description: "Estimated duration in minutes. Parse from phrases like '1 hour' (60), '30 minutes' (30), '2 hours' (120). Default to 30 if not specified." 
                  },
                  priority: { 
                    type: "string", 
                    enum: ["p1", "p2", "p3", "p4"],
                    description: "Task priority. Infer from urgency words: 'urgent'/'critical' = p1, 'important'/'high priority' = p2, default = p3, 'low priority'/'whenever' = p4" 
                  },
                  energy: { 
                    type: "string", 
                    enum: ["low", "medium", "high"],
                    description: "Energy level required. 'quick'/'easy'/'simple' = low, 'deep work'/'focus'/'complex' = high, default = medium" 
                  },
                  preferred_window: { 
                    type: "string", 
                    enum: ["morning", "afternoon", "evening", "any"],
                    description: "Preferred time window. Parse from time mentions: before noon = morning, noon-5pm = afternoon, after 5pm = evening, no preference = any" 
                  },
                  hard_deadline: {
                    type: "boolean",
                    description: "Whether the deadline cannot be moved. True if words like 'must', 'hard deadline', 'cannot miss' are used."
                  }
                },
                required: ["title"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "parse_task" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    console.log("AI response:", JSON.stringify(data));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "parse_task") {
      throw new Error("No valid tool call in response");
    }

    const parsedTask = JSON.parse(toolCall.function.arguments);
    console.log("Parsed task:", parsedTask);

    return new Response(JSON.stringify({ parsed: parsedTask }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse task error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
