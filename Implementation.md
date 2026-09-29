# Ward Alert Pin System — Implementation Spec

## Purpose of this document

This is a step-by-step implementation prompt for a coding agent (Claude Code, Cursor, etc.) working in the `Flood_Prediction_V1` repository. It replaces a generic 4-level severity pin system (Safe / Low / Moderate / Critical) with a **data-rich, hazard-specific alert system** — every pin should reflect *why* a ward is at risk, not just *how much*.

Implement this in the phases below, in order. Do not skip ahead to later phases until the current phase's verification checklist passes.

---

## Background: why "generic severity" isn't enough

A single 0–3 severity number collapses several genuinely different situations into the same color:

- A ward flooding because **rainfall + soil saturation** exceeded the ground's absorption capacity
- A ward flooding because it's a **natural low-lying pooling basin** (high TWI, low elevation) regardless of how much rain fell elsewhere
- A ward flooding because of **tidal backflow** — heavy rain coinciding with high tide, blocking stormwater discharge into the sea
- A ward flooding because of **river/creek overflow** (Mithi, Dahisar, Poisar) rather than direct rainfall

These require different responses from an emergency planner (evacuate vs. monitor drainage vs. watch tide tables vs. monitor river gauges). The pin system must communicate **which hazard is active**, not just a severity color.

---

## Phase 1 — Ward Risk Profile data model

**Goal:** replace the single `severity: 0-3` field with a structured risk profile per ward, computed from data already in the repo (`ward_zonal_stats.csv`, `training_table_master.csv`, climate CSVs).

### 1.1 Define the risk profile type

Create `src/lib/risk/WardRiskProfile.ts`:

```typescript
export type HazardType =
  | "rainfall_overflow"      // rainfall + soil saturation exceeding absorption
  | "topographic_pooling"    // natural low-lying basin, high TWI
  | "tidal_backflow"         // coastal ward + high tide coincidence
  | "river_overflow"         // near a known river/creek (Mithi, Dahisar, Poisar)
  | "compound";              // multiple hazards active simultaneously

export interface HazardFactor {
  type: HazardType;
  contributionScore: number;   // 0-1, how much this hazard contributes to overall risk
  explanation: string;         // human-readable reason, built from real numbers
}

export interface WardRiskProfile {
  wardId: string;
  wardName: string;
  city: "mumbai" | "pune" | "navi_mumbai";

  overallSeverity: 0 | 1 | 2 | 3;
  primaryHazard: HazardType;
  activeHazards: HazardFactor[];   // all hazards currently contributing, sorted by contributionScore desc

  // Raw values driving the assessment — always show these, never hide behind a label
  rainfall3DaySum: number;         // mm
  soilMoisture: number;            // m3/m3
  elevationMean: number;           // m
  twiMean: number;                 // topographic wetness index
  flowAccumulationMean: number;

  // Trend + urgency
  rainfallTrend: "rising" | "falling" | "steady";
  estimatedTimeToThresholdHours: number | null; // null if not currently trending toward risk

  // Historical grounding — this is what makes it "in-depth" instead of generic
  similarHistoricalEvent: {
    date: string;                  // e.g. "2017-08-29"
    outcome: string;               // e.g. "Moderate flooding recorded in this ward"
    similarityNote: string;        // e.g. "Rainfall and soil saturation are within 10% of that event"
  } | null;
}
```

### 1.2 Build the scoring logic

Create `src/lib/risk/computeRiskProfile.ts`. This is a deterministic, explainable scoring function — **not an LLM call**. The LLM layer (Phase 4) explains this data in natural language; it does not compute it.

Implement these rules using data you already have per ward:

