import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { normalizeWardGeoJSON } from '../src/lib/gis/wardNormalizer';

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.NEXT_PUBLIC_GIS_BUCKET || 'gis-data';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing credentials in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('🔄 Pre-normalizing ward GeoJSON files and uploading to Supabase...');
  const cities = ['mumbai', 'pune', 'navi_mumbai'];

  for (const city of cities) {
    const rawPath = path.resolve(__dirname, '..', 'public', 'data', 'wards', `${city}.geojson`);
    if (!fs.existsSync(rawPath)) {
      console.warn(`File not found: ${rawPath}`);
      continue;
    }

    const rawData = JSON.parse(fs.readFileSync(rawPath, 'utf8'));
    const normalized = normalizeWardGeoJSON(rawData, city, { simplify: true });

    const jsonString = JSON.stringify(normalized.geojson);
    const buffer = Buffer.from(jsonString, 'utf8');
    const remotePath = `wards/${city}.geojson`;
    const origSize = (fs.statSync(rawPath).size / 1024).toFixed(1);
    const newSize = (buffer.length / 1024).toFixed(1);

    console.log(`📤 Uploading ${remotePath}: ${origSize} KB -> ${newSize} KB (${normalized.stats.featureCount} wards, coordsFixed: ${normalized.stats.coordsFixed})...`);

    const { error } = await supabase.storage.from(BUCKET).upload(remotePath, buffer, {
      contentType: 'application/geo+json',
      upsert: true,
      cacheControl: '86400',
    });

    if (error) {
      console.error(`❌ Upload failed for ${remotePath}:`, error.message);
    } else {
      console.log(`✅ ${remotePath} uploaded successfully!`);
    }
  }
  console.log('🎉 Done uploading normalized ward boundaries!');
}

run().catch(console.error);
