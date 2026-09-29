import geopandas as gpd
wards = gpd.read_file("public/data/wards/navi_mumbai.geojson")
print("Navi Mumbai wards bounds:", wards.total_bounds)