```typescript
// Pseudocode structure — implement with real thresholds calibrated against
// training_table_master.csv's 4 known events (2005, 2017, 2019, 2021)

function computeRiskProfile(ward: WardData, climate: ClimateSnapshot): WardRiskProfile {
  const hazards: HazardFactor[] = [];

  // 1. Rainfall overflow — rainfall + soil saturation vs. absorption capacity
  const rainfallScore = scoreRainfallOverflow(climate.rain3DaySum, climate.soilMoisture);
  if (rainfallScore > 0.15) {
    hazards.push({
      type: "rainfall_overflow",
      contributionScore: rainfallScore,
      explanation: `${climate.rain3DaySum}mm over 3 days with soil already at ${(climate.soilMoisture * 100).toFixed(0)}% saturation`,
    });
  }

  // 2. Topographic pooling — TWI + elevation, independent of today's rainfall
  const poolingScore = scoreTopographicPooling(ward.twiMean, ward.elevationMean);
  if (poolingScore > 0.15) {
    hazards.push({
      type: "topographic_pooling",
      contributionScore: poolingScore,
      explanation: `Elevation ${ward.elevationMean}m with a wetness index of ${ward.twiMean.toFixed(1)} — a natural low-lying basin`,
    });
  }

  // 3. Tidal backflow — only for coastal wards, only if tide data available
  if (ward.isCoastal && climate.tideLevel !== null) {
    const tidalScore = scoreTidalBackflow(climate.rain3DaySum, climate.tideLevel);
    if (tidalScore > 0.15) {
      hazards.push({
        type: "tidal_backflow",
        contributionScore: tidalScore,
        explanation: `Heavy rainfall coinciding with a ${climate.tideLevel}m tide — stormwater discharge into the sea is restricted`,
      });
    }
  }

  // 4. River overflow — only for wards near a mapped river/creek
  if (ward.nearRiver && climate.riverLevel !== null) {
    const riverScore = scoreRiverOverflow(climate.riverLevel, ward.riverName);
    if (riverScore > 0.15) {
      hazards.push({
        type: "river_overflow",
        contributionScore: riverScore,
        explanation: `${ward.riverName} level trending above normal range`,
      });
    }
  }

  hazards.sort((a, b) => b.contributionScore - a.contributionScore);

  const primaryHazard = hazards.length > 1 && hazards[0].contributionScore - hazards[1].contributionScore < 0.15
    ? "compound"
    : (hazards[0]?.type ?? "rainfall_overflow");

  const overallSeverity = deriveSeverityFromHazards(hazards); // 0-3, existing weighted formula is fine here

  return {
    // ...assemble full profile, including historical match (Phase 1.3)
  };
}
```

**Do not invent threshold numbers.** Calibrate `scoreRainfallOverflow`, `scoreTopographicPooling`, etc. against the actual values present in `training_table_master.csv` for wards that DID flood vs. DID NOT flood across the 4 known events. Log the calibration reasoning in code comments.

### 1.3 Historical event matching

For each ward's current conditions, find the closest match among the 4 (or more, once expanded) known historical events for that same ward:

```typescript
function findSimilarHistoricalEvent(
  ward: WardData,
  currentConditions: ClimateSnapshot,
  trainingTable: TrainingTableRow[]
): WardRiskProfile["similarHistoricalEvent"] {
  const wardHistory = trainingTable.filter((row) => row.ward_gid === ward.gid);

  // Find the historical row with the smallest normalized distance to current
  // conditions (rainfall, soil moisture) among ward's own past events
  const closest = findClosestByEuclideanDistance(wardHistory, currentConditions, [
    "rainfall_mm_mumbai_avg",
    "soil_moisture_m3m3_mumbai_avg",
    "rain_3day_sum",
  ]);

  if (!closest || closest.distance > SIMILARITY_THRESHOLD) return null;

  return {
    date: closest.date,
    outcome: closest.severity > 0 ? `${severityLabel(closest.severity)} flooding recorded` : "No flooding recorded",
    similarityNote: `Current conditions are within ${(closest.distance * 100).toFixed(0)}% of this past event`,
  };
}
```

### Phase 1 verification checklist
- [ ] `WardRiskProfile` type compiles and is used consistently, replacing raw `severity` number usage in components
- [ ] Every ward with `overallSeverity >= 1` has at least one entry in `activeHazards` with a real, non-generic `explanation` string built from actual numbers
- [ ] Historical matching returns `null` gracefully for wards/conditions with no reasonable match — never fabricate a fake historical match
- [ ] Log/print 5 sample ward profiles to console and manually sanity-check the explanations make sense against the raw numbers

---

## Phase 2 — Hazard-specific pin visuals

**Goal:** pins communicate hazard *type* via shape/icon, and *urgency* via color/animation — not one generic color scale.

### 2.1 Icon set per hazard type

