import os

scripts = [
    "scripts/process_building_heights.py",
    "scripts/process_pune_heights.py",
    "scripts/process_navi_mumbai_heights.py"
]

for s in scripts:
    with open(s, "r") as f:
        content = f.read()
    
    # Add import if missing
    if "from shapely.ops import transform" not in content:
        content = content.replace("import geopandas as gpd", "import geopandas as gpd\nfrom shapely.ops import transform")
    
    # Add swap logic before the sjoin
    if "wards = wards.to_crs(buildings.crs)" in content:
        swap_logic = """wards = wards.to_crs(buildings.crs)
    wards.geometry = wards.geometry.map(lambda geom: transform(lambda *args: (args[1], args[0]) if len(args) == 2 else (args[1], args[0], args[2]), geom))"""
        content = content.replace("wards = wards.to_crs(buildings.crs)", swap_logic)
        
    with open(s, "w") as f:
        f.write(content)
print("Scripts fixed.")
