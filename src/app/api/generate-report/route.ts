import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import type { WardRiskProfile, HazardType } from '@/lib/risk/WardRiskProfile';

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

export interface ReportRequest {
  reportType: 'forecast' | 'situation' | 'vulnerability' | 'executive';
  city: string;
  profiles: WardRiskProfile[];
  climateData: {
    rainfall3DaySum: number;
    soilMoisture: number;
    landSurfaceTemp: number;
    date: string;
    timeIndex: number;
  };
}

function buildForecastPrompt(req: ReportRequest): string {
  const criticalWards = req.profiles.filter(p => p.overallSeverity >= 3);
  const elevatedWards = req.profiles.filter(p => p.overallSeverity === 2);
  const watchWards = req.profiles.filter(p => p.overallSeverity === 1);
  const normalWards = req.profiles.filter(p => p.overallSeverity === 0);

  const topRiskWards = req.profiles
    .filter(p => p.overallSeverity >= 1)
    .sort((a, b) => b.overallSeverity - a.overallSeverity)
    .slice(0, 10)
    .map(p => {
      const hazards = p.activeHazards.map(h => `${hazardTypeLabel(h.type)} (${(h.contributionScore * 100).toFixed(0)}%)`).join(', ');
      return `  - ${p.wardName}: Severity ${p.overallSeverity}/3 | Rainfall: ${p.rainfall3DaySum.toFixed(0)}mm | Soil: ${(p.soilMoisture * 100).toFixed(0)}% | Elev: ${p.elevationMean.toFixed(1)}m | TWI: ${p.twiMean.toFixed(1)} | Hazards: ${hazards || 'None'}`;
    }).join('\n');

  const historicalMatches = req.profiles
    .filter(p => p.similarHistoricalEvent)
    .slice(0, 5)
    .map(p => `  - ${p.wardName}: Similar to ${p.similarHistoricalEvent!.date} — ${p.similarHistoricalEvent!.outcome}`)
    .join('\n');

  return `You are a senior hydrometeorological analyst writing a **Flood Forecast Report** for ${req.city} municipal emergency operations.

DATE: ${req.climateData.date}
MONITORING PERIOD: Day ${req.climateData.timeIndex + 1} of 30-day monsoon window

CITY-WIDE CONDITIONS:
- 3-Day Cumulative Rainfall: ${req.climateData.rainfall3DaySum.toFixed(0)}mm
- Soil Moisture Saturation: ${(req.climateData.soilMoisture * 100).toFixed(0)}%
- Land Surface Temperature: ${req.climateData.landSurfaceTemp.toFixed(1)}°C

WARD STATUS SUMMARY:
- Critical (Sev 3): ${criticalWards.length} wards
- Elevated (Sev 2): ${elevatedWards.length} wards
- Watch (Sev 1): ${watchWards.length} wards
- Normal (Sev 0): ${normalWards.length} wards
- Total monitored: ${req.profiles.length} wards

TOP AT-RISK WARDS:
${topRiskWards || '  (No wards currently at risk)'}

HISTORICAL PATTERN MATCHES:
${historicalMatches || '  (No historical matches found)'}

Write a structured report with these sections:
1. **EXECUTIVE SUMMARY** (2-3 sentences): Overall flood risk assessment for the city
2. **RAINFALL FORECAST** (3-4 sentences): Based on the 3-day rainfall trend and soil saturation, describe expected rainfall patterns and which areas will be most affected
3. **AREA-WISE RISK ANALYSIS** (bullet points for each at-risk ward): For each critical/elevated ward, explain WHY it's at risk using the specific data (elevation, TWI, soil moisture, hazard type)
4. **RECOMMENDED ACTIONS** (numbered list): Specific, actionable steps for emergency planners based on the current severity levels
5. **24-HOUR OUTLOOK**: Brief prediction of how conditions will evolve

Use ONLY the data provided above. Do not invent statistics. Be specific with ward names and numbers. Write in a professional, authoritative tone suitable for emergency planners. Use plain language, not jargon.

FORMATTING RULES:
- Output clean GitHub-Flavored Markdown.
- Do NOT use raw HTML tags (e.g. no <br>, no <div>, no <span>).
- If including tables, format with standard markdown table pipes: | Header 1 | Header 2 |.
- Emphasize key numbers and ward names in **bold**.`;
}