Create 4 distinct SVG icons (or request them — see note at end of this doc) in `public/icons/hazards/`:

| Hazard type | Visual concept | Filename |
|---|---|---|
| `rainfall_overflow` | Pin with rain droplet motif | `pin-rainfall.svg` |
| `topographic_pooling` | Pin with concentric "basin" rings | `pin-pooling.svg` |
| `tidal_backflow` | Pin with wave motif | `pin-tidal.svg` |
| `river_overflow` | Pin with river/flow-line motif | `pin-river.svg` |
| `compound` | Pin with layered/overlapping motif combining two active hazard icons | `pin-compound.svg` |

Each icon should exist in **4 color variants** (one per severity 0-3) — either via a CSS-filterable single-color SVG, or 4 pre-colored file variants. Prefer the filterable single-color SVG approach — simpler to maintain.

### 2.2 Pin rendering logic

Create `src/lib/gis/HazardPins.ts`:

```typescript
import * as Cesium from "cesium";
import { WardRiskProfile } from "@/lib/risk/WardRiskProfile";

const SEVERITY_COLOR: Record<0 | 1 | 2 | 3, string> = {
  0: "#22C55E",
  1: "#EAB308",
  2: "#F97316",
  3: "#EF4444",
};

const HAZARD_ICON_PATH: Record<string, string> = {
  rainfall_overflow: "/icons/hazards/pin-rainfall.svg",
  topographic_pooling: "/icons/hazards/pin-pooling.svg",
  tidal_backflow: "/icons/hazards/pin-tidal.svg",
  river_overflow: "/icons/hazards/pin-river.svg",
  compound: "/icons/hazards/pin-compound.svg",
};

export function addHazardPin(viewer: Cesium.Viewer, profile: WardRiskProfile, position: { lng: number; lat: number }) {
  return viewer.entities.add({
    id: `pin-${profile.wardId}`,
    position: Cesium.Cartesian3.fromDegrees(position.lng, position.lat),
    billboard: {
      image: HAZARD_ICON_PATH[profile.primaryHazard],
      color: Cesium.Color.fromCssColorString(SEVERITY_COLOR[profile.overallSeverity]),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      heightReference: Cesium.HeightReference.RELATIVE_TO_GROUND,
      scale: 0.7 + profile.overallSeverity * 0.15, // higher severity = visibly bigger, not just redder
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
  });
}
```

### 2.3 Urgency animation — only for time-sensitive risk

If `profile.estimatedTimeToThresholdHours !== null && profile.estimatedTimeToThresholdHours < 6`, attach a pulse ring (reuse the `CallbackProperty`-based ellipse pattern) — this specifically communicates "this is changing fast," which a static severity color can't convey. Do **not** pulse every elevated-severity ward — only ones actively trending toward a threshold, or the signal is diluted.

### Phase 2 verification checklist
- [ ] All 5 hazard icon variants render correctly at all 4 severity colors
- [ ] A ward with `primaryHazard: "compound"` visually reads as distinct from a single-hazard pin, not just a 5th arbitrary color
- [ ] Pulse animation only appears on genuinely time-urgent wards, verified by checking `estimatedTimeToThresholdHours` logic against a few real test cases
- [ ] Pin scale visibly differs between severity 0 and severity 3 wards side by side

---

## Phase 3 — Rich detail popup (replaces generic "Watch" card)

**Goal:** clicking a pin shows the actual reasoning, not just a label.

### 3.1 Popup component

Create/update `src/components/flood-dashboard/WardRiskPopup.tsx`:

```tsx
interface WardRiskPopupProps {
  profile: WardRiskProfile;
  onClose: () => void;
  onRequestAIExplanation: () => void; // triggers Phase 4
}

export function WardRiskPopup({ profile, onClose, onRequestAIExplanation }: WardRiskPopupProps) {
  return (
    <div className="ward-risk-popup">
      <header>
        <h3>{profile.wardName}</h3>
        <SeverityBadge level={profile.overallSeverity} />
      </header>

      <section className="active-hazards">
        {profile.activeHazards.map((hazard) => (
          <div key={hazard.type} className="hazard-row">
            <HazardIcon type={hazard.type} />
            <div>
              <strong>{hazardTypeLabel(hazard.type)}</strong>
              <p>{hazard.explanation}</p>
              <ContributionBar value={hazard.contributionScore} />
            </div>
          </div>
        ))}
      </section>

      <section className="raw-metrics">
        <Metric label="3-day rainfall" value={`${profile.rainfall3DaySum}mm`} trend={profile.rainfallTrend} />
        <Metric label="Soil moisture" value={`${(profile.soilMoisture * 100).toFixed(0)}%`} />
        <Metric label="Elevation" value={`${profile.elevationMean}m`} />
        <Metric label="Wetness index (TWI)" value={profile.twiMean.toFixed(1)} />
      </section>

      {profile.similarHistoricalEvent && (
        <section className="historical-match">
          <p>
            Closest match: <strong>{profile.similarHistoricalEvent.date}</strong> —{" "}
            {profile.similarHistoricalEvent.outcome}. {profile.similarHistoricalEvent.similarityNote}.
          </p>
        </section>
      )}

      <button onClick={onRequestAIExplanation}>Generate Plain-Language Alert</button>
    </div>
  );
}
```

### Phase 3 verification checklist
- [ ] Popup shows real numbers for every field — no placeholder/lorem ipsum values
- [ ] `ContributionBar` visually differs between a 0.2 and 0.8 contribution score
- [ ] Historical match section is hidden entirely (not shown empty) when `similarHistoricalEvent` is `null`
- [ ] Test on at least one ward per hazard type (rainfall, pooling, tidal if coastal ward available, compound)

---

## Phase 4 — AI-generated plain-language alert (RAG layer)

**Goal:** the "Generate Plain-Language Alert" button sends the **full structured risk profile** (not just a severity number) to an LLM, which writes a natural-language explanation grounded in that real data.

### 4.1 API route

Update `src/app/api/rag-alert/route.ts`:

```typescript
export async function POST(req: Request) {
  const profile: WardRiskProfile = await req.json();

  const prompt = buildAlertPrompt(profile); // see 4.2
  const response = await callLLM(prompt);   // your existing LLM client

  return Response.json({ alertText: response });
}
```

### 4.2 Prompt construction — ground it in the real data, don't let the model invent numbers

```typescript
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
```

This is the critical design constraint: **the LLM explains the data, it does not generate the risk assessment itself.** The risk profile (Phase 1) is fully computed before the LLM is ever called.

### Phase 4 verification checklist
- [ ] Generated alert text references the actual hazard types and numbers from that ward's profile, not generic language
- [ ] Test the same ward at two different severity levels (e.g., by scrubbing the timeline) and confirm the generated text meaningfully differs
- [ ] Confirm the LLM is not asked to compute severity or invent thresholds — only to explain pre-computed data

---

## Phase 5 — Wire into the timeline scrubber

**Goal:** as the user drags the bottom timeline, pins update their hazard type, severity, and popup content live — not just a static severity color frozen at one date.

- Recompute each visible ward's `WardRiskProfile` whenever the scrubber's active date changes
- Update pin icon/color/scale in place (don't destroy and recreate entities every frame — mutate the existing entity's `billboard.image`/`color`/`scale` properties)
- If a popup is currently open for a ward, update its contents live as the scrubber moves, rather than requiring the user to re-click

### Phase 5 verification checklist
- [ ] Scrubbing from a dry date to a known flood date (e.g., 2017-08-29) visibly changes affected wards' pin icons/colors without a full page reload
- [ ] No memory leak from repeatedly creating/destroying entities — confirm via DevTools memory profiler during a long scrub session
- [ ] Open popup updates live; closed popups don't recompute unnecessarily (performance)

---

## Notes for the implementing agent

- Do not use the generic "Safe / Low / Moderate / Critical" labels as the only user-facing text anywhere in this system — always pair severity with a specific hazard explanation
- All thresholds in Phase 1 scoring functions must be calibrated against real values in `training_table_master.csv`, not arbitrary round numbers
- If icon assets (`pin-rainfall.svg`, etc.) don't exist yet, flag this explicitly rather than shipping with placeholder/default Cesium billboard pins — the whole point of this system is that pins are NOT generic
- Every popup and generated alert must be traceable back to real numbers in the underlying dataset — no fabricated statistics anywhere in this system, including in the LLM-generated text