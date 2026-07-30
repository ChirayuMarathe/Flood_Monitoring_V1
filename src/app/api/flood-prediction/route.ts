import { NextResponse } from 'next/server';
import { mumbaiWards, timeSeriesData, severityColors } from '@/lib/mumbai-data';

function computeSeverity(wardId: string, timeIndex: number): number {
  const ward = mumbaiWards.find((w) => w.id === wardId);
  if (!ward) return 0;
  const td = timeSeriesData[timeIndex];
  const rainFactor = Math.max(0, (td.rainfall_3day_sum - 80) / 220);
  const soilFactor = Math.max(0, (td.soil_moisture - 0.25) / 0.55);
  const elevFactor = Math.max(0, (12 - ward.elevation) / 12);
  const twiFactor = Math.max(0, (ward.twi - 6) / 5);
  const typeFactor = ward.wardType === 'coastal' ? 0.15 : ward.wardType === 'lowland' ? 0.1 : 0;
  const score = rainFactor * 0.35 + soilFactor * 0.25 + elevFactor * 0.2 + twiFactor * 0.15 + typeFactor;
  if (score > 0.7) return 3;
  if (score > 0.45) return 2;
  if (score > 0.2) return 1;
  return 0;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wardId = searchParams.get('wardId');
  const timeIndex = parseInt(searchParams.get('timeIndex') || '14', 10);

  if (wardId) {
    const severity = computeSeverity(wardId, timeIndex);
    const ward = mumbaiWards.find((w) => w.id === wardId);
    return NextResponse.json({
      wardId,
      wardName: ward?.name,
      severity,
      severityLabel: severityColors[severity].label,
      waterHeight: severity === 3 ? 2.1 : severity === 2 ? 1.2 : severity === 1 ? 0.4 : 0,
      confidence: 0.87 + Math.random() * 0.1,
    });
  }

  const allSeverities = mumbaiWards.map((ward) => ({
    wardId: ward.id,
    wardName: ward.name,
    severity: computeSeverity(ward.id, timeIndex),
  }));

  return NextResponse.json({
    timeIndex,
    date: timeSeriesData[timeIndex].date,
    data: allSeverities,
  });
}