function buildSituationPrompt(req: ReportRequest): string {
  const allWardSummaries = req.profiles
    .sort((a, b) => b.overallSeverity - a.overallSeverity)
    .map(p => {
      const trend = p.rainfallTrend === 'rising' ? '↑' : p.rainfallTrend === 'falling' ? '↓' : '→';
      const hazards = p.activeHazards.map(h => hazardTypeLabel(h.type)).join(', ');
      return `| ${p.wardName} | ${p.overallSeverity} | ${p.rainfall3DaySum.toFixed(0)}mm ${trend} | ${(p.soilMoisture * 100).toFixed(0)}% | ${p.elevationMean.toFixed(1)}m | ${hazards || '-'} |`;
    }).join('\n');

  return `You are writing a **Situation Report (SITREP)** for ${req.city} flood monitoring operations.

DATE: ${req.climateData.date} | Day ${req.climateData.timeIndex + 1}/30

COMPLETE WARD STATUS:
| Ward | Severity | Rainfall (3d) | Soil | Elevation | Active Hazards |
|------|----------|---------------|------|-----------|----------------|
${allWardSummaries}

Write a concise situation report with:
1. **SITUATION OVERVIEW**: Current flood risk posture in 2-3 sentences
2. **CRITICAL DEVELOPMENTS**: Any wards that have changed severity or are approaching thresholds
3. **WEATHER IMPACT ASSESSMENT**: How current rainfall and soil conditions affect flood risk across different terrain types (coastal, lowland, midland, highland)
4. **RESOURCE DEPLOYMENT RECOMMENDATIONS**: Where to pre-position emergency resources based on risk distribution
5. **COMMUNICATION PRIORITIES**: Which communities should receive warnings and at what level

Use ONLY the provided data. Be factual and concise.
FORMATTING RULES: Output clean GitHub-Flavored Markdown without raw HTML tags. Use standard markdown tables with pipe columns.`;
}

function buildVulnerabilityPrompt(req: ReportRequest): string {
  const wardsByType = {
    coastal: req.profiles.filter(p => p.activeHazards.some(h => h.type === 'tidal_backflow')),
    lowland: req.profiles.filter(p => p.elevationMean < 10),
    riverine: req.profiles.filter(p => p.activeHazards.some(h => h.type === 'river_overflow')),
    compound: req.profiles.filter(p => p.activeHazards.length >= 2),
  };

  const detailedProfiles = req.profiles
    .filter(p => p.overallSeverity >= 1)
    .sort((a, b) => b.overallSeverity - a.overallSeverity)
    .map(p => {
      const hazardDetails = p.activeHazards.map(h =>
        `    - ${hazardTypeLabel(h.type)}: ${h.explanation} (contribution: ${(h.contributionScore * 100).toFixed(0)}%)`
      ).join('\n');
      const historical = p.similarHistoricalEvent
        ? `    Historical: ${p.similarHistoricalEvent.date} — ${p.similarHistoricalEvent.similarityNote}`
        : '    No historical match';
      return `  ${p.wardName} (Severity ${p.overallSeverity}):\n    Elevation: ${p.elevationMean.toFixed(1)}m | TWI: ${p.twiMean.toFixed(1)} | Flow Acc: ${p.flowAccumulationMean.toFixed(3)}\n${hazardDetails}\n${historical}`;
    }).join('\n\n');

  return `You are writing a **Vulnerability Assessment Report** for ${req.city}.

VULNERABILITY CATEGORIES:
- Coastal/tidal risk wards: ${wardsByType.coastal.length}
- Low-elevation wards (<10m): ${wardsByType.lowland.length}
- River corridor wards: ${wardsByType.riverine.length}
- Compound risk wards (2+ hazards): ${wardsByType.compound.length}

DETAILED WARD PROFILES (at-risk wards only):
${detailedProfiles || '(No at-risk wards)'}

Write a vulnerability assessment with:
1. **VULNERABILITY OVERVIEW**: Which categories of wards are most at risk and why
2. **TERRAIN ANALYSIS**: How elevation, TWI, and flow accumulation create flood-prone corridors
3. **COMPOUND RISK ZONES**: Wards where multiple hazard types converge — explain the interaction
4. **HISTORICAL VULNERABILITY**: How current conditions compare to past flood events
5. **MITIGATION PRIORITIES**: Ranked list of infrastructure and preparedness interventions. If formatting as a table, use standard markdown pipe syntax (| Rank | Ward | Priority | Action |).

Use ONLY the data provided. Be specific about ward names and metric values.
FORMATTING RULES: Output clean GitHub-Flavored Markdown. Do NOT use HTML tags (e.g. no <br>, no <div>). When creating tables, use standard markdown pipes.`;
}

