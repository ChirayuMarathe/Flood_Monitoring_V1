import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

let cachedData: Record<string, Record<string, any>> | null = null;

function getWardDailyData(): Record<string, Record<string, any>> {
  if (cachedData) return cachedData;
  try {
    const jsonPath = path.join(process.cwd(), 'public', 'data', 'digital_twin', 'ward_daily_timeseries.json');
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf-8');
      cachedData = JSON.parse(content);
      return cachedData!;
    }
  } catch (err) {
    console.error('[API ward-daily] Failed to load ward_daily_timeseries.json:', err);
  }
  return {};
}

/**
 * GET /api/timeline/ward-daily?date=2024-07-22&city=mumbai
 * Returns real, ward-wise measurements (rainfall_3day, rainfall_max, soil_moisture, temp, susceptibility)
 * directly from the Sentinel-1 and digital twin datasets.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const date = searchParams.get('date') || '2024-07-22';
  const city = searchParams.get('city') || 'mumbai';

  const data = getWardDailyData();
  const dateWards = data[date] || {};

  // Filter by city if requested
  const regionMap: Record<string, string> = {
    mumbai: 'bmc',
    pune: 'pune',
    navi_mumbai: 'nmmc',
  };
  const targetRegion = regionMap[city] || city.toLowerCase();

  const filtered: Record<string, any> = {};
  for (const [key, val] of Object.entries(dateWards)) {
    if (!val.region || val.region === targetRegion) {
      filtered[key] = val;
    }
  }

  return NextResponse.json({
    date,
    city,
    total_wards: Object.keys(filtered).length,
    wards: filtered,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}
