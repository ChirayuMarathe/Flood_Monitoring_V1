import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { WardRiskProfile, HazardType } from '@/lib/risk/WardRiskProfile';
import { severityColors } from '@/lib/mumbai-data';

// Constructed per request, not at module scope: the OpenAI client throws when
// the key is missing, which fails `next build` page-data collection on any
// machine without OPENAI_API_KEY set.
function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
${hazardSummary}

${historicalNote}

Write a 2-3 sentence plain-language alert using ONLY the numbers and facts given above. Do not invent additional statistics. Do not speculate beyond what the data supports. Be direct and actionable.`;
}

export async function POST(request: Request) {
  try {
    const profile: WardRiskProfile = await request.json();

    if (!profile || !profile.wardId) {
      return NextResponse.json({ error: 'Invalid WardRiskProfile provided' }, { status: 400 });
    }

    const systemPrompt = buildAlertPrompt(profile);

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.2,
      max_tokens: 400,
    });

    const aiMessage = completion.choices[0].message.content || 'No response generated.';
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
    return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
}