function buildExecutivePrompt(req: ReportRequest): string {
  const critical = req.profiles.filter(p => p.overallSeverity >= 3);
  const elevated = req.profiles.filter(p => p.overallSeverity >= 2);
  const risingTrend = req.profiles.filter(p => p.rainfallTrend === 'rising');

  return `You are writing a 1-page **Executive Briefing** for the ${req.city} Municipal Commissioner on flood preparedness.

DATE: ${req.climateData.date}

KEY METRICS:
- ${req.profiles.length} wards monitored
- ${critical.length} wards at CRITICAL level
- ${elevated.length} wards at ELEVATED or higher
- ${risingTrend.length} wards with RISING rainfall trend
- City-wide 3-day rainfall: ${req.climateData.rainfall3DaySum.toFixed(0)}mm
- Soil saturation: ${(req.climateData.soilMoisture * 100).toFixed(0)}%

CRITICAL WARDS: ${critical.map(p => p.wardName).join(', ') || 'None'}
ELEVATED WARDS: ${elevated.filter(p => p.overallSeverity === 2).map(p => p.wardName).join(', ') || 'None'}

Write a concise executive briefing with:
1. **SITUATION AT A GLANCE** (2 sentences max)
2. **KEY RISKS** (3 bullet points max)
3. **IMMEDIATE ACTIONS REQUIRED** (3 numbered items)
4. **RESOURCE STATUS** (assessment of preparedness)
5. **NEXT BRIEFING**: When and what to watch for

Keep it under 250 words. Use clear, non-technical language. Every sentence must be actionable or informational — no filler.
FORMATTING RULES: Output clean GitHub-Flavored Markdown without HTML tags.`;
}

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY is not configured.' }, { status: 503 });
    }

    const body: ReportRequest = await request.json();

    if (!body.profiles || body.profiles.length === 0) {
      return NextResponse.json({ error: 'No ward profiles provided' }, { status: 400 });
    }

    if (!body.climateData) {
      body.climateData = {
        rainfall3DaySum: body.profiles[0]?.rainfall3DaySum ?? 65,
        soilMoisture: body.profiles[0]?.soilMoisture ?? 0.45,
        landSurfaceTemp: 29.0,
        date: new Date().toISOString().split('T')[0],
        timeIndex: 14,
      };
    }

    let systemPrompt: string;
    switch (body.reportType) {
      case 'forecast': systemPrompt = buildForecastPrompt(body); break;
      case 'situation': systemPrompt = buildSituationPrompt(body); break;
      case 'vulnerability': systemPrompt = buildVulnerabilityPrompt(body); break;
      case 'executive': systemPrompt = buildExecutivePrompt(body); break;
      default:
        return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const modelsToTry = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'allam-2-7b'];
    let report = '';
    let lastErr: any = null;

    for (const model of modelsToTry) {
      try {
        const completion = await getGroqClient().chat.completions.create({
          model,
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.3,
          max_tokens: 2000,
        });
        const msg = completion.choices[0]?.message;
        report = msg?.content || (msg as any)?.reasoning || '';
        if (report) break;
      } catch (err) {
        lastErr = err;
        console.warn(`Model ${model} failed, trying next fallback:`, err);
      }
    }

    if (!report) {
      throw lastErr || new Error('No report generated.');
    }

    return NextResponse.json({
      reportType: body.reportType,
      city: body.city,
      content: report,
      wardCount: body.profiles.length,
      criticalCount: body.profiles.filter(p => p.overallSeverity >= 3).length,
      elevatedCount: body.profiles.filter(p => p.overallSeverity >= 2).length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Report Generation Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to generate report: ${message}` }, { status: 500 });
  }
}
