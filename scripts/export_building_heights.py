#!/usr/bin/env python3
"""
Export building height rasters from Google Open Buildings 2.5D
via Google Earth Engine to Google Drive.

Run this script, authenticate in the browser when prompted,
then check your Google Drive "building_heights" folder in ~5-10 minutes.
"""
import ee

# Force re-authentication to pick up new project permissions
ee.Authenticate(force=True)
ee.Initialize(project='flood-prediction-505210')

# Define bounding boxes for 3 cities
cities = {
    "mumbai": [72.75, 18.90, 73.06, 19.33],
    "pune": [73.75, 18.40, 73.98, 18.65],
    "navi_mumbai": [72.95, 18.95, 73.15, 19.15],
}

collection = ee.ImageCollection("GOOGLE/Research/open-buildings-temporal/v1")

for city, bbox in cities.items():
    region = ee.Geometry.Rectangle(bbox)
    # Most recent year available (2023)
    img = collection.filterDate("2023-01-01", "2023-12-31").filterBounds(region).mosaic()
    height_band = img.select("building_height")

    task = ee.batch.Export.image.toDrive(
        image=height_band,
        description=f"{city}_building_height",
        folder="building_heights",
        region=region,
        scale=4,  # meters per pixel
        maxPixels=1e13,
    )
    task.start()
    print(f"✅ Exporting {city}... check Google Drive 'building_heights' folder in a few minutes")

print("\nAll 3 export tasks submitted! Monitor progress at: https://code.earthengine.google.com/tasks")
