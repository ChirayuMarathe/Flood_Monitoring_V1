import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { WardRiskProfile, HazardType } from '@/lib/risk/WardRiskProfile';
import { severityColors } from '@/lib/mumbai-data';

// Use Groq's OpenAI-compatible endpoint — much faster inference, free tier available.
function getGroqClient() {
  return new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });
}

const hazardTypeLabel = (type: HazardType) => {
  switch (type) {
    case 'rainfall_overflow': return 'Rainfall Overflow';
    case 'topographic_pooling': return 'Topographic Pooling';
    case 'tidal_backflow': return 'Tidal Backflow';
    case 'river_overflow': return 'River Overflow';
    case 'compound': return 'Compound Risk';
    default: return 'Unknown Hazard';
  }
};

function buildAlertPrompt(profile: WardRiskProfile): string {
  const hazardSummary = profile.activeHazards
    .map((h) => `- ${hazardTypeLabel(h.type)}: ${h.explanation}`)
    .join("\n");

  const historicalNote = profile.similarHistoricalEvent
    ? `The closest historical match is ${profile.similarHistoricalEvent.date}, when ${profile.similarHistoricalEvent.outcome.toLowerCase()}.`
    : "No closely matching historical event was found.";

  return `You are writing a short, clear flood risk alert for emergency planners about ${profile.wardName} in ${profile.city}.

Current severity: ${profile.overallSeverity}/3.

Active contributing factors:
${hazardSummary || "No active risk factors at current conditions."}

Current readings:
- 3-Day Rainfall: ${profile.rainfall3DaySum.toFixed(0)}mm (trend: ${profile.rainfallTrend})
- Soil Moisture: ${(profile.soilMoisture * 100).toFixed(0)}%
- Average Elevation: ${profile.elevationMean.toFixed(1)}m
- Wetness Index (TWI): ${profile.twiMean.toFixed(1)}

${historicalNote}

Write a 2-3 sentence plain-language alert using ONLY the numbers and facts given above. Do not invent additional statistics. Do not speculate beyond what the data supports. Be direct and actionable.`;
}

function buildQueryPrompt(profile: WardRiskProfile, userQuery: string): string {
  const context = buildAlertPrompt(profile);
  return `${context}

The user (an emergency planner) is asking: "${userQuery}"

Answer their question using ONLY the data provided above. Be concise (2-4 sentences). If the data doesn't support an answer, say so honestly.`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Support two modes:
    // 1. Alert generation: body is a WardRiskProfile (has wardId + activeHazards)
    // 2. Follow-up query: body has { profile: WardRiskProfile, query: string }
    const profile: WardRiskProfile = body.profile || body;
    const userQuery: string | undefined = body.query;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured. Add it to .env to enable AI alerts.' }, { status: 503 });
    }

    if (!profile || !profile.wardId) {
      return NextResponse.json({ error: 'Invalid WardRiskProfile provided' }, { status: 400 });
    }

    const systemPrompt = userQuery
      ? buildQueryPrompt(profile, userQuery)
      : buildAlertPrompt(profile);

    const modelsToTry = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
    let aiMessage = '';
    let lastErr: any = null;

    for (const model of modelsToTry) {
      try {
        const completion = await getGroqClient().chat.completions.create({
          model,
          messages: [{ role: 'system', content: systemPrompt }],
          temperature: 0.2,
          max_tokens: 600,
        });
        aiMessage = completion.choices[0]?.message?.content || '';
        if (aiMessage) break;
      } catch (err) {
        lastErr = err;
        console.warn(`RAG model ${model} failed, trying next fallback:`, err);
      }
    }

    if (!aiMessage) {
      throw lastErr || new Error('No response generated.');
    }
    const sev = severityColors[profile.overallSeverity];

    return NextResponse.json({
      wardId: profile.wardId,
      wardName: profile.wardName,
      severity: profile.overallSeverity,
      severityLabel: sev.label,
      response: aiMessage,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('RAG Alert Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to generate AI response: ${message}` }, { status: 500 });
  }
}
