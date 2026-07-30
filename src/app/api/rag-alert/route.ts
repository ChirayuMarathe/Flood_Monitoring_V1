import { NextResponse } from 'next/server';
import { mumbaiWards, severityColors, timeSeriesData } from '@/lib/mumbai-data';

export async function POST(request: Request) {
  const body = await request.json();
  const { wardId, timeIndex = 14, query } = body;

  const ward = mumbaiWards.find((w) => w.id === wardId);
  if (!ward) {
    return NextResponse.json({ error: 'Ward not found' }, { status: 404 });
  }

  const td = timeSeriesData[timeIndex];
  const sev = severityColors[ward.severity];

  const protocols: Record<number, string> = {
    0: `INFORM — Ward ${ward.name} (${ward.code}) currently shows NO FLOOD RISK.\n\n` +
      `Current conditions: 3-day rainfall cumulative at ${td.rainfall_3day_sum}mm, soil moisture at ${(td.soil_moisture * 100).toFixed(0)}%, ` +
      `land surface temperature ${td.landSurfaceTemp}°C. Mean elevation ${ward.elevation}m and TWI of ${ward.twi} indicate adequate drainage capacity.\n\n` +
      `Recommended actions: Continue routine monitoring. Ensure all drainage channels are clear. ` +
      `Review emergency contact lists and verify communication systems are operational. ` +
      `No evacuation required at this time.`,
    1: `ADVISORY — Ward ${ward.name} (${ward.code}) is under LOW FLOOD RISK.\n\n` +
      `3-day rainfall has reached ${td.rainfall_3day_sum}mm with soil moisture at ${(td.soil_moisture * 100).toFixed(0)}%. ` +
      `Surface temperature is ${td.landSurfaceTemp}°C. Topographic analysis shows mean elevation of ${ward.elevation}m ` +
      `with a TWI of ${ward.twi}, indicating potential water accumulation in low-lying zones.\n\n` +
      `Recommended actions: Activate ward-level disaster monitoring team. Deploy water level sensors ` +
      `at critical drainage points. Pre-position sandbags at known vulnerable locations. ` +
      `Alert all ground-level response units to standby status. Monitor Mithi River levels if applicable.`,
    2: `WARNING — Ward ${ward.name} (${ward.code}) is under MODERATE FLOOD RISK.\n\n` +
      `3-day cumulative rainfall has surged to ${td.rainfall_3day_sum}mm with soil saturation at ${(td.soil_moisture * 100).toFixed(0)}%. ` +
      `Land surface temperature at ${td.landSurfaceTemp}°C. With mean elevation of only ${ward.elevation}m and TWI of ${ward.twi}, ` +
      `this ward is highly susceptible to waterlogging and localized flooding.\n\n` +
      `URGENT ACTIONS REQUIRED:\n` +
      `1. Begin phased evacuation of residents in ground-floor and basement dwellings.\n` +
      `2. Deploy emergency pumps at all major drainage intersections.\n` +
      `3. Activate evacuation route via ${ward.evacuationRoute.length > 0 ? 'designated emergency corridors' : 'primary arterial roads'} to higher elevation zones.\n` +
      `4. Coordinate with BMC disaster management cell for resource deployment.\n` +
      `5. Broadcast public alerts through all available channels (SMS, sirens, public address systems).`,
    3: `CRITICAL ALERT — Ward ${ward.name} (${ward.code}) FLOOD SEVERITY: CRITICAL (Level 3)\n\n` +
      `EMERGENCY CONDITIONS: 3-day rainfall has exceeded ${td.rainfall_3day_sum}mm. Soil is fully saturated at ${(td.soil_moisture * 100).toFixed(0)}%. ` +
      `Mean elevation of ${ward.elevation}m combined with TWI of ${ward.twi} indicates water levels expected to exceed 1.5-2.0m ` +
      `in low-lying areas within the next 2-4 hours.\n\n` +
      `IMMEDIATE EVACUATION PROTOCOL:\n` +
      `1. ACTIVATE FULL EVACUATION of all residents below 3m elevation contour.\n` +
      `2. Primary evacuation route: Follow designated emergency corridors to nearest high-ground shelter. ` +
      `Avoid low-lying underpasses and subway entrances.\n` +
      `3. Deploy NDRF teams for assisted evacuation of elderly, differently-abled, and hospital patients.\n` +
      `4. Shutdown electrical supply in flood-prone zones to prevent electrocution hazards.\n` +
      `5. Deploy boats for areas where water depth exceeds 0.5m.\n` +
      `6. Establish emergency medical aid posts at elevated locations.\n` +
      `7. All BMC emergency operations centers to operate at maximum alert level.\n\n` +
      `This is a LIFE-THREATENING situation. Do not delay evacuation.`,
  };

  const message = protocols[ward.severity] || protocols[0];

  return NextResponse.json({
    wardId,
    wardName: ward.name,
    severity: ward.severity,
    severityLabel: sev.label,
    response: message,
    generatedAt: new Date().toISOString(),
  });
}
