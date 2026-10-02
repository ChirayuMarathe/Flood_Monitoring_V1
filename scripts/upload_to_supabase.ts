/**
 * upload_to_supabase.ts
 *
 * One-time script to upload local GIS data to Supabase Storage.
 *
 * Usage:
 *   1. Set SUPABASE_SERVICE_KEY in your .env (or export it)
 *   2. Run: npx tsx scripts/upload_to_supabase.ts
 *
 * Prerequisites:
 *   - Supabase project with a PUBLIC bucket named "gis-data"
 *   - NEXT_PUBLIC_SUPABASE_URL set in .env
 *   - SUPABASE_SERVICE_KEY set in .env (service role key for uploads)
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET = process.env.NEXT_PUBLIC_GIS_BUCKET || 'gis-data';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Content-type mapping for GIS files
function getContentType(filename: string): string {
  if (filename.endsWith('.json')) return 'application/json';
  if (filename.endsWith('.geojson')) return 'application/geo+json';
  if (filename.endsWith('.glb')) return 'model/gltf-binary';
  if (filename.endsWith('.csv')) return 'text/csv';
  if (filename.endsWith('.kml')) return 'application/vnd.google-earth.kml+xml';
  return 'application/octet-stream';
}

// Stats tracking
let uploaded = 0;
let failed = 0;
let skipped = 0;
let totalBytes = 0;

/**
 * Upload a single file to Supabase Storage.
 */
async function uploadFile(localPath: string, remotePath: string, cacheSeconds = 31536000): Promise<boolean> {
  const stat = fs.statSync(localPath);
  const body = fs.readFileSync(localPath);
  const contentType = getContentType(path.basename(localPath));
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);

  process.stdout.write(`  📤 ${remotePath} (${sizeMB} MB) ... `);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(remotePath, body, {
      contentType,
      upsert: true,
      cacheControl: cacheSeconds.toString(),
    });

  if (error) {
    console.log(`❌ ${error.message}`);
    failed++;
    return false;
  }

  console.log('✅');
  uploaded++;
  totalBytes += stat.size;
  return true;
}

/**
 * Recursively upload a directory to Supabase Storage.
 */
async function uploadDir(localDir: string, remotePrefix: string, cacheSeconds = 31536000): Promise<void> {
  if (!fs.existsSync(localDir)) {
    console.log(`  ⏭️  Skipping ${localDir} (not found)`);
    skipped++;
    return;
  }

  const entries = fs.readdirSync(localDir);

  for (const entry of entries) {
    const localPath = path.join(localDir, entry);
    const stat = fs.statSync(localPath);

    if (stat.isDirectory()) {
      await uploadDir(localPath, `${remotePrefix}/${entry}`, cacheSeconds);
    } else {
      await uploadFile(localPath, `${remotePrefix}/${entry}`, cacheSeconds);
    }
  }
}

async function main() {
  console.log('🗺️  Supabase GIS Data Uploader');
  console.log(`   Bucket: ${BUCKET}`);
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log('');

  const publicDir = path.resolve(__dirname, '..', 'public');

  // ── 1. 3D Tiles (largest payload — ~151 MB) ──
  console.log('📦 Uploading 3D Tiles...');
  for (const city of ['mumbai', 'pune', 'navi_mumbai']) {
    const tileDir = path.join(publicDir, 'tiles', city);
    if (fs.existsSync(tileDir)) {
      console.log(`  🏙️  ${city}:`);
      await uploadDir(tileDir, `tiles/${city}`);
    } else {
      console.log(`  ⏭️  ${city}: no local tiles found`);
      skipped++;
    }
  }
  console.log('');

  // ── 2. Building GeoJSON (~2.4 MB) ──
  console.log('🏢 Uploading building footprint GeoJSON...');
  for (const city of ['mumbai', 'pune', 'navi_mumbai']) {
    const geojsonFile = path.join(publicDir, 'data', `${city}_buildings_with_height.geojson`);
    if (fs.existsSync(geojsonFile)) {
      await uploadFile(geojsonFile, `buildings/${city}_buildings_with_height.geojson`);
    } else {
      console.log(`  ⏭️  ${city} building GeoJSON not found`);
      skipped++;
    }
  }
  console.log('');

  // ── 3. Ward boundaries (~2.6 MB) ──
  console.log('🗺️  Uploading ward boundary GeoJSON...');
  const wardsDir = path.join(publicDir, 'data', 'wards');
  if (fs.existsSync(wardsDir)) {
    await uploadDir(wardsDir, 'wards', 86400); // 24h cache — boundaries may be updated
  }
  const gisDir = path.join(publicDir, 'data', 'gis');
  if (fs.existsSync(gisDir)) {
    await uploadDir(gisDir, 'wards', 86400);
  }
  console.log('');

  // ── 4. Climate / risk CSV data (~1.1 MB) ──
  console.log('🌧️  Uploading climate & risk data...');
  const csvFiles = ['mumbai_climate_daily_avg.csv', 'training_table_master.csv', 'ward_zonal_stats.csv'];
  for (const csvFile of csvFiles) {
    const csvPath = path.join(publicDir, 'data', csvFile);
    if (fs.existsSync(csvPath)) {
      await uploadFile(csvPath, `climate/${csvFile}`, 86400); // 24h cache for data that may update
    } else {
      console.log(`  ⏭️  ${csvFile} not found`);
      skipped++;
    }
  }
  console.log('');

  // ── Summary ──
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  console.log('━'.repeat(50));
  console.log(`✅ Upload complete!`);
  console.log(`   Uploaded: ${uploaded} files (${totalMB} MB)`);
  console.log(`   Failed:   ${failed} files`);
  console.log(`   Skipped:  ${skipped} items`);
  console.log('');
  console.log(`🌐 Public URL base:`);
  console.log(`   ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/`);
  console.log('');
  console.log(`📝 Make sure NEXT_PUBLIC_SUPABASE_URL is set in your production .env`);
}

main().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
