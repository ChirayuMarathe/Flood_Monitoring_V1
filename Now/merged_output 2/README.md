# Mumbai Climate Dataset -- v1 (Rainfall + Soil Moisture + Land Surface Temp)

## Status
This is a PARTIAL feature set, not the final project dataset. Still to
come: DEM/elevation, land use/land cover, historical flood incident
labels, road network. This v1 covers only the climate/weather inputs.

## Files in this folder
- `mumbai_climate_daily_avg_1990_2024.csv`  <- RECOMMENDED, use this one
   One row per date, values averaged across all Mumbai grid cells.
- `mumbai_climate_grid_level_1990_2024.csv`  <- reference only
   Attempts to keep per-grid-cell detail, but IMD (0.25 deg) and
   ERA5-Land (0.1 deg) grids don't align, so most rows won't have a
   direct one-to-one lat/lon match. Use the daily-average file instead
   unless you specifically need to redo the spatial alignment yourself.

## Column reference

| Column | Meaning | Unit | Source |
|---|---|---|---|
| date | Calendar date | YYYY-MM-DD | -- |
| rainfall_mm_mumbai_avg | Daily rainfall, averaged across Mumbai grid cells | mm | IMD Pune gridded rainfall (ground-based rain gauges, 0.25 deg) |
| soil_moisture_m3m3_mumbai_avg | Volumetric surface soil moisture (0-7cm depth), averaged across Mumbai land grid cells | m3/m3 (fraction, 0-0.6 range) | ERA5-Land reanalysis (ECMWF/Copernicus), 0.1 deg |
| land_surface_temp_c_mumbai_avg | Land surface (skin) temperature, averaged across Mumbai land grid cells | degrees Celsius | ERA5-Land reanalysis (ECMWF/Copernicus), 0.1 deg |

## Important caveats -- read before using

1. **ERA5-Land is REANALYSIS (modeled), not a satellite measurement.**
   It blends real observations with a physics model. This was a
   deliberate choice: it's the only source covering both the 1990-2024
   range AND the 2005 Mumbai flood specifically. Satellite-only sources
   (SMAP soil moisture, INSAT LST) don't exist before ~2013-2015 and
   cannot be used for the 2005 event.

2. **IMD rainfall is ground-truth** (real rain gauges), considered the
   most reliable rainfall source for this region and period.

3. **Ocean grid cells were dropped** from ERA5-Land before averaging --
   land-only variables (soil moisture, skin temp) don't physically exist
   over open water, so cells that were permanently blank across the
   whole date range were excluded rather than left as fake zeros.

4. **Grid resolutions differ**: IMD is ~25km cells, ERA5-Land is ~9km
   cells. The daily-average file sidesteps this by collapsing both to a
   single Mumbai-wide daily value. If you need per-neighborhood detail
   later, the two sources will need proper spatial regridding/interpolation
   rather than a direct lat/lon join.

5. **Missing values (NaN)** may still appear on individual dates/cells
   even after cleaning -- this reflects genuine data gaps (e.g. a failed
   retrieval), not a processing error. Handle NaNs per your model's
   requirements (e.g. drop, interpolate, or flag).

## Known next steps (not yet in this file)
- DEM / elevation (SRTM 30m or Bhuvan) -- needed for spatial flood risk
- Land use/land cover -- needed for runoff/Curve Number feature
- Historical flood incident labels (INDOFLOODS) -- needed to train a
  flood/no-flood classifier on more than one event
- Road network (OpenStreetMap/OSMnx) -- impervious surface feature

## Regenerating this file
Source script: merge_climate_data.py
Inputs: mumbai_rainfall_{START}_{END}_clean.csv (IMD script output),
        mumbai_soil_moisture_lst_era5land_{START}_{END}_clean.csv
        (ERA5-Land script output)
