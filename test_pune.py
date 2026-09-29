import geopandas as gpd
wards = gpd.read_file("public/data/wards/pune.geojson")
print("Pune wards bounds:", wards.total_bounds)
