import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Get date range for the past week
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    // Fetch schedule blocks for the week
    const { data: blocks, error: blocksError } = await supabaseClient
      .from('schedule_blocks')
      .select('*')
      .eq('user_id', user.id)
      .gte('start_ts', startDate.toISOString())
      .lte('end_ts', endDate.toISOString());

    if (blocksError) throw blocksError;

    // Fetch tasks
    const { data: tasks, error: tasksError } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', user.id);

    if (tasksError) throw tasksError;

    // Fetch habits
    const { data: habits, error: habitsError } = await supabaseClient
      .from('habits')
      .select('*')
      .eq('user_id', user.id);

    if (habitsError) throw habitsError;

    // Fetch profile for preferences
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Calculate statistics
    const completedBlocks = blocks?.filter(b => b.status === 'completed') || [];
    const scheduledBlocks = blocks?.filter(b => b.status === 'scheduled') || [];
    const taskBlocks = blocks?.filter(b => b.block_type === 'task') || [];
    const habitBlocks = blocks?.filter(b => b.block_type === 'habit') || [];
    
    const completedTasks = tasks?.filter(t => t.status === 'done') || [];
    const backlogTasks = tasks?.filter(t => t.status === 'backlog') || [];

    // Calculate total focus time
    const totalFocusMinutes = completedBlocks.reduce((acc, block) => {
      const start = new Date(block.start_ts);
      const end = new Date(block.end_ts);
      return acc + (end.getTime() - start.getTime()) / 60000;
    }, 0);

    // Analyze productivity by time of day
    const hourlyProductivity: Record<string, number> = {};
    completedBlocks.forEach(block => {
      const hour = new Date(block.start_ts).getHours();
      const timeSlot = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
      hourlyProductivity[timeSlot] = (hourlyProductivity[timeSlot] || 0) + 1;
    });

    // Calculate habit completion rate
    const habitCompletionRate = habitBlocks.length > 0 
      ? (habitBlocks.filter(h => h.status === 'completed').length / habitBlocks.length) * 100 
      : 0;

    // Prepare context for AI
    const analysisContext = {
      weekRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      totalScheduledBlocks: blocks?.length || 0,
      completedBlocks: completedBlocks.length,
      cancelledBlocks: blocks?.filter(b => b.status === 'cancelled').length || 0,
      totalFocusHours: Math.round(totalFocusMinutes / 60 * 10) / 10,
      taskBlocksCompleted: taskBlocks.filter(b => b.status === 'completed').length,
      habitBlocksScheduled: habitBlocks.length,
      habitCompletionRate: Math.round(habitCompletionRate),
      productivityByTimeOfDay: hourlyProductivity,
      tasksCompleted: completedTasks.length,
      tasksInBacklog: backlogTasks.length,
      totalHabits: habits?.length || 0,
      focusLengthPreference: profile?.focus_length_min || 25,
      bufferPreference: profile?.buffer_min || 5,
    };

    // Call Lovable AI for analysis
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a productivity coach analyzing a user's weekly schedule data. Provide actionable, encouraging insights. Be concise and specific. Format your response as JSON with these fields:
- summary: A 2-3 sentence overview of the week
- highlights: Array of 2-3 positive achievements
- patterns: Array of 2-3 observed productivity patterns
- suggestions: Array of 2-3 specific, actionable suggestions for improvement
- peakProductivityTime: The time of day when they were most productive (morning/afternoon/evening)
- focusScore: A score from 1-100 based on their productivity`
          },
          {
            role: 'user',
            content: `Analyze this weekly productivity data and provide insights:\n${JSON.stringify(analysisContext, null, 2)}`
          }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'weekly_analysis',
            description: 'Generate structured weekly productivity analysis',
            parameters: {
              type: 'object',
              properties: {
                summary: { type: 'string', description: '2-3 sentence overview' },
                highlights: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: '2-3 positive achievements'
                },
                patterns: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: '2-3 observed patterns'
                },
                suggestions: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: '2-3 actionable suggestions'
                },
                peakProductivityTime: { 
                  type: 'string', 
                  enum: ['morning', 'afternoon', 'evening'],
                  description: 'Best productivity time'
                },
                focusScore: { 
                  type: 'number', 
                  description: 'Score 1-100'
                }
              },
              required: ['summary', 'highlights', 'patterns', 'suggestions', 'peakProductivityTime', 'focusScore']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'weekly_analysis' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error('Failed to generate analysis');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    let analysis;
    if (toolCall?.function?.arguments) {
      analysis = JSON.parse(toolCall.function.arguments);
    } else {
      // Fallback if tool calling fails
      analysis = {
        summary: "We couldn't generate a detailed analysis this week. Keep tracking your progress!",
        highlights: ["You're using FlowPilot to track your productivity"],
        patterns: ["Continue scheduling tasks to build patterns"],
        suggestions: ["Schedule more tasks to get better insights"],
        peakProductivityTime: 'morning',
        focusScore: 50
      };
    }

    return new Response(JSON.stringify({
      ...analysis,
      stats: analysisContext
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Weekly summary error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
