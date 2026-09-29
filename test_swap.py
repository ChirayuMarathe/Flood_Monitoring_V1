import geopandas as gpd
from shapely.ops import transform

wards = gpd.read_file("public/data/wards/mumbai.geojson")
wards.geometry = wards.geometry.map(lambda geom: transform(lambda x, y, z=None: (y, x) if z is None else (y, x, z), geom))
print("Swapped wards bounds:", wards.total_bounds)
