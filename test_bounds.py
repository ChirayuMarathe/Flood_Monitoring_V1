import geopandas as gpd
wards = gpd.read_file("public/data/wards/mumbai.geojson")
print("Wards bounds:", wards.total_bounds)
gpkg_path = "upload/planet_72.721,18.871_73.311,19.293-geopackage/planet_72.721,18.871_73.311,19.293.gpkg"
buildings = gpd.read_file(gpkg_path, layer='multipolygons', rows=100)
print("Buildings bounds:", buildings.total_bounds)
