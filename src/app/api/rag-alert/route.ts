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
  const sevLabels: Record<number, string> = {
    0: 'MINIMAL RISK (NOMINAL)',
    1: 'LOW RISK (WATCH)',
    2: 'MODERATE RISK (ELEVATED)',
    3: 'CRITICAL RISK (IMMEDIATE ACTION REQUIRED)',
  };
  const sevLabel = sevLabels[profile.overallSeverity] || 'ASSESSMENT PENDING';

  const hazardSummary = profile.activeHazards
    .map((h) => `- **${hazardTypeLabel(h.type)}** (${(h.contributionScore * 100).toFixed(0)}% contribution): ${h.explanation}`)
    .join("\n");

  const historicalNote = profile.similarHistoricalEvent
    ? `Closest historical benchmark is **${profile.similarHistoricalEvent.date}**, when *${profile.similarHistoricalEvent.outcome}* (${profile.similarHistoricalEvent.similarityNote}).`
    : "No closely matching historical flood event in municipal records for these exact parameters.";

  return `You are the Tactical AI Commander for the Mumbai Disaster Management Emergency Operations Center (EOC).
Generate a structured, eye-catching Emergency Protocol Briefing for ${profile.wardName} (${profile.city.toUpperCase()}).

WARD TELEMETRY & PROFILE:
- Ward: ${profile.wardName} | Sector: ${profile.city.toUpperCase()}
- Current Threat Level: Severity ${profile.overallSeverity}/3 — ${sevLabel}
- Primary Hazard: ${hazardTypeLabel(profile.primaryHazard)}
- 3-Day Precipitation: ${profile.rainfall3DaySum.toFixed(0)}mm (Trend: ${profile.rainfallTrend.toUpperCase()})
- Soil Moisture Saturation: ${(profile.soilMoisture * 100).toFixed(0)}%
- Topographic Elevation Mean: ${profile.elevationMean.toFixed(1)}m
- Topographic Wetness Index (TWI): ${profile.twiMean.toFixed(1)}
- Active Contributing Factors:
${hazardSummary || "- None: Baseline dry weather conditions."}

HISTORICAL BENCHMARK:
${historicalNote}

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS (Use Markdown):

### 🚨 SITUATION ASSESSMENT
Provide a concise, powerful 2-sentence executive summary analyzing current flood susceptibility in ${profile.wardName}, quoting the exact rainfall (${profile.rainfall3DaySum.toFixed(0)}mm) and soil moisture (${(profile.soilMoisture * 100).toFixed(0)}%).

### ⚡ HYDROLOGIC RISK DRIVERS
* **Precipitation & Infiltration:** Analyze how the ${profile.rainfall3DaySum.toFixed(0)}mm rainfall and ${(profile.soilMoisture * 100).toFixed(0)}% soil saturation interact at ${profile.elevationMean.toFixed(1)}m elevation.
* **Basin Vulnerability:** Evaluate topographic pooling (TWI ${profile.twiMean.toFixed(1)}) and primary hazard (${hazardTypeLabel(profile.primaryHazard)}).
* **Historical Precedent:** ${historicalNote}

### 🛡️ TACTICAL ACTION DIRECTIVES
1. **Pumps & Stormwater Drainage:** [Specific directive for dewatering pumps & culvert clearing for Severity ${profile.overallSeverity}]
2. **Traffic & Low-Lying Subways:** [Advisory for subways/transit routes based on current risk]
3. **Emergency Readiness Level:** [Declare readiness posture: Code Green (Normal) / Code Yellow (Watch) / Code Orange (Alert) / Code Red (Evacuation/Deploy)]

**Commander's Note:** [1-sentence bottom-line takeaway for field emergency crews].

Rules: Write professionally, authoritatively, and concisely. Use ONLY the data provided. Do not invent fake statistics. Do not use raw HTML.`;
}

function buildQueryPrompt(profile: WardRiskProfile, userQuery: string): string {
  const context = buildAlertPrompt(profile);
  return `${context}

The Emergency Operations Commander is asking a direct tactical question:
"${userQuery}"

Answer their question directly in 2-4 concise, professional, bullet-pointed sentences using ONLY the verified ward telemetry above. Be precise with numbers and tactical protocol.`;
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

    const modelsToTry = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'allam-2-7b'];
    let aiMessage = '';
    let lastErr: any = null;

    for (const model of modelsToTry) {
      try {
        const completion = await getGroqClient().chat.completions.create({
          model,
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.2,
          max_tokens: 1000,
        });
        const msg = completion.choices[0]?.message;
        aiMessage = msg?.content || (msg as any)?.reasoning || '';
        if (aiMessage) break;
      } catch (err) {
        lastErr = err;
        console.warn(`RAG model ${model} failed, trying next fallback:`, err);
      }
    }

    if (!aiMessage) {
      throw lastErr || new Error('No response generated from AI models.');
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
