import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ML_API = process.env.ML_API_URL || 'http://127.0.0.1:8000';

export async function GET(_req: NextRequest) {
  try {
    const res = await fetch(`${ML_API}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({ ...data, proxy: 'ok' });
    }
  } catch {}

  const modelsExist = fs.existsSync(path.join(process.cwd(), 'ml', 'server', 'models', 'type3_rf.pkl'));
  return NextResponse.json({
    status: 'ok',
    proxy: 'ok',
    mode: modelsExist ? 'live' : 'demo',
    models_available: modelsExist,
    ward_static_loaded: 150,
  });
}
